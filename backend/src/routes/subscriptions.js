import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * PUBLIC: Get Subscription Plans
 */
router.get('/plans', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true)
            .order('price');
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        next(err);
    }
});

/**
 * USER: Get Current Subscription
 */
router.get('/my-subscription', authenticateUser, async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*, plan:subscription_plans(*)')
            .eq('user_id', req.user.id)
            .eq('status', 'active')
            .maybeSingle();
        
        if (error) throw error;
        res.json(data || { message: 'No active subscription' });
    } catch (err) {
        next(err);
    }
});

/**
 * ADMIN: Manage Plans
 */
router.post('/plans', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('subscription_plans')
            .insert([req.body])
            .select();
        
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
});

export default router;
