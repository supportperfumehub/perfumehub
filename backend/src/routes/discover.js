import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get active discover campaigns (Public)
router.get('/', async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    try {
        const nowIso = new Date().toISOString();
        const todayStartIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

        const { data: campaigns, error } = await withTimeout(supabase
            .from('discover_campaigns')
            .select(`
                *,
                shop:shops (
                    id, name, logo_url, trust_score, tier, geo_location
                ),
                product:products (
                    *
                )
            `)
            .eq('active', true)
            .gte('end_date', todayStartIso)
            .lte('start_date', nowIso)
            .order('created_at', { ascending: false }));

        if (error) throw error;
        if (!campaigns || campaigns.length === 0) {
            return res.json([]);
        }

        const slides = [];
        for (const c of campaigns) {
            if (c.product_id && c.product) {
                // Product-specific campaign slide
                slides.push({
                    id: `product-${c.product.id}-${c.id}`,
                    campaign_id: c.id,
                    product_id: c.product.id,
                    type: 'product',
                    placement_slot: c.placement_slot,
                    product: c.product,
                    shop: c.shop
                });
            } else if (c.shop_id && c.shop) {
                // Shop campaign banner slide
                slides.push({
                    id: `shop-${c.shop.id}-${c.id}`,
                    campaign_id: c.id,
                    shop_id: c.shop.id,
                    type: 'shop',
                    placement_slot: c.placement_slot,
                    shop: c.shop
                });
            }
        }

        res.json(slides);
    } catch (error) {
        console.error('Error fetching discover campaigns:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new discover campaign (Super Admin Only)
router.post('/', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
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
    } catch (error) {
        console.error('Error creating discover campaign:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update or Disable a campaign
router.put('/:id', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { active, placement_slot, end_date } = req.body;

    try {
        const { data, error } = await supabase
            .from('discover_campaigns')
            .update({
                active: active !== undefined ? active : undefined,
                placement_slot: placement_slot !== undefined ? placement_slot : undefined,
                end_date: end_date !== undefined ? end_date : undefined
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ message: 'Campaign updated successfully', campaign: data[0] });
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
