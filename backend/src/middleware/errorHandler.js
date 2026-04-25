/**
 * Centralized error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    if (err.stack) console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: message,
        details: process.env.NODE_ENV === 'development' ? err.details || err.stack : undefined
    });
};

/**
 * Custom Error Class for operational errors
 */
export class AppError extends Error {
    constructor(message, statusCode, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}
