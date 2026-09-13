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
                total: so.total_amount,
                tracking_number: so.tracking_number,
                fulfillment_type: so.fulfillment_type
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
                let shopId = item.shop_id;
                const productId = item.product_id;

                // Dynamic inventory resolution:
                // If shopId is missing, unassigned, or invalid, find an active boutique holding stock for this product
                let dbInv = null;
                if (shopId) {
                    const { data: invFound } = await supabase
                        .from('vendor_inventory')
                        .select('id, price, stock, shop_id')
                        .eq('product_id', productId)
                        .eq('shop_id', shopId)
                        .maybeSingle();
                    dbInv = invFound;
                }

                if (!dbInv && fulfillment_type !== 'pickup') {
                    // Fallback to the first active boutique with available stock
                    const { data: fallbackInv } = await supabase
                        .from('vendor_inventory')
                        .select('id, price, stock, shop_id')
                        .eq('product_id', productId)
                        .eq('is_active', true)
                        .gt('stock', 0)
                        .order('price', { ascending: true })
                        .limit(1)
                        .maybeSingle();

                    if (fallbackInv) {
                        dbInv = fallbackInv;
                        shopId = fallbackInv.shop_id;
                        item.shop_id = fallbackInv.shop_id;
                    }
                }

                if (!shopId) {
                    // If still no boutique found, grab the first active flagship boutique
                    const { data: flagshipShop } = await supabase
                        .from('shops')
                        .select('id')
                        .eq('status', 'active')
                        .limit(1)
                        .maybeSingle();
                    if (flagshipShop) {
                        shopId = flagshipShop.id;
                        item.shop_id = flagshipShop.id;
                        // Ensure an inventory record exists for seamless checkout
                        const { data: createdInv } = await supabase
                            .from('vendor_inventory')
                            .upsert([{
                                product_id: productId,
                                shop_id: flagshipShop.id,
                                price: item.price || 0,
                                stock: 100,
                                is_active: true
                            }], { onConflict: 'product_id, shop_id' })
                            .select()
                            .single();
                        dbInv = createdInv;
                    } else {
                        return res.status(400).json({ error: `Product ${productId} is currently unassigned to any boutique.` });
                    }
                }

                shopIdsSet.add(shopId);

                // For pickup, strictly enforce against the single pickup shop
                if (fulfillment_type === 'pickup' && String(shopId) !== String(pickup_shop_id)) {
                    return res.status(400).json({ error: 'Mixed cart detected. Reserve in shop must only contain items from the selected pickup shop.' });
                }

                // Verify price from DB (first vendor_inventory, fallback to products)
                let unitPrice = 0;
                if (dbInv && dbInv.price) {
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

        // --- 2. Atomic Order Placement & Inventory Reservation (ACID RPC) ---
        const orderPayload = {
            customerName,
            email: email ? email.toLowerCase() : null,
            phone: phone ? phone.trim() : null,
            total,
            shippingAddress: fulfillment_type === 'pickup' ? null : shippingAddress,
            paymentMethod,
            fulfillment_type,
            pickup_shop_id: fulfillment_type === 'pickup' ? pickup_shop_id : null,
            items: normalizedItems,
            shop_ids: shop_ids
        };

        let newOrderId;
        let usedAtomicRpc = false;

        try {
            const { data: rpcResult, error: rpcError } = await supabase.rpc('place_order_atomic', { 
                p_order_payload: orderPayload 
            });

            if (!rpcError && rpcResult) {
                if (rpcResult.success === false) {
                    return res.status(400).json({ error: rpcResult.error || 'Failed to place order atomically' });
                }
                newOrderId = rpcResult.order_id;
                usedAtomicRpc = true;
            }
        } catch (rpcEx) {
            console.warn('Atomic order RPC failed to execute, transitioning to transactional handler:', rpcEx.message);
        }

        // Transactional Fallback: Pre-flight stock verification to ensure zero partial decrements
        if (!usedAtomicRpc) {
            for (const item of normalizedItems) {
                const { data: inv } = await supabase
                    .from('vendor_inventory')
                    .select('id, stock, reserved_quantity, price')
                    .eq('product_id', item.product_id)
                    .eq('shop_id', item.shop_id)
                    .maybeSingle();

                if (!inv) {
                    return res.status(400).json({ 
                        error: `Inventory record not found for product ${item.product_id} at boutique.` 
                    });
                }

                const available = (Number(inv.stock) || 0) - (Number(inv.reserved_quantity) || 0);
                if (available < (item.quantity || 1)) {
                    return res.status(400).json({ 
                        error: `Insufficient stock for product ${item.product_id} at selected boutique. Available: ${available}, Requested: ${item.quantity || 1}` 
                    });
                }
            }

            // Determine explicit next order id to ensure sequence desync does not trigger orders_pkey duplicate key error
            const { data: maxRow } = await supabase
                .from('orders')
                .select('id')
                .order('id', { ascending: false })
                .limit(1);
            const nextOrderId = (maxRow && maxRow[0] ? Number(maxRow[0].id) : 0) + 1;

            // All item stocks are confirmed available — insert master order
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
            newOrderId = orderData[0].id;

            // Decrement inventory, write immutable inventory audit logs, and populate relational order_items
            for (const item of normalizedItems) {
                const { data: inv } = await supabase
                    .from('vendor_inventory')
                    .select('id, stock, price')
                    .eq('product_id', item.product_id)
                    .eq('shop_id', item.shop_id)
                    .single();

                if (inv) {
                    const prevStock = Number(inv.stock) || 0;
                    const newStock = Math.max(0, prevStock - item.quantity);

                    await supabase
                        .from('vendor_inventory')
                        .update({ stock: newStock, updated_at: new Date().toISOString() })
                        .eq('id', inv.id);

                    // Record immutable inventory audit ledger
                    try {
                        await supabase.from('inventory_logs').insert([{
                            inventory_id: inv.id,
                            shop_id: item.shop_id,
                            product_id: item.product_id,
                            previous_stock: prevStock,
                            new_stock: newStock,
                            delta: -item.quantity,
                            change_type: 'order_sale',
                            reference_id: String(newOrderId)
                        }]);
                    } catch (logErr) {
                        console.warn('Inventory log insertion skipped:', logErr.message);
                    }
                }

                // Insert relational line item into order_items
                try {
                    await supabase.from('order_items').insert([{
                        order_id: newOrderId,
                        product_id: item.product_id,
                        shop_id: item.shop_id,
                        quantity: item.quantity,
                        unit_price: item.price || inv?.price || 0,
                        size: item.size || null,
                        is_gift_wrapped: Boolean(item.isGiftWrapped)
                    }]);
                } catch (oiErr) {
                    console.warn('Relational order_items insert skipped:', oiErr.message);
                }
            }

            // Split into sub-orders
            const { error: rpcError } = await supabase.rpc('split_order_to_vendors', { p_order_id: newOrderId });
            if (rpcError) {
                console.error('Order split RPC failed:', rpcError);
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

// Update order status (Decoupled fulfillment)
router.put('/:id/status', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin', 'vendor']), async (req, res) => {
    const { id } = req.params;
    const { status, sub_order_id, shop_id } = req.body;
    const admin = req.user;

    try {
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();
        
        if (fetchError || !order) return res.status(404).json({ error: 'Order not found' });

        if (admin && admin.role === 'regional_admin') {
            const { data: adminShops } = await supabase
                .from('shops')
                .select('id')
                .in('region_id', admin.assignedRegionIds);
            
            const adminShopIds = adminShops ? adminShops.map(s => s.id) : [];
            const hasAccess = Array.isArray(order.shop_ids) && order.shop_ids.some(sid => adminShopIds.includes(sid));

            if (!hasAccess) return res.status(403).json({ error: 'Forbidden: You do not have access to this order.' });
            
            // Regional admin updates master order and syncs sub_orders in their region
            const { data, error } = await supabase
                .from('orders')
                .update({ status })
                .eq('id', id)
                .select();
            if (error) throw error;

            await supabase
                .from('sub_orders')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('parent_order_id', id)
                .in('shop_id', adminShopIds);

            return res.json({ message: 'Order status updated', order: data[0] });

        } else if (admin && admin.role === 'vendor') {
            // MULTI-BRANCH VENDOR GOVERNANCE:
            // Vendors must ONLY update their own branch's record in sub_orders!
            // Never overwrite the master orders.status directly.
            const owned = admin.ownedShopIds || (admin.shop_id ? [admin.shop_id] : []);
            if (owned.length === 0) {
                return res.status(403).json({ error: 'Forbidden: No boutique assigned to your vendor account.' });
            }

            let subQuery = supabase
                .from('sub_orders')
                .select('*')
                .eq('parent_order_id', id)
                .in('shop_id', owned);

            if (sub_order_id) {
                subQuery = subQuery.eq('id', sub_order_id);
            } else if (shop_id) {
                subQuery = subQuery.eq('shop_id', shop_id);
            }

            const { data: vendorSubOrders, error: subFetchErr } = await subQuery;
            if (subFetchErr || !vendorSubOrders || vendorSubOrders.length === 0) {
                return res.status(403).json({ error: 'Forbidden: You do not own a boutique branch fulfilling this order.' });
            }

            const subOrderIds = vendorSubOrders.map(s => s.id);
            const { data: updatedSubOrders, error: updateErr } = await supabase
                .from('sub_orders')
                .update({ status, updated_at: new Date().toISOString() })
                .in('id', subOrderIds)
                .select();

            if (updateErr) throw updateErr;

            // Automatically evaluate and update the master order status based on all sub-orders
            const evaluatedMasterStatus = await evaluateAndUpdateMasterOrderStatus(id);

            return res.json({ 
                message: 'Boutique sub-order status updated successfully', 
                sub_orders: updatedSubOrders,
                evaluated_master_status: evaluatedMasterStatus,
                order: { ...order, status: evaluatedMasterStatus || order.status }
            });

        } else {
            // Super Admin
            const { data, error } = await supabase
                .from('orders')
                .update({ status })
                .eq('id', id)
                .select();

            if (error) throw error;
            return res.json({ message: 'Order status updated', order: data[0] });
        }
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


