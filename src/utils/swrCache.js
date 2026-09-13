import { useState, useEffect, useRef, useCallback } from 'react';

// In-memory cache store
const memoryCache = new Map();
const inFlightRequests = new Map();

/**
 * Get cached item from memory or localStorage
 */
export function getCacheItem(key) {
    if (memoryCache.has(key)) {
        return memoryCache.get(key);
    }
    if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem(`swr_${key}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                memoryCache.set(key, parsed);
                return parsed;
            }
        } catch (e) {}
    }
    return undefined;
}

/**
 * Set cached item into memory and localStorage
 */
export function setCacheItem(key, data) {
    memoryCache.set(key, data);
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(`swr_${key}`, JSON.stringify(data));
        } catch (e) {}
    }
}

/**
 * Stale-While-Revalidate Hook
 * Returns cached data synchronously on mount, then triggers revalidation in the background.
 */
export function useSWRData(key, fetcher, options = {}) {
    const {
        revalidateOnMount = true,
        dedupingInterval = 5000,
        fallbackData = null,
        onSuccess,
        onError
    } = options;

    const initialData = getCacheItem(key) ?? fallbackData;
    const [data, setData] = useState(initialData);
    const [error, setError] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const lastFetchTime = useRef(0);

    const revalidate = useCallback(async () => {
        if (!key || !fetcher) return;

        const now = Date.now();
        if (now - lastFetchTime.current < dedupingInterval && memoryCache.has(key)) {
            return;
        }

        // Deduplicate simultaneous requests
        if (inFlightRequests.has(key)) {
            try {
                const res = await inFlightRequests.get(key);
                setData(res);
                return res;
            } catch (err) {
                setError(err);
                return;
            }
        }

        setIsValidating(true);
        lastFetchTime.current = now;

        const requestPromise = (async () => {
            try {
                const fresh = await fetcher();
                setCacheItem(key, fresh);
                setData(fresh);
                setError(null);
                if (onSuccess) onSuccess(fresh);
                return fresh;
            } catch (err) {
                setError(err);
                if (onError) onError(err);
                throw err;
            } finally {
                setIsValidating(false);
                inFlightRequests.delete(key);
            }
        })();

        inFlightRequests.set(key, requestPromise);
        return requestPromise;
    }, [key, fetcher, dedupingInterval, onSuccess, onError]);

    useEffect(() => {
        if (revalidateOnMount && key) {
            revalidate();
        }
    }, [key, revalidateOnMount, revalidate]);

    const mutate = useCallback((newData, shouldRevalidate = false) => {
        setCacheItem(key, newData);
        setData(newData);
        if (shouldRevalidate) {
            revalidate();
        }
    }, [key, revalidate]);

    return {
        data,
        error,
        isValidating,
        mutate,
        revalidate
    };
}

export default useSWRData;
