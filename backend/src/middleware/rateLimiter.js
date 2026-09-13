import rateLimit from 'express-rate-limit';

/**
 * Distributed Store for express-rate-limit
 * Prioritizes Upstash Redis REST API (zero TCP overhead for serverless),
 * with resilient in-memory fallback to avoid request failures.
 */
class DistributedStore {
    constructor(prefix = 'rl', windowMs = 60000) {
        this.prefix = prefix;
        this.windowMs = windowMs;
        this.upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
        this.upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
        this.memoryStore = new Map();
        this.cleanupInterval = null;

        // Periodic cleanup for local in-memory fallback cache
        if (typeof setInterval !== 'undefined') {
            this.cleanupInterval = setInterval(() => this.pruneMemory(), 60000);
            if (this.cleanupInterval.unref) this.cleanupInterval.unref();
        }
    }

    init(options) {
        if (options && options.windowMs) {
            this.windowMs = options.windowMs;
        }
    }

    pruneMemory() {
        const now = Date.now();
        for (const [k, v] of this.memoryStore.entries()) {
            if (v.resetTime && v.resetTime <= now) {
                this.memoryStore.delete(k);
            }
        }
    }

    async increment(key) {
        const fullKey = `${this.prefix}:${key}`;
        const now = Date.now();

        // 1. Try Upstash Redis REST if configured
        if (this.upstashUrl && this.upstashToken) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1500);

                const response = await fetch(`${this.upstashUrl}/pipeline`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.upstashToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify([
                        ['INCR', fullKey],
                        ['PTTL', fullKey]
                    ]),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const results = await response.json();
                    const totalHits = results[0]?.result || 1;
                    let pttl = results[1]?.result;

                    // If TTL is not set (-1), apply the window expiration
                    if (pttl === -1 || pttl === undefined) {
                        fetch(`${this.upstashUrl}/pexpire/${fullKey}/${this.windowMs}`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${this.upstashToken}` }
                        }).catch(() => {});
                        pttl = this.windowMs;
                    }

                    const resetTime = new Date(now + Math.max(0, pttl));
                    return { totalHits, resetTime };
                }
            } catch (err) {
                console.warn(`[RateLimiter] Upstash Redis call failed, falling back to local memory: ${err.message}`);
            }
        }

        // 2. Local In-Memory Fallback
        const entry = this.memoryStore.get(fullKey);
        if (!entry || entry.resetTime <= now) {
            const resetTime = new Date(now + this.windowMs);
            this.memoryStore.set(fullKey, { totalHits: 1, resetTime: resetTime.getTime() });
            return { totalHits: 1, resetTime };
        }

        entry.totalHits += 1;
        return { totalHits: entry.totalHits, resetTime: new Date(entry.resetTime) };
    }

    async decrement(key) {
        const fullKey = `${this.prefix}:${key}`;
        if (this.upstashUrl && this.upstashToken) {
            fetch(`${this.upstashUrl}/decr/${fullKey}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${this.upstashToken}` }
            }).catch(() => {});
        }

        const entry = this.memoryStore.get(fullKey);
        if (entry && entry.totalHits > 0) {
            entry.totalHits -= 1;
        }
    }

    async resetKey(key) {
        const fullKey = `${this.prefix}:${key}`;
        if (this.upstashUrl && this.upstashToken) {
            fetch(`${this.upstashUrl}/del/${fullKey}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${this.upstashToken}` }
            }).catch(() => {});
        }
        this.memoryStore.delete(fullKey);
    }
}

/**
 * Factory to create rate limiters with distributed store
 */
const createLimiter = ({ prefix, windowMs, max, message }) => {
    return rateLimit({
        windowMs,
        max,
        message,
        standardHeaders: true,
        legacyHeaders: false,
        store: new DistributedStore(prefix, windowMs)
    });
};

/**
 * Rate limiter for sensitive authentication endpoints
 * Blocks excessive login/register attempts
 */
export const authRateLimiter = createLimiter({
    prefix: 'rl:auth',
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per window
    message: {
        success: false,
        error: 'Too many authentication attempts. Please try again after 15 minutes.'
    }
});

/**
 * Brute-force protection for login specifically
 * More restrictive than the general auth limiter
 */
export const loginRateLimiter = createLimiter({
    prefix: 'rl:login',
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 attempts
    message: {
        success: false,
        error: 'Too many login attempts. Please try again after 5 minutes.'
    }
});

/**
 * General rate limiter for all API routes (600 req/min)
 */
export const apiLimiter = createLimiter({
    prefix: 'rl:api',
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 600, // Limit each IP to 600 requests per window
    message: { error: 'Too many requests from this IP, please try again later.' }
});

/**
 * Stricter rate limiter for placing orders (Prevent bot inventory hoarding)
 */
export const orderLimiter = createLimiter({
    prefix: 'rl:order',
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 orders per hour
    message: { error: 'Order placement limit exceeded. Please contact support.' }
});

