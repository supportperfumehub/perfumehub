export const withTimeout = (promise, ms = 15000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timed out')), ms)
        )
    ]);
};
