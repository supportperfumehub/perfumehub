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

const adminOrRegionalAdmin = [authenticateUser, verifyRole(['super_admin', 'admin', 'regional_admin'])];

/**
 * DISCOVER CAMPAIGNS
 */

// GET /api/admin/discover-campaigns
router.get('/discover-campaigns', adminOrRegionalAdmin, async (req, res, next) => {
    try {
        const regionId = req.query.region_id ? parseInt(req.query.region_id) : (req.user?.role === 'regional_admin' ? req.user.region_id : null);

        // Joining with shops and products to get names and shop region
        const { data, error } = await supabase
            .from('discover_campaigns')
            .select('*, shops(id, name, region_id), products(name)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Flatten the shop and product names for easier frontend consumption
        let flattened = (data || []).map(c => ({
            ...c,
            shop_name: c.shops?.name || 'Unknown Shop',
            shop_region_id: c.shops?.region_id || null,
            product_name: c.products?.name || null
        }));

        if (regionId) {
            flattened = flattened.filter(c => Number(c.shop_region_id) === Number(regionId) || Number(c.region_id) === Number(regionId));
        }
        
        res.json(flattened);
    } catch (err) {
        next(err);
    }
});

const normalizeStartDate = (d) => {
    if (!d) return new Date().toISOString();
    if (typeof d === 'string' && d.length === 10) return `${d}T00:00:00.000Z`;
    return d;
};

const normalizeEndDate = (d) => {
    if (!d) return new Date().toISOString();
    if (typeof d === 'string' && d.length === 10) return `${d}T23:59:59.999Z`;
    return d;
};

// POST /api/admin/discover-campaigns
router.post('/discover-campaigns', adminOrRegionalAdmin, async (req, res, next) => {
    const { shop_id, placement_slot, start_date, end_date, product_id } = req.body;

    if (!shop_id || !placement_slot || !end_date) {
        return res.status(400).json({ error: 'Missing required campaign parameters.' });
    }

    try {
        const { data, error } = await supabase
            .from('discover_campaigns')
            .insert([{
                shop_id,
                product_id: product_id ? Number(product_id) : null,
                placement_slot,
                start_date: normalizeStartDate(start_date),
                end_date: normalizeEndDate(end_date),
                active: true
            }])
            .select('*, shops(id, name, region_id), products(name)');

        if (error) throw error;
        
        // Also automatically upgrade the shop's tier to 'premium' for the duration
        await supabase.from('shops').update({ tier: 'premium' }).eq('id', shop_id);

        const campaign = {
            ...data[0],
            shop_name: data[0].shops?.name || 'Unknown Shop',
            shop_region_id: data[0].shops?.region_id || null,
            product_name: data[0].products?.name || null
        };

        res.status(201).json({ id: campaign.id, message: 'Discover campaign created successfully', campaign });
    } catch (err) {
        next(err);
    }
});

// PUT /api/admin/discover-campaigns/:id
router.put('/discover-campaigns/:id', adminOrRegionalAdmin, async (req, res, next) => {
    const { id } = req.params;
    const { shop_id, placement_slot, start_date, end_date, product_id, active } = req.body;

    try {
        const updateData = {};
        if (shop_id !== undefined) updateData.shop_id = shop_id;
        if (placement_slot !== undefined) updateData.placement_slot = placement_slot;
        if (start_date !== undefined) updateData.start_date = normalizeStartDate(start_date);
        if (end_date !== undefined) updateData.end_date = normalizeEndDate(end_date);
        if (product_id !== undefined) updateData.product_id = product_id ? Number(product_id) : null;
        if (active !== undefined) updateData.active = Boolean(active);

        const { data, error } = await supabase
            .from('discover_campaigns')
            .update(updateData)
            .eq('id', id)
            .select('*, shops(id, name, region_id), products(name)');

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Campaign not found.' });
        }

        const campaign = {
            ...data[0],
            shop_name: data[0].shops?.name || 'Unknown Shop',
            shop_region_id: data[0].shops?.region_id || null,
            product_name: data[0].products?.name || null
        };

        res.json({ message: 'Discover campaign updated successfully', campaign });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/admin/discover-campaigns/clear-all
router.delete('/discover-campaigns/clear-all', adminOrRegionalAdmin, async (req, res, next) => {
    try {
        const { error } = await supabase
            .from('discover_campaigns')
            .delete()
            .filter('id', 'not.is', null);

        if (error) throw error;
        res.json({ message: 'All discover campaigns deleted successfully' });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/admin/discover-campaigns/:id
router.delete('/discover-campaigns/:id', adminOrRegionalAdmin, async (req, res, next) => {
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
