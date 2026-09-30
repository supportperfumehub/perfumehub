import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';
import { orderLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validate.js';
import { body } from 'express-validator';
import { emailService } from '../services/emailService.js';

const router = express.Router();

// Private / User Endpoints: No Edge CDN caching, strictly private
router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, private');
    next();
});

// Get all orders
router.get('/', authenticateUser, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        let query = supabase
            .from('orders')
            .select('*, order_items(*, products(id, name, brand, image)), sub_orders(*, shops(id, name, address, whatsapp_number))')
            .order('created_at', { ascending: false });

        if (req.query.shop_id) {
            query = query.contains('shop_ids', [req.query.shop_id]);
        }

        // Apply strict Customer scoping
        if (req.user.role === 'customer') {
            // Strictly bind query to authenticated customer's email (zero IDOR leakage)
            query = query.eq('email', req.user.email);
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
        paymentMethod, items, fulfillment_type = 'delivery', pickup_shop_id,
        couponCode
    } = req.body;
    
    try {
        // Prepare and normalize consolidated items array
        const normalizedItems = (items || []).map(item => {
            const pId = item.id || item.product_id || (item.product && item.product.id);
            const sId = item.shop_id || (item.product && item.product.shop_id);
            const pr = item.price !== undefined 
                ? parseFloat(item.price) 
                : (item.selectedPrice !== undefined 
                    ? parseFloat(item.selectedPrice) 
                    : (item.product ? parseFloat(item.product.price) : 0));
            return {
                id: pId,
                product_id: pId,
                shop_id: sId,
                price: pr,
                quantity: Number(item.quantity) || 1,
                name: item.name || (item.product && item.product.name) || 'Perfume',
                brand: item.brand || (item.product && item.product.brand) || '',
                size: item.size || item.selectedSize || null,
                isGiftWrapped: Boolean(item.isGiftWrapped)
            };
        });

        // --- 1. Fulfillment & Direct Catalog Validation ---
        if (fulfillment_type === 'pickup' && !pickup_shop_id) {
            return res.status(400).json({ error: 'pickup_shop_id is required for reserve in shop orders.' });
        }

        if (!normalizedItems || normalizedItems.length === 0) {
            return res.status(400).json({ error: 'Order must contain items.' });
        }

        const productIds = normalizedItems.map(i => i.product_id).filter(Boolean);
        const { data: dbProducts, error: prodFetchErr } = await supabase
            .from('products')
            .select('id, name, price, stock')
            .in('id', productIds);

        if (prodFetchErr) {
            console.error('Failed to verify products:', prodFetchErr);
            return res.status(500).json({ error: 'Failed to verify product catalog.' });
        }

        const productMap = new Map((dbProducts || []).map(p => [String(p.id), p]));
        let calculatedSubtotal = 0;

        for (const item of normalizedItems) {
            const dbProd = productMap.get(String(item.product_id));
            if (!dbProd) {
                return res.status(400).json({ error: `Product ${item.product_id} is no longer available in the catalog.` });
            }

            // Verify stock availability directly on master catalog
            if (dbProd.stock !== null && dbProd.stock !== undefined) {
                const availableStock = Number(dbProd.stock);
                if (availableStock < (item.quantity || 1)) {
                    return res.status(400).json({
                        error: `Insufficient stock for "${dbProd.name}". Available: ${availableStock}, Requested: ${item.quantity || 1}`
                    });
                }
            }

            const unitPrice = parseFloat(dbProd.price || 0);
            item.price = unitPrice;
            const itemPrice = unitPrice + (item.isGiftWrapped ? 10 : 0);
            calculatedSubtotal += itemPrice * (item.quantity || 1);
        }

        const shop_ids = pickup_shop_id ? [pickup_shop_id] : [1];

        // Apply discount if coupon is specified with Zero-Trust checks
        let calculatedDiscountAmount = 0;
        if (couponCode) {
            const { data: coupon } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', couponCode.toUpperCase())
                .eq('is_active', true)
                .maybeSingle();
            
            if (coupon) {
                const expiry = coupon.expiry_date ? new Date(coupon.expiry_date) : null;
                const isExpired = expiry && expiry < new Date();
                const isLimitReached = coupon.usage_limit && (coupon.usage_count >= coupon.usage_limit);

                const customerEmail = email ? email.toLowerCase() : null;
                const customerPhone = phone ? phone.trim() : null;
                const customerIP = req.ip || req.headers['x-forwarded-for'] || null;

                const parseArray = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? JSON.parse(val || '[]') : []);
                const usedBy = parseArray(coupon.used_by);
                const usedByPhones = parseArray(coupon.used_by_phones);
                const usedByIPs = parseArray(coupon.used_by_ips);

                const alreadyUsed = (customerEmail && usedBy.includes(customerEmail)) ||
                                    (customerPhone && usedByPhones.includes(customerPhone)) ||
                                    (customerIP && usedByIPs.includes(customerIP));

                if (!isExpired && !isLimitReached && !alreadyUsed) {
                    if (coupon.discount_type === 'percentage') {
                        calculatedDiscountAmount = (calculatedSubtotal * coupon.discount_value) / 100;
                    } else if (coupon.discount_type === 'flat' || coupon.discount_type === 'amount') {
                        calculatedDiscountAmount = coupon.discount_value;
                    }
                }
            }
        }

        const calculatedTotal = Math.max(0, calculatedSubtotal - calculatedDiscountAmount);
        
        // Allow a tiny margin of 0.05 for rounding differences
        if (Math.abs(calculatedTotal - total) > 0.05) {
            return res.status(400).json({ 
                error: `Order total verification failed. Calculated total: ${calculatedTotal}, provided: ${total}` 
            });
        }

        // --- 2. Master Order Placement (Direct Luxury PerfumeHub E-Commerce) ---
        // Determine explicit next order id to prevent sequence duplicate key collisions
        const { data: maxRow } = await supabase
            .from('orders')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);
        const nextOrderId = (maxRow && maxRow[0] ? Number(maxRow[0].id) : 0) + 1;

        const { data: orderData, error: orderInsertErr } = await supabase
            .from('orders')
            .insert([{
                id: nextOrderId,
                customer_name: customerName,
                email: email ? email.toLowerCase() : null,
                phone: phone ? phone.trim() : null,
                total,
                shipping_address: fulfillment_type === 'pickup' ? null : shippingAddress,
                payment_method: paymentMethod,
                items: normalizedItems,
                shop_ids: shop_ids,
                fulfillment_type,
                pickup_shop_id: fulfillment_type === 'pickup' ? pickup_shop_id : null,
                status: fulfillment_type === 'pickup' ? 'reserved' : 'pending'
            }])
            .select();

        if (orderInsertErr) throw orderInsertErr;
        const newOrderId = orderData[0].id;

        // Decrement product master stock and record order line items
        for (const item of normalizedItems) {
            const dbProd = productMap.get(String(item.product_id));

            // Relational order line item
            try {
                await supabase.from('order_items').insert([{
                    order_id: newOrderId,
                    product_id: item.product_id,
                    shop_id: pickup_shop_id || 1,
                    quantity: item.quantity,
                    unit_price: item.price || 0,
                    size: item.size || null,
                    is_gift_wrapped: Boolean(item.isGiftWrapped)
                }]);
            } catch (oiErr) {
                console.warn('Relational order_items insert notice:', oiErr.message);
            }

            // Direct stock decrement on master catalog product
            if (dbProd && dbProd.stock !== null && dbProd.stock !== undefined) {
                try {
                    const currentStock = Number(dbProd.stock) || 0;
                    const newStock = Math.max(0, currentStock - (item.quantity || 1));
                    await supabase
                        .from('products')
                        .update({ stock: newStock })
                        .eq('id', item.product_id);
                } catch (stkErr) {
                    console.warn('Direct product stock decrement notice:', stkErr.message);
                }
            }
        }

        // --- 5. Increment Coupon Usage Atomically on Backend ---
        if (couponCode && calculatedDiscountAmount > 0) {
            try {
                const { data: coupon } = await supabase
                    .from('coupons')
                    .select('*')
                    .eq('code', couponCode.toUpperCase())
                    .single();
                
                if (coupon) {
                    const customerEmail = email ? email.toLowerCase() : null;
                    const customerPhone = phone ? phone.trim() : null;
                    const customerIP = req.ip || req.headers['x-forwarded-for'] || null;

                    const parseArray = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? JSON.parse(val || '[]') : []);
                    const usedBy = parseArray(coupon.used_by);
                    const usedByPhones = parseArray(coupon.used_by_phones);
                    const usedByIPs = parseArray(coupon.used_by_ips);

                    if (customerEmail && !usedBy.includes(customerEmail)) usedBy.push(customerEmail);
                    if (customerPhone && !usedByPhones.includes(customerPhone)) usedByPhones.push(customerPhone);
                    if (customerIP && !usedByIPs.includes(customerIP)) usedByIPs.push(customerIP);

                    await supabase
                        .from('coupons')
                        .update({
                            usage_count: (coupon.usage_count || 0) + 1,
                            used_by: usedBy,
                            used_by_phones: usedByPhones,
                            used_by_ips: usedByIPs
                        })
                        .eq('id', coupon.id);
                }
            } catch (couponErr) {
                console.error('Failed to increment coupon usage:', couponErr);
            }
        }

        // Dispatch real luxury order confirmation email asynchronously
        if (email) {
            emailService.sendOrderConfirmationEmail({
                id: newOrderId,
                customer_name: customerName,
                email,
                phone,
                total,
                shipping_address: shippingAddress,
                payment_method: paymentMethod,
                items: normalizedItems
            }).catch(e => console.error('Order confirmation email warning:', e.message));
        }

        res.status(201).json({ id: newOrderId, message: 'Order created successfully' });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Helper to evaluate and sync master order status from its sub-orders
 */
