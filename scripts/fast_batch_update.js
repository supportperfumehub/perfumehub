import { supabase } from '../backend/src/config/supabaseClient.js';

function decodeXml(str) {
    if (!str) return '';
    return str
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code));
}

function detectGender(name) {
    const n = ' ' + name.toLowerCase() + ' ';
    if (/\b(w|femme|women|woman|her|girl|pour femme|mademoiselle|she|female)\b/i.test(n)) {
        return 'women';
    }
    if (/\b(m|homme|men|man|him|pour homme|ph|he|male)\b/i.test(n)) {
        return 'men';
    }
    return 'unisex';
}

function detectCategory(brand, name) {
    const combined = (brand + ' ' + name).toLowerCase();
    const ARABIC_KEYWORDS = ['oud', 'musk', 'muscs', 'amber', 'attar', 'oriental', 'bakhoor', 'taif', 'zarian', 'safran', 'lattafa', 'ahmed al maghribi', 'ajmal', 'rasasi'];
    const isArabic = ARABIC_KEYWORDS.some(k => combined.includes(k));
    if (isArabic) {
        return ['perfume', 'arabic', 'luxury'];
    }
    return ['perfume', 'luxury'];
}

async function run() {
    console.log("=== FAST BATCH UPDATING ALL 2,024 PRODUCTS IN SUPABASE ===");

    // Fetch all existing products from DB
    let allProducts = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    while (true) {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, brand, size, price, sku, stock, shop_id')
            .range(from, from + PAGE_SIZE - 1);
        if (error) {
            console.error('Fetch error:', error);
            process.exit(1);
        }
        allProducts.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }

    console.log(`Fetched ${allProducts.length} products from database.`);

    const FEATURED_BRANDS = new Set([
        'Chanel', 'Dior', 'Creed', 'Tom Ford', 'Yves Saint Laurent', 
        'Bvlgari', 'Alexandre J', 'Kilian', 'Xerjoff', 'Parfums De Marly',
        'Paco Rabanne', 'Versace', 'Giorgio Armani', 'Carolina Herrera'
    ]);

    const BATCH_SIZE = 100;
    let updatedCount = 0;

    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
        const batch = allProducts.slice(i, i + BATCH_SIZE);
        
        const upsertRows = batch.map(p => {
            const cleanBrand = decodeXml(p.brand || '');
            const cleanName = decodeXml(p.name || '');
            
            let cleanSize = ['100ml'];
            if (p.size) {
                if (Array.isArray(p.size)) {
                    cleanSize = p.size;
                } else if (typeof p.size === 'string') {
                    try {
                        const parsed = JSON.parse(p.size);
                        cleanSize = Array.isArray(parsed) ? parsed : [String(parsed)];
                    } catch (_) {
                        cleanSize = [p.size.replace(/[\[\]"']/g, '').trim()];
                    }
                }
            }

            const placeholderImg = `https://placehold.co/400x500/1a1a1a/d4af37?text=${encodeURIComponent(cleanBrand + ' ' + cleanName)}`;
            const gender = detectGender(cleanName);
            const category = detectCategory(cleanBrand, cleanName);
            const isFeatured = FEATURED_BRANDS.has(cleanBrand);

            return {
                id: p.id,
                name: cleanName,
                brand: cleanBrand,
                size: cleanSize,
                price: p.price,
                sku: p.sku,
                stock: p.stock,
                shop_id: p.shop_id || 'a2acdb78-9838-4bc0-8bc9-f69b638bc395',
                image: [placeholderImg],
                gender: gender,
                category: category,
                is_new: true,
                is_featured: isFeatured,
                description: `${cleanName} by ${cleanBrand}. Luxury authentic fragrance available at PerfumeHub Qatar with same-day express delivery.`,
                updated_at: new Date().toISOString()
            };
        });

        const { error: uErr } = await supabase
            .from('products')
            .upsert(upsertRows, { onConflict: 'id' });

        if (uErr) {
            console.error(`Error updating batch ${i / BATCH_SIZE + 1}:`, uErr.message);
            process.exit(1);
        }

        updatedCount += upsertRows.length;
        console.log(`Updated batch ${i / BATCH_SIZE + 1}/${Math.ceil(allProducts.length / BATCH_SIZE)} (${updatedCount}/${allProducts.length})`);
    }

    console.log(`\n=== FAST UPDATE COMPLETE: All ${updatedCount} products updated successfully! ===`);
    process.exit(0);
}

run().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
