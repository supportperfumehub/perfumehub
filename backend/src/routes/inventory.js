import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get inventory for a shop (or all accessible shops for admins)
router.get('/', async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    try {
        const admin = req.user;
        let shopIds = null;

        // Filter by region if requested
        if (req.query.region_id) {
            const { data: regionShops } = await supabase
                .from('shops')
                .select('id')
                .eq('region_id', req.query.region_id);
            shopIds = regionShops ? regionShops.map(s => s.id) : [];
        }

        // Apply RBAC filters
        if (admin && admin.role === 'vendor') {
            if (!admin.shop_id) return res.status(403).json({ error: 'Forbidden: No shop assigned to this vendor.' });
            shopIds = [admin.shop_id];
        } else if (admin && admin.role === 'regional_admin') {
            const { data: shops } = await supabase
                .from('shops')
                .select('id')
                .in('region_id', admin.assignedRegionIds);

            const rShopIds = shops ? shops.map(s => s.id) : [];
            if (rShopIds.length > 0) {
                shopIds = rShopIds;
            } else if (!req.query.shop_id) {
                return res.json([]);
            }
        }

        let allData = [];
        let page = 0;
        const pageSize = 1000;

        while (true) {
            let query = supabase
                .from('vendor_inventory')
                .select('*');

            if (shopIds !== null) {
                query = query.in('shop_id', shopIds);
            }
            if (req.query.shop_id) {
                query = query.eq('shop_id', req.query.shop_id);
            }

            query = query.range(page * pageSize, (page + 1) * pageSize - 1);

            const { data, error } = await withTimeout(query);
            if (error) throw error;
            if (!data || data.length === 0) break;
            allData = allData.concat(data);
            if (data.length < pageSize) break;
            page++;
        }
        
        res.json(allData);
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
            if (!admin.shop_id) return res.status(403).json({ error: 'Forbidden: No shop assigned to your vendor account.' });
            if (shop_id && shop_id !== admin.shop_id) return res.status(403).json({ error: 'Forbidden: Cannot create inventory for another shop.' });
            targetShopId = admin.shop_id;
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
        const { data: existingInv } = await supabase.from('vendor_inventory').select('shop_id').eq('id', id).single();
        if (!existingInv) return res.status(404).json({ error: 'Inventory record not found' });

        if (admin.role === 'vendor') {
            if (existingInv.shop_id !== admin.shop_id) return res.status(403).json({ error: 'Forbidden: Cannot edit another shop inventory.' });
        } else if (admin.role === 'regional_admin') {
            const { data: shop } = await supabase.from('shops').select('region_id').eq('id', existingInv.shop_id).single();
            if (!shop || !admin.assignedRegionIds.includes(shop.region_id)) {
                return res.status(403).json({ error: 'Forbidden: Cannot edit this region inventory.' });
            }
        }

        const { data, error } = await supabase
            .from('vendor_inventory')
            .update({
                price: price !== undefined ? price : undefined,
                stock: stock !== undefined ? stock : undefined,
                is_active: is_active !== undefined ? is_active : undefined,
                pickup_available: pickup_available !== undefined ? pickup_available : undefined,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) {
            if (error.message && error.message.includes('check_stock_reserved')) {
                return res.status(400).json({ error: 'Cannot reduce stock below the currently reserved quantity.' });
            }
            throw error;
        }

        // Automatically synchronize master product price and discount tag when inventory price changes
        if (price !== undefined && data[0]?.product_id) {
            try {
                const newPrice = Number(price);
                const { data: prod } = await supabase.from('products').select('old_price, size').eq('id', data[0].product_id).single();
                const oldP = prod?.old_price ? Number(prod.old_price) : null;
                const autoDiscount = (oldP && oldP > newPrice) ? Math.round((1 - newPrice / oldP) * 100) : 0;
                
                let updatedSizes = prod?.size;
                if (Array.isArray(updatedSizes) && updatedSizes.length > 0) {
                    updatedSizes = updatedSizes.map((sz, idx) => {
                        if (idx === 0 || updatedSizes.length === 1) {
                            return typeof sz === 'object'
                                ? { ...sz, price: newPrice, oldPrice: (oldP && oldP > newPrice) ? oldP : null, discount: autoDiscount }
                                : { name: sz, price: newPrice, oldPrice: (oldP && oldP > newPrice) ? oldP : null, discount: autoDiscount };
                        }
                        return sz;
                    });
                }

                await supabase
                    .from('products')
                    .update({ 
                        price: newPrice,
                        old_price: (oldP && oldP > newPrice) ? oldP : null,
                        discount: autoDiscount,
                        size: updatedSizes
                    })
                    .eq('id', data[0].product_id);
            } catch (syncErr) {
                console.error('Inventory auto-sync error:', syncErr.message);
            }
        }

        res.json({ message: 'Inventory updated successfully and synced to master product catalog', inventory: data[0] });

    } catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