export const evaluateAndUpdateMasterOrderStatus = async (parentOrderId) => {
    try {
        const { data: subOrders, error } = await supabase
            .from('sub_orders')
            .select('status')
            .eq('parent_order_id', parentOrderId);

        if (error || !subOrders || subOrders.length === 0) return null;

        const total = subOrders.length;
        const completed = subOrders.filter(s => ['completed', 'delivered'].includes((s.status || '').toLowerCase())).length;
        const shipped = subOrders.filter(s => (s.status || '').toLowerCase() === 'shipped').length;
        const cancelled = subOrders.filter(s => (s.status || '').toLowerCase() === 'cancelled').length;
        const processing = subOrders.filter(s => ['processing', 'preparing', 'ready_for_pickup', 'confirmed'].includes((s.status || '').toLowerCase())).length;

        let newStatus = 'pending';
        if (completed === total) {
            newStatus = 'completed';
        } else if (completed + shipped === total) {
            newStatus = 'shipped';
        } else if (completed + shipped > 0) {
            newStatus = 'partially_shipped';
        } else if (cancelled === total) {
            newStatus = 'cancelled';
        } else if (processing > 0) {
            newStatus = 'processing';
        }

        await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', parentOrderId);

        return newStatus;
    } catch (e) {
        console.error('Error evaluating master order status:', e);
        return null;
    }
};

