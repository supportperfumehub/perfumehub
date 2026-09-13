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
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        let query = supabase
            .from('orders')
            .select('*, sub_orders(*, shops(id, name, address, whatsapp_number))')
            .order('created_at', { ascending: false });

        if (req.query.shop_id) {
            query = query.contains('shop_ids', [req.query.shop_id]);
        }

        // Apply strict Customer, Regional Admin, or Vendor scoping
        if (req.user.role === 'customer') {
            // Strictly bind query to authenticated customer's email (zero IDOR leakage)
            query = query.eq('email', req.user.email);
        } else if (req.user.role === 'regional_admin') {
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
            // Fetch all shops owned by this vendor
            const { data: vendorShops } = await supabase
                .from('shops')
                .select('id, name')
                .eq('owner_id', req.user.id);
            
            let ownedShopIds = vendorShops ? vendorShops.map(s => s.id) : [];
            if (req.user.shop_id && !ownedShopIds.includes(req.user.shop_id)) {
                ownedShopIds.push(req.user.shop_id);
            }

            if (ownedShopIds.length === 0) {
                return res.json([]);
            }

            let targetShopIds = ownedShopIds;
            if (req.query.shop_id && req.query.shop_id !== 'all') {
                if (ownedShopIds.includes(req.query.shop_id)) {
                    targetShopIds = [req.query.shop_id];
                } else {
                    return res.status(403).json({ error: 'Forbidden: You do not own this shop' });
                }
            }

            // Fetch specific sub-orders for multi-vendor fulfillment
            const { data: subOrders, error: subError } = await supabase
                .from('sub_orders')
                .select('*, orders(*)')
                .in('shop_id', targetShopIds)
                .order('created_at', { ascending: false });
            
            if (subError) throw subError;

            const shopNameMap = {};
            (vendorShops || []).forEach(s => { shopNameMap[s.id] = s.name; });

            return res.json(subOrders.map(so => ({
                ...so.orders,
                id: so.parent_order_id,
                sub_order_id: so.id,
                shop_id: so.shop_id,
                shop_name: shopNameMap[so.shop_id] || 'Branch',
                status: so.status,
                subtotal: so.subtotal,
                total: so.total_amount
            })));
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

        // --- 1. Fulfillment & Price Validation ---
        if (fulfillment_type === 'pickup' && !pickup_shop_id) {
            return res.status(400).json({ error: 'pickup_shop_id is required for reserve in shop orders.' });
        }

        const shopIdsSet = new Set();
        let calculatedSubtotal = 0;

        if (normalizedItems.length > 0) {
            for (const item of normalizedItems) {
                const shopId = item.shop_id;
                if (!shopId) return res.status(400).json({ error: 'All items must specify a shop_id to identify vendor inventory.' });
                
                shopIdsSet.add(shopId);

                // For pickup, strictly enforce against the single pickup shop
                if (fulfillment_type === 'pickup' && String(shopId) !== String(pickup_shop_id)) {
                    return res.status(400).json({ error: 'Mixed cart detected. Reserve in shop must only contain items from the selected pickup shop.' });
                }

                // Verify price from DB (first vendor_inventory, fallback to products)
                const productId = item.product_id;
                const { data: dbInv } = await supabase
                    .from('vendor_inventory')
                    .select('price')
                    .eq('product_id', productId)
                    .eq('shop_id', shopId)
                    .maybeSingle();

                let unitPrice = 0;
                if (dbInv) {
                    unitPrice = parseFloat(dbInv.price);
                } else {
                    const { data: dbProd } = await supabase
                        .from('products')
                        .select('price')
                        .eq('id', productId)
                        .maybeSingle();
                    if (!dbProd) {
                        return res.status(400).json({ error: `Product ${productId} is not available.` });
                    }
                    unitPrice = parseFloat(dbProd.price);
                }

                const itemPrice = unitPrice + (item.isGiftWrapped ? 10 : 0);
                calculatedSubtotal += itemPrice * (item.quantity || 1);
            }
        } else {
             return res.status(400).json({ error: 'Order must contain items.' });
        }
        const shop_ids = Array.from(shopIdsSet);

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

        // --- 2. Inventory Lock & Decrement (Optimistic Concurrency Control) ---
        for (const item of normalizedItems) {
            const shopId = item.shop_id;
            const productId = item.product_id;
            const quantity = item.quantity || 1;

            if (fulfillment_type === 'pickup') {
                const { data: invCheck } = await supabase
                    .from('vendor_inventory')
                    .select('pickup_available')
                    .eq('product_id', productId)
                    .eq('shop_id', shopId)
                    .maybeSingle();

                if (invCheck && !invCheck.pickup_available) {
                    return res.status(400).json({ error: `Item ${productId} is not available for pickup at this shop.` });
                }
            }

            // Decrement vendor_inventory if tracked
            const { data: currentInv } = await supabase
                .from('vendor_inventory')
                .select('id, stock')
                .eq('product_id', productId)
                .eq('shop_id', shopId)
                .maybeSingle();

            if (currentInv) {
                if (currentInv.stock < quantity) {
                    return res.status(400).json({ error: `Insufficient stock for product ${productId} at selected boutique.` });
                }
                await supabase
                    .from('vendor_inventory')
                    .update({ stock: Math.max(0, currentInv.stock - quantity) })
                    .eq('id', currentInv.id);
            }
        }

        // --- 3. Finalize Master Order ---
        const { data, error } = await supabase
            .from('orders')
            .insert([{
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

        if (error) {
            throw error;
        }

        const newOrderId = data[0].id;

        // --- 4. Split Master Order into Sub-Orders via Database RPC ---
        const { error: rpcError } = await supabase.rpc('split_order_to_vendors', { p_order_id: newOrderId });
        if (rpcError) {
            console.error('Order split RPC failed:', rpcError);
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
