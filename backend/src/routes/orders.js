import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get all orders
router.get('/', authenticateUser, async (req, res) => {
    try {
        let query = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (req.query.shop_id) {
            query = query.contains('shop_ids', [parseInt(req.query.shop_id)]);
        }

        // Enforce Regional Scoping for Regional Admins
        if (req.user && req.user.role === 'regional_admin') {
            const { data: shops } = await supabase
                .from('shops')
                .select('id')
                .in('region_id', req.user.assignedRegionIds);
            
            const shopIds = shops ? shops.map(s => s.id) : [];
            if (shopIds.length > 0) {
                // Check if the order contains at least one shop from the admin's regions
                query = query.overlaps('shop_ids', shopIds);
            } else {
                return res.json([]);
            }
        }

        const { data, error } = await withTimeout(query);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching orders:', error);
        if (error.message === 'Database query timed out') {
            return res.status(504).json({ error: 'Database timeout' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create order
router.post('/', async (req, res) => {
    const { customerName, email, phone, total, shippingAddress, paymentMethod, items } = req.body;
    
    const shopIdsSet = new Set();
    if (items && Array.isArray(items)) {
        items.forEach(item => {
            const shopId = item.shop_id || (item.product && item.product.shop_id);
            if (shopId) shopIdsSet.add(shopId);
        });
    }
    const shop_ids = Array.from(shopIdsSet);

    try {
        const { data, error } = await supabase
            .from('orders')
            .insert([{
                customer_name: customerName,
                email,
                phone,
                total,
                shipping_address: shippingAddress,
                payment_method: paymentMethod,
                items,
                shop_ids: shop_ids
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ id: data[0].id, message: 'Order created successfully' });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update order status
router.put('/:id/status', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin', 'vendor']), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const admin = req.user;

    try {
        // Find the order to check shop_ids
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('shop_ids')
            .eq('id', id)
            .single();
        
        if (fetchError || !order) return res.status(404).json({ error: 'Order not found' });

        // Scoping check for regional admins
        if (admin && admin.role === 'regional_admin') {
            const { data: adminShops } = await supabase
                .from('shops')
                .select('id')
                .in('region_id', admin.assignedRegionIds);
            
            const adminShopIds = adminShops ? adminShops.map(s => s.id) : [];
            const hasAccess = order.shop_ids.some(sid => adminShopIds.includes(sid));

            if (!hasAccess) {
                return res.status(403).json({ error: 'Forbidden: You do not have access to this order.' });
            }
        }

        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ message: 'Order status updated', order: data[0] });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
