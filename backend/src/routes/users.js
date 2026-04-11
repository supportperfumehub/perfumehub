import express from 'express';
import { supabase } from '../config/supabaseClient.js';

const router = express.Router();

// User Profile fetch to get fresh roles/shop details
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*, shops:shop_id(*)')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        
        // Remove password before sending
        if (data && data.password) delete data.password;
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
