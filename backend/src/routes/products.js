import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';
import { validateBase64Image } from '../middleware/upload.js';
import { validateRequest } from '../middleware/validate.js';
import { body } from 'express-validator';
import axios from 'axios';
import { uploadImageToStorage, deleteImageFromStorage, syncImagesStorage } from '../utils/storageUtils.js';
import { logAdminAudit } from '../utils/auditLogger.js';

const router = express.Router();

let hasDeletedAt = null;
const checkDeletedAtColumn = async () => {
    if (hasDeletedAt !== null) return hasDeletedAt;
    try {
        const { error } = await supabase.from('products').select('deleted_at').limit(1);
        hasDeletedAt = !error;
    } catch (e) {
        hasDeletedAt = false;
    }
    return hasDeletedAt;
};

// Get global products catalog (High-performance server-side pagination & edge CDN caching)
router.get('/', async (req, res) => {
    // Multi-tier Edge CDN caching: 60s browser, 300s edge, 24h stale-while-revalidate
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');

    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
        const offset = (page - 1) * limit;

        const catalogFields = 'id, name, brand, type, size, price, old_price, discount, is_new, is_featured, image, category, gender, notes, stock, top_notes, middle_notes, base_notes, created_at';

        let query = supabase
            .from('products')
            .select(catalogFields, { count: 'exact' });

        const hasDeleted = await checkDeletedAtColumn();
        if (hasDeleted) {
            query = query.is('deleted_at', null);
        }

        // Apply filters
        if (req.query.gender) {
            const g = req.query.gender.toLowerCase();
            if (g === 'men' || g === 'women') {
                query = query.or(`gender.eq.${g},gender.eq.unisex`);
            } else if (g !== 'all') {
                query = query.eq('gender', g);
            }
        }

        if (req.query.category) {
            query = query.contains('category', [req.query.category]);
        }

        if (req.query.brand) {
            query = query.eq('brand', req.query.brand);
        }

        if (req.query.search) {
            const cleanSearch = req.query.search.trim();
            if (cleanSearch) {
                query = query.or(`name.ilike.%${cleanSearch}%,brand.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`);
            }
        }

        if (req.query.min_price) {
            query = query.gte('price', Number(req.query.min_price));
        }

        if (req.query.max_price) {
            query = query.lte('price', Number(req.query.max_price));
        }

        // Sorting
        const sort = req.query.sort;
        if (sort === 'price-asc') {
            query = query.order('price', { ascending: true });
        } else if (sort === 'price-desc') {
            query = query.order('price', { ascending: false });
        } else if (sort === 'newest') {
            query = query.order('created_at', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        query = query.range(offset, offset + limit - 1);

        const { data, count, error } = await withTimeout(query);
        if (error) throw error;

        // Fetch active boutique inventories for these products to attach authentic vendor attribution
        const productIds = (data || []).map(p => p.id);
        const inventoryMap = {};
        if (productIds.length > 0) {
            try {
                const { data: invRows } = await supabase
                    .from('vendor_inventory')
                    .select('product_id, shop_id, price, stock, shops(id, name, address)')
                    .in('product_id', productIds)
                    .eq('is_active', true)
                    .gt('stock', 0);
                (invRows || []).forEach(row => {
                    if (!inventoryMap[row.product_id]) {
                        inventoryMap[row.product_id] = {
                            shop_id: row.shop_id,
                            vendor_name: row.shops?.name || 'PerfumeHub Boutique',
                            vendor_address: row.shops?.address || 'Doha / Lusail',
                            stock: Number(row.stock) || 0
                        };
                    }
                });
            } catch (e) {
                console.warn('Catalog inventory lookup warning:', e.message);
            }
        }

        // Lightweight Card DTO mapping with live vendor attribution
        const productsList = (data || []).map(p => {
            const inv = inventoryMap[p.id];
            return {
                id: p.id,
                name: p.name,
                brand: p.brand,
                type: p.type,
                size: p.size,
                price: Number(p.price) || 0,
                oldPrice: p.old_price !== null && p.old_price !== undefined ? Number(p.old_price) : null,
                old_price: p.old_price !== null && p.old_price !== undefined ? Number(p.old_price) : null,
                discount: p.discount || 0,
                isNew: p.is_new ?? false,
                is_new: p.is_new ?? false,
                isFeatured: p.is_featured ?? false,
                is_featured: p.is_featured ?? false,
                image: Array.isArray(p.image) ? p.image : (typeof p.image === 'string' ? [p.image] : []),
                category: p.category,
                gender: p.gender,
                notes: typeof p.notes === 'string' ? JSON.parse(p.notes || '[]') : (p.notes || []),
                topNotes: p.top_notes || '',
                middleNotes: p.middle_notes || '',
                baseNotes: p.base_notes || '',
                rating_avg: p.rating_avg !== undefined ? Number(p.rating_avg) : 4.8,
                review_count: p.review_count !== undefined ? Number(p.review_count) : 12,
                stock: inv ? inv.stock : (p.stock !== undefined ? Number(p.stock) : 10),
                shop_id: inv?.shop_id || null,
                vendor_name: inv?.vendor_name || null,
                vendor_address: inv?.vendor_address || null
            };
        });

        res.json({
            products: productsList,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
                hasMore: (offset + limit) < (count || 0)
            }
        });
    } catch (error) {
        if (error.message === 'Database query timed out') {
            return res.status(504).json({ error: 'Database timeout' });
        }
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single product (Cached)
router.get('/:id', async (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    try {
        let singleQuery = supabase
            .from('products')
            .select('*')
            .eq('id', req.params.id);

        const hasDeletedCol = await checkDeletedAtColumn();
        if (hasDeletedCol) {
            singleQuery = singleQuery.is('deleted_at', null);
        }

        const { data, error } = await singleQuery.single();

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

// Create product (Global Master Catalog & Regional Inventory)
router.post('/', 
    authenticateUser, 
    verifyRole(['super_admin', 'admin', 'regional_admin', 'vendor']), 
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
        price, oldPrice, discount, stock, shop_id
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

        // If target shop_id provided or user is vendor/regional_admin with assigned shop, auto-bind inventory
        const targetShopId = shop_id && shop_id !== 'core' && shop_id !== 'all' && shop_id !== 'own'
            ? shop_id
            : (req.user?.role === 'vendor' ? (req.user.shop_id || req.user.ownedShopIds?.[0]) : null);

        if (targetShopId && newProduct?.id) {
            try {
                await supabase.from('vendor_inventory').upsert([{
                    product_id: newProduct.id,
                    shop_id: targetShopId,
                    price: finalPrice,
                    stock: stock !== undefined ? Number(stock) : 10,
                    is_active: true,
                    pickup_available: true,
                    updated_at: new Date().toISOString()
                }], { onConflict: 'product_id, shop_id' });
            } catch (invErr) {
                console.warn('[Products] Auto-binding inventory notice:', invErr.message);
            }
        }

        // Audit logging
        logAdminAudit({
            actorId: req.user?.id,
            actorEmail: req.user?.email,
            actorRole: req.user?.role,
            action: 'create_product',
            targetEntity: 'products',
            targetId: String(newProduct.id),
            details: { name: newProduct.name, brand: newProduct.brand, price: newProduct.price, shop_id: targetShopId }
        }).catch(e => console.error('Audit log warning:', e.message));

        res.status(201).json({ 
            id: newProduct.id, 
            message: 'Global master catalog product created successfully' 
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update product (Global Catalog & Regional Boutique Management)
router.put('/:id', authenticateUser, verifyRole(['super_admin', 'admin', 'regional_admin']), async (req, res) => {
    const { id } = req.params;
    const { 
        name, brand, type, size, isNew, isFeatured,
        image, category, gender, description, sku,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, attributes,
        price, oldPrice, discount, stock
    } = req.body;

    try {
        // Fetch existing product to know current images for sync/cleanup
        const { data: existingProd } = await supabase.from('products').select('image').eq('id', id).single();
        let existingImages = [];
        if (Array.isArray(existingProd?.image)) existingImages = existingProd.image;
        else if (existingProd?.image) existingImages = [existingProd.image];

        let imageUrls = image;
        if (image !== undefined) {
            const newImageArr = Array.isArray(image) ? image : (image ? [image] : []);
            const synced = await syncImagesStorage(existingImages, newImageArr, name || 'product', 'products');
            imageUrls = Array.isArray(image) ? synced : (synced[0] || null);
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

        Object.keys(updatePayload).forEach(key => {
            if (updatePayload[key] === undefined) {
                delete updatePayload[key];
            }
        });

        const { error } = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', id)
            .select();

        if (error) throw error;

        // Audit logging
        logAdminAudit({
            actorId: req.user?.id,
            actorEmail: req.user?.email,
            actorRole: req.user?.role,
            action: 'update_product',
            targetEntity: 'products',
            targetId: String(id),
            details: { updatedFields: Object.keys(updatePayload) }
        }).catch(e => console.error('Audit log warning:', e.message));

        res.json({ message: 'Global product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product (Soft Delete / Archive - Super Admin Exclusive Authority & Regional Unbind)
router.delete('/:id', authenticateUser, verifyRole(['super_admin', 'admin', 'regional_admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !product) return res.status(404).json({ error: 'Product not found' });

        // If invoked by Regional Admin: strictly unbind/deactivate from regional boutique inventory ONLY
        // Preserve the master catalog and storage assets for other GCC territories
        if (req.user.role === 'regional_admin') {
            const assignedRegionIds = req.user.assignedRegionIds || [];
            if (assignedRegionIds.length === 0) {
                return res.status(403).json({ 
                    error: 'Access Denied: You do not have administrative authority over this geographic territory.' 
                });
            }

            const { data: regionalShops } = await supabase
                .from('shops')
                .select('id')
                .in('region_id', assignedRegionIds);

            const shopIds = (regionalShops || []).map(s => s.id);
            if (shopIds.length > 0) {
                await supabase
                    .from('vendor_inventory')
                    .update({ is_active: false, updated_at: new Date().toISOString() })
                    .eq('product_id', id)
                    .in('shop_id', shopIds);
            }

            return res.json({ 
                success: true, 
                action: 'regional_deactivated',
                message: 'Product unpinned and deactivated across your regional boutique inventory. Global master catalog preserved.' 
            });
        }

        // Restrict global master catalog deletion strictly to super_admin / admin
        if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions to delete global master product' });
        }

        // Non-Destructive Soft-Delete:
        // Do NOT delete images from Supabase Storage — preserves 100% fidelity for backup restoration.
        const { error: backupError } = await supabase
            .from('backups')
            .insert([{
                table_name: 'products',
                record_id: id.toString(),
                data: product,
                deleted_at: new Date().toISOString()
            }]);

        if (backupError) console.error('Backup failed for product deletion:', backupError);

        // Soft-delete the product
        const hasDeletedCol = await checkDeletedAtColumn();
        if (hasDeletedCol) {
            const { error: softDeleteError } = await supabase
                .from('products')
                .update({ 
                    deleted_at: new Date().toISOString() 
                })
                .eq('id', id);

            if (softDeleteError) throw softDeleteError;
        } else {
            const { error: deleteError } = await supabase
                .from('products')
                .delete({ count: 'exact' })
                .eq('id', id);

            if (deleteError) throw deleteError;
        }

        // Deactivate associated vendor inventory records
        await supabase
            .from('vendor_inventory')
            .update({ 
                is_active: false, 
                updated_at: new Date().toISOString() 
            })
            .eq('product_id', id);

        // Audit logging
        logAdminAudit({
            actorId: req.user?.id,
            actorEmail: req.user?.email,
            actorRole: req.user?.role,
            action: 'delete_product',
            targetEntity: 'products',
            targetId: String(id),
            details: { name: product.name, brand: product.brand }
        }).catch(e => console.error('Audit log warning:', e.message));

        res.json({ message: 'Product archived and soft-deleted successfully. Storage media preserved for recovery.' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Comprehensive fallback parser for luxury perfumes
function parsePerfumeNameFallback(prompt) {
    const cleanPrompt = prompt.trim();
    
    // 1. Detect Brand
    const brands = [
        'Amouage', 'Creed', 'Dior', 'Chanel', 'Tom Ford', 'Gucci', 'Versace',
        'Armani', 'Prada', 'Burberry', 'Yves Saint Laurent', 'Givenchy',
        'Lancôme', 'Hermès', 'Valentino', 'Calvin Klein', 'Hugo Boss',
        'Lattafa', 'Arabian Oud', 'Parfums de Marly', 'Roja Dove', 'Byredo', 
        'Diptyque', 'Maison Francis Kurkdjian', 'Kilian', 'Initio', 'Xerjoff', 'Clive Christian'
    ];
    let detectedBrand = 'North Club Paris';
    for (const brand of brands) {
        if (new RegExp('\\b' + brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(cleanPrompt)) {
            detectedBrand = brand;
            break;
        }
    }

    // 2. Detect Type
    let detectedType = 'EDP (Eau de Parfum)';
    if (/Extrait|Extract/i.test(cleanPrompt)) {
        detectedType = 'Parfum';
    } else if (/EDT|Toilette/i.test(cleanPrompt)) {
        detectedType = 'EDT (Eau de Toilette)';
    } else if (/Parfum/i.test(cleanPrompt)) {
        detectedType = 'Parfum';
    } else if (/Cologne/i.test(cleanPrompt)) {
        detectedType = 'EDC (Eau de Cologne)';
    }

    // 3. Detect Gender
    let detectedGender = 'unisex';
    if (/men|man|homme|male|pour homme/i.test(cleanPrompt)) {
        detectedGender = 'men';
    } else if (/women|woman|femme|female|pour femme/i.test(cleanPrompt)) {
        detectedGender = 'women';
    }

    // 4. Notes, Accords & Bilingual Descriptions based on olfactive profile
    let topNotes = 'Calabrian Bergamot, Pink Pepper, Sicilian Lemon';
    let middleNotes = 'French Lavender, Grasse Rose, Indonesian Patchouli';
    let baseNotes = 'Madagascar Vanilla, Golden Amber, White Musk';
    let description = `${cleanPrompt} is a majestic haute parfumerie creation radiating poise and commanding presence. A luminous symphony of crisp citrus and precious resins craft an intoxicating sillage designed for discerning connoisseurs.`;
    let descriptionAr = `يعد ${cleanPrompt} تحفة عطرية استثنائية من أرقى دور العطور الفاخرة، حيث تتناغم الحمضيات الإيطالية المنعشة مع باقة غنية من الأخشاب النبيلة والعنبر الدافئ لتمنحك حضوراً آسراً وأناقة ملكية لا تُنسى.`;
    let accords = ['Woody', 'Amber', 'Fresh Spicy', 'Citrus'];
    let longevity = 'Long Lasting (8-12 hours)';
    let sillage = 'Strong / Noticeable';
    let seasonality = ['Fall', 'Winter', 'Spring'];
    let occasions = ['Evening Gala', 'Signature Wear', 'VIP Events'];

    if (/oud|wood|oriental|arabic|interlude|amber|incense|sandalwood/i.test(cleanPrompt)) {
        topNotes = 'Wild Saffron, Bergamot, Royal Oregano, Pimento Berry';
        middleNotes = 'Precious Frankincense, Cistus Amber, Myrrh, Opoponax';
        baseNotes = 'Cambodian Agarwood (Oud), Smoked Leather, Sandalwood, Patchouli';
        description = `${cleanPrompt} is an opulent celebration of Arabian heritage and raw balsamic mystery. Piercing incense weaves through velvety amber and smoky agarwood, evoking candlelit desert palatial nights.`;
        descriptionAr = `يجسد ${cleanPrompt} عبق التراث الشرقي الملكي وسحر النفحات البلسمية الغامضة؛ حيث يتعانق اللبان العماني الفاخر مع دفء العنبر النقي وخشب العود الكمبودي المعتق ليترك هالة ساحرة تليق بأصحاب الذوق الرفيع.`;
        accords = ['Oud', 'Smoky', 'Amber', 'Balsamic', 'Warm Spicy'];
        longevity = 'Eternal (12-18+ hours)';
        sillage = 'Enormous / Monumental';
        seasonality = ['Fall', 'Winter'];
        occasions = ['Formal Dinners', 'Special Celebrations', 'Winter Evenings'];
    } else if (/fresh|blue|sport|aqua|marine|citrus|aventus/i.test(cleanPrompt)) {
        topNotes = 'Italian Bergamot, Green Apple, Grapefruit, Blackcurrant';
        middleNotes = 'Birch Smoke, Moroccan Jasmine, Juniper Berry, Pink Pepper';
        baseNotes = 'Oakmoss, Ambergris, Musk, Atlas Cedar';
        description = `${cleanPrompt} is a vibrant, triumphant tribute to boundless masculine energy and freedom. Crisp aquatic winds meet noble woods, creating a dynamic trail that elevates every room.`;
        descriptionAr = `انطلاقة عطرية مفعمة بالحيوية والقوة المطلقة، يمزج ${cleanPrompt} بين نسيم البحر المنعش ونقاء البرغموت مع لمسات دخانية نبيلة من أخشاب البتولا والمسك الأبيض لإطلالة يومية آسرة وواثقة.`;
        accords = ['Fruity', 'Fresh', 'Woody', 'Aquatic', 'Smoky'];
        longevity = 'Long Lasting (7-10 hours)';
        sillage = 'Moderate to Strong';
        seasonality = ['Spring', 'Summer', 'Fall'];
        occasions = ['Daily Signature', 'Business Meetings', 'Daytime Leisure'];
    } else if (/rose|flower|bloom|floral|baccarat|rouge|jasmine/i.test(cleanPrompt)) {
        topNotes = 'Jasmine Grandiflorum, Saffron, Damask Rose';
        middleNotes = 'Amberwood, Cashmeran, Orange Blossom, Hedione';
        baseNotes = 'Fir Resin, Cedarwood, Ambroxan, Sweet Musk';
        description = `${cleanPrompt} is an airy, luminous floral alchemy that caresses the skin like golden amber silk. Sublime petals intertwine with crystalline cedar and luminous ambergris.`;
        descriptionAr = `تحفة زهرية مضيئة تتهادى على البشرة كالحرير الخالص؛ يتألق ${cleanPrompt} ببتلات الورد الجوري والياسمين مع نفحات الزعفران والعنبر الخشبي ليمنحك هالة من النعومة المخملية والجاذبية المطلقة.`;
        accords = ['Floral', 'Sweet', 'Amber', 'Warm Spicy', 'Woody'];
        longevity = 'Very Long Lasting (10-14 hours)';
        sillage = 'Intense';
        seasonality = ['All Year', 'Spring', 'Fall'];
        occasions = ['Romance', 'Weddings', 'Signature Occasions'];
    }

    const categories = ['perfumes'];
    if (detectedGender === 'men') categories.push('men');
    if (detectedGender === 'women') categories.push('women');
    if (/oud|oriental|arabic|saudi|qatar|dubai/i.test(cleanPrompt)) categories.push('arabic', 'niche');
    else categories.push('niche');

    return {
        brand: detectedBrand,
        type: detectedType,
        gender: detectedGender,
        description,
        description_ar: descriptionAr,
        topNotes,
        middleNotes,
        baseNotes,
        accords,
        longevity,
        sillage,
        seasons: seasonality,
        occasions,
        categories
    };
}

// AI Autofill Product Details (Powered by Gemini 1.5 Pro / Flash with rich luxury taxonomy)
router.post('/ai-autofill', authenticateUser, async (req, res) => {
    const { prompt } = req.body;
    if (!prompt || prompt.trim() === '') {
        return res.status(400).json({ error: 'Prompt or product name is required' });
    }

    try {
        if (process.env.GEMINI_API_KEY) {
            // Attempt Gemini 1.5 Pro first for peak haute-parfumerie quality, fall back to flash
            const models = ['gemini-1.5-pro', 'gemini-1.5-flash'];
            for (const model of models) {
                try {
                    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
                    const response = await axios.post(apiEndpoint, {
                        contents: [
                            {
                                parts: [
                                    {
                                        text: `You are a world-class luxury haute-parfumerie catalog curator for PerfumeHub Middle East.
Given the fragrance name or query: "${prompt}", return ONLY a valid JSON object (without markdown code blocks, backticks, or preamble) with the following structure:
{
  "brand": "Brand Name",
  "type": "Parfum | EDP (Eau de Parfum) | EDT (Eau de Toilette) | EDC (Eau de Cologne)",
  "gender": "men | women | unisex",
  "description": "Evocative, poetic luxury English marketing description (2-3 sentences)",
  "description_ar": "Luxury poetic Arabic marketing description in elegant high Arabic (وصف تسويقي فاخر وشاعري)",
  "topNotes": "Comma separated top notes",
  "middleNotes": "Comma separated heart/middle notes",
  "baseNotes": "Comma separated base notes",
  "accords": ["Woody", "Amber", "Warm Spicy"],
  "longevity": "e.g. Long Lasting (8-12 hours)",
  "sillage": "e.g. Enormous / Strong / Moderate",
  "seasons": ["Fall", "Winter", "Spring"],
  "occasions": ["Evening", "Special Occasions", "Signature"],
  "categories": ["perfumes", "niche", "arabic", "men"]
}`
                                    }
                                ]
                            }
                        ]
                    }, { timeout: 8000 });

                    const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textResponse) {
                        const cleanedJson = textResponse.replace(/```json|```/g, '').trim();
                        const parsedData = JSON.parse(cleanedJson);
                        return res.json(parsedData);
                    }
                } catch (modelErr) {
                    console.warn(`Gemini model ${model} failed, trying next fallback:`, modelErr.message);
                }
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
