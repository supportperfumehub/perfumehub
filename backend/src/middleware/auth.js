import { supabase } from '../config/supabaseClient.js';

/**
 * Middleware to authenticate requests based on a pseudo-auth approach 
 * (since full JWT was not observed in the base codebase).
 * Expects 'x-user-id' header or 'userId' in the request body.
 */
export const authenticateUser = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;
        
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: No user ID provided' });
        }

        const { data: user, error } = await supabase.from('customers').select('*').eq('id', userId).single();

        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid user' });
        }

        req.user = user; // Attach hydrated user to request
        next();
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error in authentication' });
    }
};

/**
 * Middleware for Role-Based Access Control
 * @param {string[]} allowedRoles Array of roles (e.g. ['super_admin', 'regional_admin', 'vendor'])
 */
export const verifyRole = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (allowedRoles.includes(user.role)) {
            // Further granular checks can be done inside actual route (like region mappings)
            return next();
        }

        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    };
};
