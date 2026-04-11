import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';

const router = express.Router();

// Get all orders
router.get('/', async (req, res) => {
    try {
        let query = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (req.query.shop_id) {
            query = query.contains('shop_ids', [req.query.shop_id]);
        }

        const { data, error } = await withTimeout(query);

        if (error) throw error;
        res.json(data);
    } catch (error) {
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
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
