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
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    try {
        let productIds = null;
        if (req.query.region_id && req.query.all !== 'true') {
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
                
                productIds = activeProductInvs ? [...new Set(activeProductInvs.map(item => item.product_id))] : [];
                if (productIds.length === 0) return res.json([]);
            } else {
                return res.json([]);
            }
        }

        let allProducts = [];
        let page = 0;
        const pageSize = 1000;

        while (true) {
            let pQuery = supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (productIds !== null) {
                pQuery = pQuery.in('id', productIds);
            }

            pQuery = pQuery.range(page * pageSize, (page + 1) * pageSize - 1);

            const { data, error } = await withTimeout(pQuery);
            if (error) throw error;
            if (!data || data.length === 0) break;
            allProducts = allProducts.concat(data);
            if (data.length < pageSize) break;
            page++;
        }

        res.json(allProducts);
    } catch (error) {
        if (error.message === 'Database query timed out') {
            return res.status(504).json({ error: 'Database timeout' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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
    const { 
        name, brand, type, size, isNew, isFeatured,
        image, category, gender, description, sku,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, attributes,
        price, oldPrice, discount, stock
    } = req.body;

    try {
        // Upload images to Supabase Storage and get permanent URLs
        let imageUrls = image;
        if (Array.isArray(image)) {
            imageUrls = await Promise.all(image.map(img => uploadImageToStorage(img, name)));
        } else if (image) {
            imageUrls = await uploadImageToStorage(image, name);
        }

        const finalPrice = price !== undefined ? Number(price) : 0;
        const finalOldPrice = oldPrice !== undefined && oldPrice !== null && oldPrice !== '' ? Number(oldPrice) : null;
        let finalDiscount = discount !== undefined ? Number(discount) : 0;
        if (finalOldPrice && finalOldPrice > finalPrice) {
            finalDiscount = Math.round((1 - finalPrice / finalOldPrice) * 100);
        }

        let formattedSizes = Array.isArray(size) ? size : (typeof size === 'string' && size ? [size] : []);
        if (formattedSizes.length > 0) {
            formattedSizes = formattedSizes.map((sz, idx) => {
                if (idx === 0 || formattedSizes.length === 1) {
                    return typeof sz === 'object'
                        ? { ...sz, price: finalPrice, oldPrice: finalOldPrice, discount: finalDiscount }
                        : { name: sz, price: finalPrice, oldPrice: finalOldPrice, discount: finalDiscount };
                }
                return sz;
            });
        }

        const { data, error } = await supabase
            .from('products')
            .insert([{
                name, brand, type, 
                size: formattedSizes, 
                price: finalPrice,
                old_price: finalOldPrice,
                discount: finalDiscount,
                stock: stock !== undefined ? Number(stock) : 10,
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
        const newProduct = data[0];

        // Automatically bind newly created product to active shops so it instantly lists on the site
        try {
            const { data: activeShops } = await supabase.from('shops').select('id').eq('status', 'ACTIVE');
            if (activeShops && activeShops.length > 0) {
                const inventoryRows = activeShops.map(s => ({
                    product_id: newProduct.id,
                    shop_id: s.id,
                    price: price !== undefined ? Number(price) : 0,
                    stock: stock !== undefined ? Number(stock) : 10,
                    is_active: true,
                    pickup_available: true,
                    updated_at: new Date().toISOString()
                }));
                await supabase
                    .from('vendor_inventory')
                    .upsert(inventoryRows, { onConflict: 'product_id, shop_id' });
            }
        } catch (invErr) {
            console.error('Auto inventory binding warning:', invErr.message);
        }

        res.status(201).json({ id: newProduct.id, message: 'Global product created and automatically bound to shop inventory successfully' });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update product (Global Catalog / Vendor inventory)
router.put('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin', 'vendor']), async (req, res) => {
    const { id } = req.params;
    const { 
        name, brand, type, size, isNew, isFeatured,
        image, category, gender, description, sku,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, attributes,
        price, oldPrice, discount, stock
    } = req.body;

    try {
        // Upload any new base64 images to Supabase Storage
        let imageUrls = image;
        if (Array.isArray(image)) {
            imageUrls = await Promise.all(image.map(img => uploadImageToStorage(img, name)));
        } else if (image) {
            imageUrls = await uploadImageToStorage(image, name);
        }

        const updatePayload = {
            name, brand, type, size,
            is_new: isNew, is_featured: isFeatured, image: imageUrls, category, gender,
            description, sku: sku || null,
            notes: notes || undefined, vibes: vibes || undefined, occasions: occasions || undefined,
            reason: reason !== undefined ? reason : undefined, seasons: seasons || undefined,
            top_notes: topNotes !== undefined ? topNotes : undefined,
            middle_notes: middleNotes !== undefined ? middleNotes : undefined,
            base_notes: baseNotes !== undefined ? baseNotes : undefined,
            attributes: attributes !== undefined ? attributes : undefined
        };

        if (price !== undefined) updatePayload.price = Number(price);
        if (oldPrice !== undefined) updatePayload.old_price = oldPrice !== null && oldPrice !== '' ? Number(oldPrice) : null;

        // Auto-calculate discount percentage whenever price or oldPrice changes
        if (updatePayload.price !== undefined || updatePayload.old_price !== undefined) {
            const finalP = updatePayload.price !== undefined ? updatePayload.price : Number(req.body.price || 0);
            const finalOldP = updatePayload.old_price !== undefined ? updatePayload.old_price : (req.body.oldPrice ? Number(req.body.oldPrice) : null);
            
            if (finalOldP && Number(finalOldP) > Number(finalP)) {
                updatePayload.discount = Math.round((1 - Number(finalP) / Number(finalOldP)) * 100);
            } else {
                updatePayload.old_price = null;
                updatePayload.discount = 0;
            }

            // Synchronize size variant price if size exists
            if (Array.isArray(updatePayload.size) && updatePayload.size.length > 0) {
                updatePayload.size = updatePayload.size.map((sz, idx) => {
                    if (idx === 0 || updatePayload.size.length === 1) {
                        return typeof sz === 'object'
                            ? { ...sz, price: finalP, oldPrice: updatePayload.old_price, discount: updatePayload.discount }
                            : { name: sz, price: finalP, oldPrice: updatePayload.old_price, discount: updatePayload.discount };
                    }
                    return sz;
                });
            }
        } else if (discount !== undefined) {
            updatePayload.discount = Number(discount);
        }
        if (stock !== undefined) updatePayload.stock = Number(stock);

        const { error } = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', id)
            .select();

        if (error) throw error;

        // Synchronize linked vendor inventory prices
        if (price !== undefined) {
            await supabase
                .from('vendor_inventory')
                .update({ price: Number(price), updated_at: new Date().toISOString() })
                .eq('product_id', id);
        }

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
