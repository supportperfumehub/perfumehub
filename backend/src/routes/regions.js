import express from 'express';
import { supabase } from '../config/supabaseClient.js';

const router = express.Router();

// Get all regions
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase.from('regions').select('*').order('name');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a region
router.post('/', async (req, res) => {
    const { name, code, currencyCode } = req.body;
    try {
        const { data, error } = await supabase
            .from('regions')
            .insert([{ name, code, currency_code: currencyCode }])
            .select();
        if (error) throw error;
        res.status(201).json({ region: data[0], message: 'Region created successfully' });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Region already exists' });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Assign Admin to a Region
router.post('/assign-admin', async (req, res) => {
    const { admin_id, region_id, assigned_by } = req.body;
    try {
        const { data, error } = await supabase
            .from('admin_region_mapping')
            .insert([{ admin_id, region_id, assigned_by }])
            .select();
        if (error) throw error;

        // Ensure user is promoted to regional_admin
        await supabase.from('customers').update({ role: 'regional_admin' }).eq('id', admin_id);
        
        res.status(201).json({ mapping: data[0], message: 'Admin assigned to region' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
