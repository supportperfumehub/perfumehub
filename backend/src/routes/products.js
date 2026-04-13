import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get all products
router.get('/', authenticateUser, async (req, res) => {
    try {
        let query = supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (req.query.shop_id) {
            query = query.eq('shop_id', req.query.shop_id);
        }

        // Enforce Regional Scoping for Regional Admins
        if (req.user && req.user.role === 'regional_admin') {
            const { data: shops } = await supabase
                .from('shops')
                .select('id')
                .in('region_id', req.user.assignedRegionIds);
            
            const shopIds = shops ? shops.map(s => s.id) : [];
            if (shopIds.length > 0) {
                query = query.in('shop_id', shopIds);
            } else if (req.query.shop_id) {
                // If they asked for a specific shop but they have no shops, block it
                return res.json([]);
            } else {
                // If they have no shops but didn't specify one, only show global products (if any)
                // or just empty for admin context. Usually we want to show nothing if they have no shops assigned.
                query = query.is('shop_id', null); 
            }
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

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'Product not found' });
            throw error;
        }
        res.json(data);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create product
router.post('/', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin', 'vendor']), async (req, res) => {
    const { 
        name, brand, type, size, price, oldPrice, discount, isNew, isFeatured,
        image, category, gender, description, sku, stock,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, shop_id
    } = req.body;
    const admin = req.user;

    try {
        // Scoping check
        if (admin.role === 'regional_admin') {
            if (!shop_id) return res.status(403).json({ error: 'Regional admins must specify a shop_id' });
            
            const { data: shop } = await supabase.from('shops').select('region_id').eq('id', shop_id).single();
            if (!shop || !admin.assignedRegionIds.includes(shop.region_id)) {
                return res.status(403).json({ error: 'Forbidden: You do not have access to this shop.' });
            }
        }

        const { data, error } = await supabase
            .from('products')
            .insert([{
                name, brand, type, size, price, old_price: oldPrice, discount,
                is_new: isNew, is_featured: isFeatured, image, category, gender,
                description, sku: sku || null, stock: stock !== undefined ? stock : 10,
                notes: notes || [], vibes: vibes || [], occasions: occasions || [],
                reason: reason || null, seasons: seasons || [],
                top_notes: topNotes || null, middle_notes: middleNotes || null,
                base_notes: baseNotes || null, shop_id: shop_id || null
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ id: data[0].id, message: 'Product created successfully' });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update product
router.put('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin', 'vendor']), async (req, res) => {
    const { id } = req.params;
    const { 
        name, brand, type, size, price, oldPrice, discount, isNew, isFeatured,
        image, category, gender, description, sku, stock,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, shop_id
    } = req.body;
    const admin = req.user;

    try {
        // Fetch existing product to check ownership
        const { data: existingProduct } = await supabase.from('products').select('shop_id').eq('id', id).single();
        if (!existingProduct) return res.status(404).json({ error: 'Product not found' });

        // Scoping check
        if (admin.role === 'regional_admin') {
            if (!existingProduct.shop_id) return res.status(403).json({ error: 'Forbidden: You cannot modify global products.' });
            
            const { data: shop } = await supabase.from('shops').select('region_id').eq('id', existingProduct.shop_id).single();
            if (!shop || !admin.assignedRegionIds.includes(shop.region_id)) {
                return res.status(403).json({ error: 'Forbidden: You do not have access to this shop.' });
            }
        }

        const { data, error } = await supabase
            .from('products')
            .update({
                name, brand, type, size, price, old_price: oldPrice, discount,
                is_new: isNew, is_featured: isFeatured, image, category, gender,
                description, sku: sku || null, stock: stock !== undefined ? stock : 10,
                notes: notes || undefined, vibes: vibes || undefined, occasions: occasions || undefined,
                reason: reason !== undefined ? reason : undefined, seasons: seasons || undefined,
                top_notes: topNotes !== undefined ? topNotes : undefined,
                middle_notes: middleNotes !== undefined ? middleNotes : undefined,
                base_notes: baseNotes !== undefined ? baseNotes : undefined,
                shop_id: shop_id !== undefined ? shop_id : undefined
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product (Soft Delete / Archive)
router.delete('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin', 'vendor']), async (req, res) => {
    const { id } = req.params;
    const admin = req.user;

    try {
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !product) return res.status(404).json({ error: 'Product not found' });

        // Scoping check
        if (admin.role === 'regional_admin') {
            if (!product.shop_id) return res.status(403).json({ error: 'Forbidden: You cannot delete global products.' });
            
            const { data: shop } = await supabase.from('shops').select('region_id').eq('id', product.shop_id).single();
            if (!shop || !admin.assignedRegionIds.includes(shop.region_id)) {
                return res.status(403).json({ error: 'Forbidden: You do not have access to this shop.' });
            }
        }

        const { error: backupError } = await supabase
            .from('backups')
            .insert([{
                table_name: 'products',
                record_id: id.toString(),
                data: product,
                deleted_at: new Date().toISOString()
            }]);

        if (backupError) console.error('Backup failed for product deletion:', backupError);

        const { error: deleteError, count } = await supabase
            .from('products')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (deleteError) throw deleteError;
        res.json({ message: 'Product archived and deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
