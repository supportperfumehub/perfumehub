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

// POST /api/admin/discover-campaigns
router.post('/discover-campaigns', superAdminOnly, async (req, res, next) => {
    const { shop_id, placement_slot, start_date, end_date } = req.body;

    if (!shop_id || !placement_slot || !end_date) {
        return res.status(400).json({ error: 'Missing required campaign parameters.' });
    }

    try {
        const { data, error } = await supabase
            .from('discover_campaigns')
            .insert([{
                shop_id,
                placement_slot,
                start_date: start_date || new Date().toISOString(),
                end_date,
                active: true
            }])
            .select();

        if (error) throw error;
        
        // Also automatically upgrade the shop's tier to 'premium' for the duration
        await supabase.from('shops').update({ tier: 'premium' }).eq('id', shop_id);

        res.status(201).json({ id: data[0].id, message: 'Discover campaign created successfully', campaign: data[0] });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/admin/discover-campaigns/:id
router.delete('/discover-campaigns/:id', superAdminOnly, async (req, res, next) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('discover_campaigns')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Discover campaign deleted successfully' });
    } catch (err) {
        next(err);
    }
});

export default router;
