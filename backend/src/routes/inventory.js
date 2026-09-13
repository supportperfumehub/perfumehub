import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get inventory (Scoped by product_id or shop_id, default limit 50, zero unbounded table dumps)
router.get('/', async (req, res) => {
    // Multi-tier Edge CDN caching: 60s browser, 300s edge, 24h stale-while-revalidate
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');

    try {
        const admin = req.user;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const offset = (page - 1) * limit;

        const { product_id, shop_id, region_id } = req.query;

        // When shoppers visit a product page, query inventory solely for that specific product_id
        if (product_id) {
            let pInvQuery = supabase
                .from('vendor_inventory')
                .select(`
                    id, product_id, shop_id, price, stock, reserved_quantity, is_active, pickup_available, updated_at,
                    shops (id, name, address, latitude, longitude, logo_url, trust_score, tier, status, region_id)
                `)
                .eq('product_id', product_id)
                .eq('is_active', true)
                .range(offset, offset + limit - 1);

            const { data, error } = await withTimeout(pInvQuery);
            if (error) throw error;
            return res.json(data || []);
        }

        let shopIds = null;

        // Filter by region if requested
        if (region_id && req.query.all !== 'true') {
            const { data: regionShops } = await supabase
                .from('shops')
                .select('id')
                .eq('region_id', region_id);
            shopIds = regionShops ? regionShops.map(s => s.id) : [];
        }

        // Apply RBAC filters
        if (admin && admin.role === 'vendor') {
            const { data: vendorShops } = await supabase
                .from('shops')
                .select('id')
                .eq('owner_id', admin.id);
            
            let ownedShopIds = vendorShops ? vendorShops.map(s => s.id) : [];
            if (admin.shop_id && !ownedShopIds.includes(admin.shop_id)) {
                ownedShopIds.push(admin.shop_id);
            }

            if (ownedShopIds.length === 0) return res.json([]);

            if (shop_id && shop_id !== 'all') {
                if (ownedShopIds.includes(shop_id)) {
                    shopIds = [shop_id];
                } else {
                    return res.status(403).json({ error: 'Forbidden: You do not own this shop.' });
                }
            } else {
                shopIds = ownedShopIds;
            }
        } else if (admin && admin.role === 'regional_admin') {
            const { data: shops } = await supabase
                .from('shops')
                .select('id')
                .in('region_id', admin.assignedRegionIds);

            const rShopIds = shops ? shops.map(s => s.id) : [];
            if (rShopIds.length > 0) {
                shopIds = rShopIds;
            } else if (!shop_id) {
                return res.json([]);
            }
        }

        let query = supabase
            .from('vendor_inventory')
            .select('*');

        if (shopIds !== null) {
            query = query.in('shop_id', shopIds);
        }
        if (shop_id && shop_id !== 'all') {
            query = query.eq('shop_id', shop_id);
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error } = await withTimeout(query);
        if (error) throw error;
        
        res.json(data || []);
    } catch (error) {
        if (error.message === 'Database query timed out') {
            return res.status(504).json({ error: 'Database timeout' });
        }
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Link a global product to the shop's inventory
router.post('/', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin', 'vendor']), async (req, res) => {
    const { product_id, shop_id, price, stock, is_active, pickup_available } = req.body;
    const admin = req.user;

    try {
        let targetShopId = shop_id;

        // Validate permissions
        if (admin.role === 'vendor') {
            const owned = admin.ownedShopIds || (admin.shop_id ? [admin.shop_id] : []);
            if (owned.length === 0) return res.status(403).json({ error: 'Forbidden: No boutique assigned to your vendor account.' });
            if (!targetShopId) {
                targetShopId = owned[0];
            } else if (!owned.includes(targetShopId)) {
                return res.status(403).json({ error: 'Forbidden: You do not own this boutique branch.' });
            }
        } else if (admin.role === 'regional_admin') {
            if (!targetShopId) return res.status(400).json({ error: 'Regional admins must specify a shop_id' });
            const { data: shop } = await supabase.from('shops').select('region_id').eq('id', targetShopId).single();
            if (!shop || !admin.assignedRegionIds.includes(shop.region_id)) {
                return res.status(403).json({ error: 'Forbidden: You do not have access to this shop.' });
            }
        }

        // Verify global product exists
        const { data: product } = await supabase.from('products').select('id').eq('id', product_id).single();
        if (!product) return res.status(404).json({ error: 'Global Product not found.' });

        const { data, error } = await supabase
            .from('vendor_inventory')
            .upsert([{
                product_id,
                shop_id: targetShopId,
                price: price || 0,
                stock: stock !== undefined ? stock : 0,
                is_active: is_active !== undefined ? is_active : true,
                pickup_available: pickup_available !== undefined ? pickup_available : false,
                updated_at: new Date().toISOString()
            }], { onConflict: 'product_id, shop_id' })
            .select();

        if (error) throw error;

        // Recalculate total master stock across all active shops for this product
        if (data[0]?.product_id) {
            try {
                const { data: allActiveInvs } = await supabase
                    .from('vendor_inventory')
                    .select('stock')
                    .eq('product_id', data[0].product_id)
                    .eq('is_active', true);

                const totalMasterStock = (allActiveInvs || []).reduce((acc, row) => acc + (Number(row.stock) || 0), 0);
                await supabase.from('products').update({ stock: totalMasterStock }).eq('id', data[0].product_id);
            } catch (calcErr) {
                console.error('Error calculating master stock on inventory create:', calcErr.message);
            }
        }

        res.status(201).json({ id: data[0].id, message: 'Inventory added successfully', inventory: data[0] });
    } catch (error) {
        console.error('Error adding inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update specific inventory record
router.put('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin', 'vendor']), async (req, res) => {
    const { id } = req.params;
    const { price, stock, is_active, pickup_available } = req.body;
    const admin = req.user;

    try {
        const { data: existingInv } = await supabase.from('vendor_inventory').select('shop_id, product_id, reserved_quantity, stock').eq('id', id).single();
        if (!existingInv) return res.status(404).json({ error: 'Inventory record not found' });

        if (admin.role === 'vendor') {
            const owned = admin.ownedShopIds || (admin.shop_id ? [admin.shop_id] : []);
            if (!owned.includes(existingInv.shop_id)) return res.status(403).json({ error: 'Forbidden: You do not own this boutique branch.' });
        } else if (admin.role === 'regional_admin') {
            const { data: shop } = await supabase.from('shops').select('region_id').eq('id', existingInv.shop_id).single();
            if (!shop || !admin.assignedRegionIds.includes(shop.region_id)) {
                return res.status(403).json({ error: 'Access Denied: You do not have administrative authority over this geographic territory.' });
            }
        }

        const updateInvPayload = { updated_at: new Date().toISOString() };
        if (price !== undefined) updateInvPayload.price = Number(price);
        if (stock !== undefined) {
            const numStock = Number(stock);
            const activeReserved = Number(existingInv.reserved_quantity || 0);
            if (numStock < activeReserved) {
                return res.status(400).json({ 
                    error: `Cannot reduce stock below the currently reserved quantity (${activeReserved} units reserved for click & collect).` 
                });
            }
            updateInvPayload.stock = numStock;
        }
        if (is_active !== undefined) updateInvPayload.is_active = is_active;
        if (pickup_available !== undefined) updateInvPayload.pickup_available = pickup_available;

        const { data, error } = await supabase
            .from('vendor_inventory')
            .update(updateInvPayload)
            .eq('id', id)
            .select();

        if (error) {
            if (error.message && error.message.includes('check_stock_reserved')) {
                return res.status(400).json({ error: 'Cannot reduce stock below the currently reserved quantity.' });
            }
            throw error;
        }

        // Record immutable stock movement into inventory_logs
        if (stock !== undefined && existingInv && data[0]) {
            const prevStock = Number(existingInv.stock) || 0;
            const newStock = Number(data[0].stock) || 0;
            const delta = newStock - prevStock;
            if (delta !== 0) {
                try {
                    await supabase.from('inventory_logs').insert([{
                        inventory_id: id,
                        shop_id: existingInv.shop_id,
                        product_id: existingInv.product_id,
                        previous_stock: prevStock,
                        new_stock: newStock,
                        delta: delta,
                        change_type: delta > 0 ? 'vendor_restock' : 'manual_adjustment',
                        performed_by: admin?.id || null
                    }]);
                } catch (logErr) {
                    console.warn('Inventory log insertion error:', logErr.message);
                }
            }
        }

        // Recalculate total master stock (sum of all active shop inventories)
        // CRITICAL: NEVER overwrite products.price or products.old_price! 
        // products.price is the master benchmark (MSRP). Regional selling prices live strictly in vendor_inventory.price.
        if (data[0]?.product_id) {
            try {
                const productId = data[0].product_id;
                const { data: allActiveInvs } = await supabase
                    .from('vendor_inventory')
                    .select('stock')
                    .eq('product_id', productId)
                    .eq('is_active', true);

                const totalMasterStock = (allActiveInvs || []).reduce((acc, row) => acc + (Number(row.stock) || 0), 0);

                await supabase
                    .from('products')
                    .update({ stock: totalMasterStock })
                    .eq('id', productId);
            } catch (syncErr) {
                console.error('Inventory auto-sync error:', syncErr.message);
            }
        }

        res.json({ message: 'Shop inventory updated successfully and master stock recalculated', inventory: data[0] });

    } catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete / Unbind specific inventory record
router.delete('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin', 'vendor']), async (req, res) => {
    const { id } = req.params;
    const admin = req.user;

    try {
        const { data: existingInv } = await supabase.from('vendor_inventory').select('shop_id, product_id').eq('id', id).single();
        if (!existingInv) return res.status(404).json({ error: 'Inventory record not found' });

        if (admin.role === 'vendor') {
            const owned = admin.ownedShopIds || (admin.shop_id ? [admin.shop_id] : []);
            if (!owned.includes(existingInv.shop_id)) return res.status(403).json({ error: 'Forbidden: You do not own this boutique branch.' });
        } else if (admin.role === 'regional_admin') {
            const { data: shop } = await supabase.from('shops').select('region_id').eq('id', existingInv.shop_id).single();
            if (!shop || !admin.assignedRegionIds.includes(shop.region_id)) {
                return res.status(403).json({ error: 'Access Denied: You do not have administrative authority over this geographic territory.' });
            }
        }

        const { error } = await supabase
            .from('vendor_inventory')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Recalculate total master stock
        if (existingInv.product_id) {
            try {
                const { data: allActiveInvs } = await supabase
                    .from('vendor_inventory')
                    .select('stock')
                    .eq('product_id', existingInv.product_id)
                    .eq('is_active', true);

                const totalMasterStock = (allActiveInvs || []).reduce((acc, row) => acc + (Number(row.stock) || 0), 0);
                await supabase.from('products').update({ stock: totalMasterStock }).eq('id', existingInv.product_id);
            } catch (calcErr) {
                console.error('Master stock recalculation error:', calcErr.message);
            }
        }

        res.json({ success: true, message: 'Inventory item removed successfully' });
    } catch (error) {
        console.error('Error deleting inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