// Update order status
router.put('/:id/status', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();
        
        if (fetchError || !order) return res.status(404).json({ error: 'Order not found' });

        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;
        return res.json({ message: 'Order status updated', order: data[0] });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update specific sub-order status
router.put('/sub-orders/:id/status', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin', 'vendor']), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;

    try {
        const { data: subOrder, error: fetchErr } = await supabase
            .from('sub_orders')
            .select('id, shop_id, parent_order_id')
            .eq('id', id)
            .single();

        if (fetchErr || !subOrder) return res.status(404).json({ error: 'Sub-order not found' });

        if (user.role === 'vendor') {
            const owned = user.ownedShopIds || (user.shop_id ? [user.shop_id] : []);
            if (!owned.includes(subOrder.shop_id)) {
                return res.status(403).json({ error: 'Forbidden: You do not own this boutique branch.' });
            }
        }

        const { data, error } = await supabase
            .from('sub_orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select();

        if (error) throw error;

        // Auto-evaluate master order status
        const masterStatus = await evaluateAndUpdateMasterOrderStatus(subOrder.parent_order_id);

        res.json({ success: true, message: 'Sub-order status updated', subOrder: data[0], masterStatus });
    } catch (err) {
        console.error('Error updating sub-order status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update specific sub-order tracking number
router.put('/sub-orders/:id/tracking', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin', 'vendor']), async (req, res) => {
    const { id } = req.params;
    const { tracking_number } = req.body;
    const user = req.user;

    try {
        const { data: subOrder, error: fetchErr } = await supabase
            .from('sub_orders')
            .select('id, shop_id, parent_order_id')
            .eq('id', id)
            .single();

        if (fetchErr || !subOrder) return res.status(404).json({ error: 'Sub-order not found' });

        if (user.role === 'vendor') {
            const owned = user.ownedShopIds || (user.shop_id ? [user.shop_id] : []);
            if (!owned.includes(subOrder.shop_id)) {
                return res.status(403).json({ error: 'Forbidden: You do not own this boutique branch.' });
            }
        }

        const { data, error } = await supabase
            .from('sub_orders')
            .update({ tracking_number, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ success: true, message: 'Tracking number updated', subOrder: data[0] });
    } catch (err) {
        console.error('Error updating tracking number:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Public Order & Reservation Tracking (Zero authentication required, verified by identifier)
router.post('/track', async (req, res) => {
    const { orderId, identifier } = req.body;

    if (!orderId || !identifier) {
        return res.status(400).json({ error: 'Order ID and Email/Phone are required' });
    }

    const cleanOrderId = String(orderId).trim();
    const cleanIdNum = cleanOrderId.replace(/^ORD-/i, '').trim();
    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const phoneDigitsOnly = cleanIdentifier.replace(/\D/g, '');

    try {
        // 1. Check Orders
        let orderQuery = supabase
            .from('orders')
            .select('*, order_items(*, products(id, name, brand, image)), sub_orders(*, shops(id, name, address, whatsapp_number))');

        if (!isNaN(Number(cleanIdNum))) {
            orderQuery = orderQuery.eq('id', Number(cleanIdNum));
        } else {
            orderQuery = orderQuery.ilike('id::text', `%${cleanOrderId}%`);
        }

        const { data: orderList, error: orderErr } = await orderQuery;

        if (!orderErr && orderList && orderList.length > 0) {
            const order = orderList[0];
            const orderEmail = String(order.email || '').toLowerCase().trim();
            const orderPhone = String(order.phone || '').replace(/\D/g, '');

            const isEmailMatch = orderEmail && orderEmail === cleanIdentifier;
            const isPhoneMatch = orderPhone && phoneDigitsOnly && (orderPhone.endsWith(phoneDigitsOnly) || phoneDigitsOnly.endsWith(orderPhone));

            if (isEmailMatch || isPhoneMatch) {
                const parsedItems = (order.order_items && order.order_items.length > 0)
                    ? order.order_items.map(oi => ({
                        id: oi.product_id,
                        product_id: oi.product_id,
                        shop_id: oi.shop_id,
                        name: oi.products?.name || 'Perfume',
                        brand: oi.products?.brand || '',
                        price: oi.unit_price,
                        quantity: oi.quantity,
                        size: oi.size,
                        isGiftWrapped: oi.is_gift_wrapped
                    }))
                    : (typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []));
                return res.json({
                    success: true,
                    type: 'order',
                    order: {
                        id: order.id,
                        orderNumber: `ORD-${order.id}`,
                        customer_name: order.customer_name,
                        status: order.status,
                        fulfillment_type: order.fulfillment_type || 'delivery',
                        created_at: order.created_at,
                        total: order.total,
                        items: parsedItems,
                        shipping_address: order.shipping_address,
                        payment_method: order.payment_method,
                        pickup_shop: order.sub_orders?.[0]?.shops || null,
                        sub_orders: (order.sub_orders || []).map(so => ({
                            id: so.id,
                            shop_name: so.shops?.name || 'Boutique',
                            status: so.status,
                            tracking_number: so.tracking_number,
                            subtotal: so.subtotal
                        }))
                    }
                });
            }
        }

        // 2. Check Reservations (Click & Collect)
        let resvQuery = supabase
            .from('reservations')
            .select('*, products(id, name, brand, image_url, price), shops(id, name, address, whatsapp_number)');

        const cleanResvId = cleanOrderId.replace(/^RES-?/i, '');
        if (!isNaN(Number(cleanResvId))) {
            resvQuery = resvQuery.eq('id', Number(cleanResvId));
        }

        const { data: resvList, error: resvErr } = await resvQuery;

        if (!resvErr && resvList && resvList.length > 0) {
            const resv = resvList[0];
            const resvPhone = String(resv.customer_phone || '').replace(/\D/g, '');

            if (resvPhone && phoneDigitsOnly && (resvPhone.endsWith(phoneDigitsOnly) || phoneDigitsOnly.endsWith(resvPhone))) {
                return res.json({
                    success: true,
                    type: 'reservation',
                    reservation: {
                        id: resv.id,
                        code: resv.verification_code,
                        status: resv.status,
                        product: resv.products,
                        shop: resv.shops,
                        expires_at: resv.expires_at,
                        created_at: resv.created_at
                    }
                });
            }
        }

        return res.status(404).json({
            success: false,
            error: 'No order or boutique reservation found with matching credentials. Please double check your Order ID and Email/Phone.'
        });
    } catch (err) {
        console.error('Error tracking order:', err);
        return res.status(500).json({ error: 'Failed to look up order tracking details' });
    }
});

export default router;


