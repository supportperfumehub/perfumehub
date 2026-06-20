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
        const { name, price, interval, description, features } = req.body;
        
        // Auto-generate slug from name if not provided
        const slug = req.body.slug || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const { data, error } = await supabase
            .from('subscription_plans')
            .insert([{ 
                name, 
                slug, 
                description, 
                price: parseFloat(price), 
                interval: interval || 'month', 
                features: features || [] 
            }])
            .select();
        
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
});

// Update a subscription plan
router.put('/plans/:id', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res, next) => {
    const { id } = req.params;
    const { name, price, interval, description, features, is_active } = req.body;
    try {
        const updates = {};
        if (name !== undefined) {
            updates.name = name;
            updates.slug = req.body.slug || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        if (price !== undefined) updates.price = parseFloat(price);
        if (interval !== undefined) updates.interval = interval;
        if (description !== undefined) updates.description = description;
        if (features !== undefined) updates.features = features;
        if (is_active !== undefined) updates.is_active = is_active;

        const { data, error } = await supabase
            .from('subscription_plans')
            .update(updates)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        if (data && data.length === 0) return res.status(404).json({ error: 'Plan not found' });
        res.json(data[0]);
    } catch (err) {
        next(err);
    }
});

// Delete a subscription plan
router.delete('/plans/:id', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res, next) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('subscription_plans')
            .delete()
            .eq('id', id)
            .select();
        
        if (error) throw error;
        if (data && data.length === 0) return res.status(404).json({ error: 'Plan not found' });
        res.json({ message: 'Plan deleted successfully' });
    } catch (err) {
        next(err);
    }
});

export default router;
