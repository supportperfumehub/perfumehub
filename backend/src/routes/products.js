import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
    try {
        let query = supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (req.query.shop_id) {
            query = query.eq('shop_id', req.query.shop_id);
        }

        const { data, error } = await withTimeout(query);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        if (error.message === 'Database query timed out') {
            console.error('Products fetch timed out.');
            return res.status(504).json({ error: 'Database timeout' });
        }
        console.error('Error fetching products:', error);
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
router.post('/', async (req, res) => {
    const { 
        name, brand, type, size, price, oldPrice, discount, isNew, isFeatured,
        image, category, gender, description, sku, stock,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, shop_id
    } = req.body;

    try {
        const { data, error } = await supabase
            .from('products')
            .insert([{
                name, brand, type, size, price, old_price: oldPrice, discount,
                is_new: isNew, is_featured: isFeatured, image, category, gender,
                description, sku, stock: stock !== undefined ? stock : 10,
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
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        name, brand, type, size, price, oldPrice, discount, isNew, isFeatured,
        image, category, gender, description, sku, stock,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, shop_id
    } = req.body;

    try {
        const { data, error } = await supabase
            .from('products')
            .update({
                name, brand, type, size, price, old_price: oldPrice, discount,
                is_new: isNew, is_featured: isFeatured, image, category, gender,
                description, sku, stock: stock !== undefined ? stock : 10,
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
        if (data.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product (Soft Delete / Archive)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') return res.status(404).json({ error: 'Product not found' });
            throw fetchError;
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
        if (count === 0) return res.status(404).json({ error: 'Product not found' });
        
        res.json({ message: 'Product archived and deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
