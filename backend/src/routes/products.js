import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';
import { validateBase64Image } from '../middleware/upload.js';
import { validateRequest } from '../middleware/validate.js';
import { body } from 'express-validator';
import axios from 'axios';

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

        if (req.query.region_id) {
            // Get all product IDs that have active inventory in this region using fast sequential key lookups
            const { data: regionShops } = await supabase
                .from('shops')
                .select('id')
                .eq('region_id', req.query.region_id);
            
            const shopIds = regionShops ? regionShops.map(s => s.id) : [];
            if (shopIds.length > 0) {
                const { data: activeProductInvs } = await supabase
                    .from('vendor_inventory')
                    .select('product_id')
                    .eq('is_active', true)
                    .in('shop_id', shopIds);
                
                const productIds = activeProductInvs ? [...new Set(activeProductInvs.map(item => item.product_id))] : [];
                query = query.in('id', productIds);
            } else {
                return res.json([]);
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

// Fallback helper function to parse perfume name locally
function parsePerfumeNameFallback(prompt) {
    const cleanPrompt = prompt.trim();
    
    // 1. Detect Brand
    const brands = [
        'Creed', 'Dior', 'Chanel', 'Tom Ford', 'Gucci', 'Versace',
        'Armani', 'Prada', 'Burberry', 'Yves Saint Laurent', 'Givenchy',
        'Lancôme', 'Hermès', 'Valentino', 'Calvin Klein', 'Hugo Boss',
        'Lattafa', 'Arabian Oud', 'Marly', 'Roja', 'Byredo', 'Diptyque', 'Amouage'
    ];
    let detectedBrand = 'North Club Paris';
    for (const brand of brands) {
        if (new RegExp('\\b' + brand + '\\b', 'i').test(cleanPrompt)) {
            detectedBrand = brand;
            break;
        }
    }

    // 2. Detect Type
    let detectedType = 'EDP (Eau de Parfum)';
    if (/EDT|Toilette/i.test(cleanPrompt)) {
        detectedType = 'EDT (Eau de Toilette)';
    } else if (/Parfum/i.test(cleanPrompt)) {
        detectedType = 'EDP (Eau de Parfum)';
    } else if (/Cologne/i.test(cleanPrompt)) {
        detectedType = 'Cologne';
    }

    // 3. Detect Gender
    let detectedGender = 'unisex';
    if (/men|man|homme|male/i.test(cleanPrompt)) {
        detectedGender = 'men';
    } else if (/women|woman|femme|female/i.test(cleanPrompt)) {
        detectedGender = 'women';
    }

    // 4. Notes & Description based on common names
    let topNotes = 'Bergamot, Lemon, Pepper';
    let middleNotes = 'Patchouli, Pineapple, Rose';
    let baseNotes = 'Musk, Ambergris, Vanilla';
    let description = `${cleanPrompt} is a premium luxury fragrance featuring a masterfully blended aromatic profile. Perfect for any special occasion.`;

    if (/oud|wood|oriental|arabic/i.test(cleanPrompt)) {
        topNotes = 'Saffron, Rose, Aromatic Spices';
        middleNotes = 'Agarwood (Oud), Amberwood, Patchouli';
        baseNotes = 'Sandalwood, Incense, Leather';
        description = `${cleanPrompt} is an exquisite, deep woody oriental fragrance with rich, warm accords of premium agarwood and exotic spices.`;
    } else if (/fresh|blue|sport|aqua/i.test(cleanPrompt)) {
        topNotes = 'Grapefruit, Mint, Sea Notes';
        middleNotes = 'Ginger, Jasmine, Nutmeg';
        baseNotes = 'Cedar, Vetiver, Frankincense';
        description = `${cleanPrompt} is a clean, fresh, and energetic fragrance designed for active lifestyles and refreshing daytime wear.`;
    } else if (/rose|flower|bloom|floral/i.test(cleanPrompt)) {
        topNotes = 'Jasmine, Peony, Freesia';
        middleNotes = 'Damask Rose, Magnolia, Lily of the Valley';
        baseNotes = 'White Musk, Amber, Cedarwood';
        description = `${cleanPrompt} is a beautifully elegant, romantic floral fragrance with a delicate bouquet of fresh roses and luxurious jasmine.`;
    }

    // Categories
    const categories = ['perfumes'];
    if (detectedGender === 'men') categories.push('men');
    if (detectedGender === 'women') categories.push('women');
    if (/arabic|oud/i.test(cleanPrompt)) categories.push('arabic');

    return {
        brand: detectedBrand,
        type: detectedType,
        gender: detectedGender,
        description,
        topNotes,
        middleNotes,
        baseNotes,
        categories
    };
}

// AI Autofill Product Details
router.post('/ai-autofill', authenticateUser, async (req, res) => {
    const { prompt } = req.body;
    if (!prompt || prompt.trim() === '') {
        return res.status(400).json({ error: 'Prompt or product name is required' });
    }

    try {
        if (process.env.GEMINI_API_KEY) {
            const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
            const response = await axios.post(apiEndpoint, {
                contents: [
                    {
                        parts: [
                            {
                                text: `You are a perfume database expert. Given the perfume name or description: "${prompt}", return a JSON object with:
                                - brand: (string)
                                - type: (EDP (Eau de Parfum), EDT (Eau de Toilette), Parfum, Cologne, etc.)
                                - gender: (men, women, unisex)
                                - description: (short description, 2-3 sentences max)
                                - topNotes: (comma separated list of top notes)
                                - middleNotes: (comma separated list of middle notes)
                                - baseNotes: (comma separated list of base notes)
                                - categories: (array of lowercase matching categories, e.g. ["perfumes", "arabic", "men", "women"])
                                Only return the raw JSON object, without any markdown formatting tags (do not wrap in \`\`\`json).`
                            }
                        ]
                    }
                ]
            });

            const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
                const cleanedJson = textResponse.replace(/```json|```/g, '').trim();
                const parsedData = JSON.parse(cleanedJson);
                return res.json(parsedData);
            }
        }

        const fallbackData = parsePerfumeNameFallback(prompt);
        return res.json(fallbackData);
    } catch (error) {
        console.error('AI Autofill Error:', error.message);
        const fallbackData = parsePerfumeNameFallback(prompt);
        return res.json(fallbackData);
    }
});

export default router;
