import { validationResult, matchedData } from 'express-validator';

/**
 * Generic middleware to check for validation errors from express-validator.
 * Must be used AFTER the express-validator rules in the route definition.
 */
export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    
    // Replace req.body with ONLY the validated, matched data
    // This strips out any unexpected or malicious extra fields sent by the client
    req.body = matchedData(req, { locations: ['body'] });
    req.query = matchedData(req, { locations: ['query'] });
    req.params = matchedData(req, { locations: ['params'] });
    
    next();
};
