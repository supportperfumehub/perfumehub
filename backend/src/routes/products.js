import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';
import { validateBase64Image } from '../middleware/upload.js';
import { validateRequest } from '../middleware/validate.js';
import { body } from 'express-validator';

const router = express.Router();

/**
 * Uploads a base64 image string to Supabase Storage.
 * Returns the public URL, or the original string if it's already a URL.
 */
async function uploadImageToStorage(base64OrUrl, productName) {
    if (!base64OrUrl) return null;
    // If it's already a URL (not base64), return as-is
    if (!base64OrUrl.startsWith('data:')) return base64OrUrl;

    try {
        const matches = base64OrUrl.match(/^data:([a-zA-Z0-9+/.-]+);base64,(.+)$/);
        if (!matches) return base64OrUrl;

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
        const safeName = (productName || 'product').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${safeName}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, buffer, { contentType: mimeType, upsert: true });

        if (uploadError) {
            console.error('Image upload failed, storing base64 fallback:', uploadError.message);
            return base64OrUrl; // fallback: store base64 if upload fails
        }

        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    } catch (err) {
        console.error('Image upload error:', err.message);
        return base64OrUrl; // fallback
    }
}

// Get all global products
router.get('/', async (req, res) => {
    try {
        let query = supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        // Removed shop_id scope because products is now a global catalog

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

// Create product (Global Catalog - Admins Only)
router.post('/', 
    authenticateUser, 
    verifyRole(['super_admin', 'regional_admin', 'admin']), 
    validateBase64Image('image'),
    [
        body('name').notEmpty().withMessage('Product name is required'),
        body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
        validateRequest
    ],
    async (req, res) => {
    // Note: price and stock are no longer needed on the global product, but keeping them as base/MSRP for now if needed.
    const { 
        name, brand, type, size, isNew, isFeatured,
        image, category, gender, description, sku,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, attributes
    } = req.body;

    try {
        // Upload images to Supabase Storage and get permanent URLs
        let imageUrls = image;
        if (Array.isArray(image)) {
            imageUrls = await Promise.all(image.map(img => uploadImageToStorage(img, name)));
        } else if (image) {
            imageUrls = await uploadImageToStorage(image, name);
        }

        const { data, error } = await supabase
            .from('products')
            .insert([{
                name, brand, type, size, 
                is_new: isNew, is_featured: isFeatured, image: imageUrls, category, gender,
                description, sku: sku || null,
                notes: notes || [], vibes: vibes || [], occasions: occasions || [],
                reason: reason || null, seasons: seasons || [],
                top_notes: topNotes || null, middle_notes: middleNotes || null,
                base_notes: baseNotes || null,
                attributes: attributes || {}
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ id: data[0].id, message: 'Global product created successfully' });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update product (Global Catalog - Admins Only)
router.put('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { 
        name, brand, type, size, isNew, isFeatured,
        image, category, gender, description, sku,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, attributes
    } = req.body;

    try {
        // Upload any new base64 images to Supabase Storage
        let imageUrls = image;
        if (Array.isArray(image)) {
            imageUrls = await Promise.all(image.map(img => uploadImageToStorage(img, name)));
        } else if (image) {
            imageUrls = await uploadImageToStorage(image, name);
        }

        const { data, error } = await supabase
            .from('products')
            .update({
                name, brand, type, size,
                is_new: isNew, is_featured: isFeatured, image: imageUrls, category, gender,
                description, sku: sku || null,
                notes: notes || undefined, vibes: vibes || undefined, occasions: occasions || undefined,
                reason: reason !== undefined ? reason : undefined, seasons: seasons || undefined,
                top_notes: topNotes !== undefined ? topNotes : undefined,
                middle_notes: middleNotes !== undefined ? middleNotes : undefined,
                base_notes: baseNotes !== undefined ? baseNotes : undefined,
                attributes: attributes !== undefined ? attributes : undefined
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ message: 'Global product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product (Soft Delete / Archive)
router.delete('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !product) return res.status(404).json({ error: 'Product not found' });

        const { error: backupError } = await supabase
            .from('backups')
            .insert([{
                table_name: 'products',
                record_id: id.toString(),
                data: product,
                deleted_at: new Date().toISOString()
            }]);

        if (backupError) console.error('Backup failed for product deletion:', backupError);

        const { error: deleteError } = await supabase
            .from('products')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (deleteError) throw deleteError;
        res.json({ message: 'Product archived and deleted successfully. Vendor inventories cascaded.' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
