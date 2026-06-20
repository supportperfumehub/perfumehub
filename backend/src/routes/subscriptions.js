import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * PUBLIC: Get Subscription Plans
 */
router.get('/plans', authenticateUser, verifyRole(['vendor', 'regional_admin', 'admin', 'super_admin']), async (req, res, next) => {
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
router.get('/my-subscription', authenticateUser, verifyRole(['vendor', 'regional_admin', 'admin', 'super_admin']), async (req, res, next) => {
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

/**
 * VENDOR/ADMIN: Subscribe to a Plan
 */
router.post('/subscribe', authenticateUser, verifyRole(['vendor', 'regional_admin', 'admin', 'super_admin']), async (req, res, next) => {
    try {
        const { planId } = req.body;
        if (!planId) {
            return res.status(400).json({ error: 'Plan ID is required' });
        }

        // Check if plan exists
        const { data: plan, error: planError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .maybeSingle();

        if (planError || !plan) {
            return res.status(404).json({ error: 'Subscription plan not found' });
        }

        // Check if user already has an active subscription
        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('status', 'active')
            .maybeSingle();

        if (existingSub) {
            return res.status(400).json({ error: 'User already has an active subscription' });
        }

        const now = new Date();
        const periodEnd = new Date();
        if (plan.interval === 'year') {
            periodEnd.setFullYear(now.getFullYear() + 1);
        } else {
            periodEnd.setMonth(now.getMonth() + 1);
        }

        const { data, error } = await supabase
            .from('subscriptions')
            .insert([{
                user_id: req.user.id,
                plan_id: planId,
                status: 'active',
                stripe_subscription_id: 'mock_sub_' + Math.random().toString(36).substring(2, 9),
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString()
            }])
            .select('*, plan:subscription_plans(*)');

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
});

/**
 * VENDOR/ADMIN: Cancel Subscription
 */
router.post('/cancel', authenticateUser, verifyRole(['vendor', 'regional_admin', 'admin', 'super_admin']), async (req, res, next) => {
    try {
        const { data: activeSub, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('status', 'active')
            .maybeSingle();

        if (subError || !activeSub) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const { data, error } = await supabase
            .from('subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('id', activeSub.id)
            .select();

        if (error) throw error;
        res.json({ message: 'Subscription canceled successfully', subscription: data[0] });
    } catch (err) {
        next(err);
    }
});

export default router;
