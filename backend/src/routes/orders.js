import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';
import { orderLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validate.js';
import { body } from 'express-validator';

const router = express.Router();

// Get all orders
router.get('/', authenticateUser, async (req, res) => {
    try {
        let query = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (req.query.shop_id) {
            query = query.contains('shop_ids', [req.query.shop_id]);
        }

        // Apply Regional Admin constraints or Vendor constraints
        if (req.user) {
            if (req.user.role === 'regional_admin') {
                const { data: shops } = await supabase
                    .from('shops')
                    .select('id')
                    .in('region_id', req.user.assignedRegionIds);
                
                const shopIds = shops ? shops.map(s => s.id) : [];
                if (shopIds.length > 0) {
                    query = query.overlaps('shop_ids', shopIds);
                } else {
                    return res.json([]);
                }
            } else if (req.user.role === 'vendor') {
                if (!req.user.shop_id) return res.status(403).json({ error: 'Forbidden: No shop assigned' });
                // NEW: Vendors fetch their specific sub-orders for multi-vendor fulfillment
                const { data: subOrders, error: subError } = await supabase
                    .from('sub_orders')
                    .select('*, orders(*)')
                    .eq('shop_id', req.user.shop_id)
                    .order('created_at', { ascending: false });
                
                if (subError) throw subError;
                return res.json(subOrders.map(so => ({
                    ...so.orders,
                    id: so.parent_order_id,
                    sub_order_id: so.id,
                    status: so.status, // Use the sub-order specific status
                    subtotal: so.subtotal,
                    total: so.total_amount
                })));
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
router.post('/', 
    orderLimiter,
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('total').isFloat({ min: 0.01 }).withMessage('Total must be greater than zero'),
        body('items').isArray({ min: 1 }).withMessage('Order must contain items'),
        validateRequest
    ],
    async (req, res) => {
    const { 
        customerName, email, phone, total, shippingAddress, 
        paymentMethod, items, fulfillment_type = 'delivery', pickup_shop_id 
    } = req.body;
    
    try {
        // --- 1. Fulfillment Validation ---
        if (fulfillment_type === 'pickup' && !pickup_shop_id) {
            return res.status(400).json({ error: 'pickup_shop_id is required for reserve in shop orders.' });
        }

        const shopIdsSet = new Set();
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const shopId = item.shop_id || (item.product && item.product.shop_id);
                if (!shopId) return res.status(400).json({ error: 'All items must specify a shop_id to identify vendor inventory.' });
                
                shopIdsSet.add(shopId);

                // For pickup, we strictly enforce it against the single pickup shop
                if (fulfillment_type === 'pickup' && shopId !== pickup_shop_id) {
                    return res.status(400).json({ error: 'Mixed cart detected. Reserve in shop must only contain items from the selected pickup shop.' });
                }
            }
        } else {
             return res.status(400).json({ error: 'Order must contain items.' });
        }
        const shop_ids = Array.from(shopIdsSet);

        // --- 2. Inventory Lock & Decrement ---
        // Optimistically attempt to decrement stock for every item
        for (const item of items) {
            const shopId = item.shop_id || item.product.shop_id;
            const productId = item.product_id || item.product.id;
            const quantity = item.quantity || 1;

            if (fulfillment_type === 'pickup') {
                // Verify pickup is available for this item
                const { data: invCheck } = await supabase
                    .from('vendor_inventory')
                    .select('pickup_available, stock')
                    .eq('product_id', productId)
                    .eq('shop_id', shopId)
                    .single();

                if (!invCheck || !invCheck.pickup_available) {
                    return res.status(400).json({ error: `Item ${productId} is not available for pickup at this shop.` });
                }
            }

            // Using Supabase REST for atomic-like update by ensuring stock is >= quantity
            // Fetch current stock first (since exact REST decrement is tricky without RPC, we'll do a strict read-modify-write)
            const { data: currentInv, error: invQueryError } = await supabase
                .from('vendor_inventory')
                .select('id, stock')
                .eq('product_id', productId)
                .eq('shop_id', shopId)
                .single();

            if (invQueryError || !currentInv || currentInv.stock < quantity) {
                 return res.status(400).json({ error: `Insufficient stock for product ${productId} at shop ${shopId}.` });
            }

            const { error: stockUpdateError } = await supabase
                .from('vendor_inventory')
                .update({ stock: currentInv.stock - quantity })
                .eq('id', currentInv.id)
                .gte('stock', quantity); // Optimistic concurrency check

            if (stockUpdateError) {
                return res.status(409).json({ error: `Failed to lock stock for product ${productId}. Please try again.` });
            }
        }

        // --- 3. Finalize Order ---
        const { data, error } = await supabase
            .from('orders')
            .insert([{
                customer_name: customerName,
                email,
                phone,
                total,
                shipping_address: fulfillment_type === 'pickup' ? null : shippingAddress,
                payment_method: paymentMethod,
                items,
                shop_ids: shop_ids,
                fulfillment_type,
                pickup_shop_id: fulfillment_type === 'pickup' ? pickup_shop_id : null,
                status: fulfillment_type === 'pickup' ? 'reserved' : 'pending' // Different default states
            }])
            .select();

        if (error) {
            throw error;
        }

        const newOrderId = data[0].id;

        // --- 4. Split Order into Sub-Orders (RPC) ---
        // This triggers the database logic to create vendor-specific fulfillment units
        const { error: rpcError } = await supabase.rpc('split_order_to_vendors', { p_order_id: newOrderId });
        
        if (rpcError) {
            console.error('Order split RPC failed:', rpcError);
            // Non-critical for the user, but needs logging/retry
        }

        res.status(201).json({ id: newOrderId, message: 'Order created successfully' });
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
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('shop_ids')
            .eq('id', id)
            .single();
        
        if (fetchError || !order) return res.status(404).json({ error: 'Order not found' });

        if (admin && admin.role === 'regional_admin') {
            const { data: adminShops } = await supabase
                .from('shops')
                .select('id')
                .in('region_id', admin.assignedRegionIds);
            
            const adminShopIds = adminShops ? adminShops.map(s => s.id) : [];
            const hasAccess = order.shop_ids.some(sid => adminShopIds.includes(sid));

            if (!hasAccess) return res.status(403).json({ error: 'Forbidden: You do not have access to this order.' });
        } else if (admin && admin.role === 'vendor') {
            if (!admin.shop_id || !order.shop_ids.includes(admin.shop_id)) {
                return res.status(403).json({ error: 'Forbidden: You can only update orders for your shop.' });
            }
        }

        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        // NEW: If updating via vendor/regional admin, also sync the Sub-Order status
        if (admin && (admin.role === 'vendor' || admin.role === 'regional_admin')) {
            const shopFilter = admin.role === 'vendor' ? { shop_id: admin.shop_id } : {};
            await supabase
                .from('sub_orders')
                .update({ status })
                .eq('parent_order_id', id)
                .match(shopFilter);
        }

        res.json({ message: 'Order status updated', order: data[0] });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
