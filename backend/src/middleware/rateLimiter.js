import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for sensitive authentication endpoints
 * Blocks excessive login/register attempts
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per window
    message: {
        success: false,
        error: 'Too many authentication attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Brute-force protection for login specifically
 * More restrictive than the general auth limiter
 */
export const loginRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 attempts
    message: {
        success: false,
        error: 'Too many login attempts. Please try again after 5 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General rate limiter for all API routes (600 req/min)
 */
export const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 600, // Limit each IP to 600 requests per `window`
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true, 
    legacyHeaders: false, 
});

/**
 * Stricter rate limiter for placing orders (Prevent bot inventory hoarding)
 */
export const orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 orders per hour
    message: { error: 'Order placement limit exceeded. Please contact support.' },
    standardHeaders: true,
    legacyHeaders: false,
});
