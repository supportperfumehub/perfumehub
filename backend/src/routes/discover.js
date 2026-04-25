import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get active discover campaigns (Public)
router.get('/', async (req, res) => {
    try {
        const { data, error } = await withTimeout(supabase
            .from('discover_campaigns')
            .select(`
                *,
                shop:shops (
                    id, name, logo_url, trust_score, tier, geo_location
                )
            `)
            .eq('active', true)
            .gte('end_date', new Date().toISOString())
            .lte('start_date', new Date().toISOString())
            .order('created_at', { ascending: false }));

        if (error) throw error;
        res.json(data);
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
