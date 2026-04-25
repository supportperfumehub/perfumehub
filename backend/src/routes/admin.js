import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Middleware to ensure only Super Admins access these meta-controls
const superAdminOnly = [authenticateUser, verifyRole(['super_admin', 'admin'])];

/**
 * ALGORITHM CONFIGURATION
 */

// GET /api/admin/algorithm-config
router.get('/algorithm-config', superAdminOnly, async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('algorithm_configs')
            .select('*')
            .eq('is_active', true)
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// PUT /api/admin/algorithm-config/:id
router.put('/algorithm-config/:id', superAdminOnly, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('algorithm_configs')
            .update(req.body)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        next(err);
    }
});

/**
 * DISCOVERY & SHOP BOOSTS
 */

// GET /api/admin/shops (with discovery fields)
router.get('/shops', superAdminOnly, async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('shops')
            .select('id, name, is_featured, manual_boost_multiplier, rating_avg, review_count, status')
            .order('name');
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// PATCH /api/admin/shops/:id/feature
router.patch('/shops/:id/feature', superAdminOnly, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { is_featured } = req.body;
        const { data, error } = await supabase
            .from('shops')
            .update({ is_featured })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// PATCH /api/admin/shops/:id/boost
router.patch('/shops/:id/boost', superAdminOnly, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { manual_boost_multiplier } = req.body;
        const { data, error } = await supabase
            .from('shops')
            .update({ manual_boost_multiplier })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        next(err);
    }
});

/**
 * DISCOVER CAMPAIGNS
 */

// GET /api/admin/discover-campaigns
router.get('/discover-campaigns', superAdminOnly, async (req, res, next) => {
    try {
        // Joining with shops to get names
        const { data, error } = await supabase
            .from('discover_campaigns')
            .select('*, shops(name)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Flatten the shop name for easier frontend consumption
        const flattened = data.map(c => ({
            ...c,
            shop_name: c.shops?.name || 'Unknown Shop'
        }));
        
        res.json(flattened);
    } catch (err) {
        next(err);
    }
});

export default router;
