import { verifyAccessToken, extractTokenFromHeader } from '../utils/tokenUtils.js';
import { supabase } from '../config/supabaseClient.js';
import { getAvatarUrl } from '../services/avatarService.js';

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticateUser = async (req, res, next) => {
    try {
        const token = extractTokenFromHeader(req);
        
        if (!token) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const decoded = verifyAccessToken(token);
        
        if (!decoded) {
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }

        // Fetch user from DB to ensure they still exist and check for account lock
        const { data: user, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', decoded.id)
            .single();

        if (error || !user) {
            return res.status(401).json({ success: false, error: 'User no longer exists' });
        }

        // Check for account lockout
        if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
            return res.status(403).json({ 
                success: false, 
                error: 'Account is temporarily locked. Please try again later.' 
            });
        }

        // Attach user to request
        req.user = user;
        if (!req.user.avatar_url) {
            req.user.avatar_url = await getAvatarUrl(user.id);
        }

        // Single Store Scoping (PerfumeHub Master Platform)
        req.user.assignedRegionIds = [];
        req.user.ownedShopIds = [];
        req.user.shop_id = user.shop_id || null;

        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err);
        res.status(500).json({ success: false, error: 'Authentication processing error' });
    }
};

/**
 * Middleware for Role-Based Access Control
 * @param {string[]} allowedRoles Array of roles
 */
export const verifyRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        if (allowedRoles.includes(req.user.role)) {
            return next();
        }

        // Special case: Regional Admins might be allowed if scoped (checked in controller)
        // But here we check base role permission
        return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
    };
};
