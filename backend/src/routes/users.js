import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    try {
        const { role } = req.query;
        let query = supabase.from('customers').select('id, name, email, role');
        
        if (role) {
            query = query.eq('role', role);
        }
        
        const { data, error } = await query.order('name');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

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
