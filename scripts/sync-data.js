import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { mockProducts } from '../src/data/mockData.js';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const force = process.argv.includes('--force');

async function syncData() {
    console.log('\n--- Fetching Existing Products ---');
    const { data: existingProducts, error: fetchError } = await supabase.from('products').select('id, name');
    if (fetchError) {
        console.error('Error fetching existing products:', fetchError.message);
        return;
    }
    const nameToId = new Map(existingProducts.map(p => [p.name, p.id]));
    console.log(`Found ${existingProducts.length} existing products.`);

    console.log('\n--- Fetching Existing Coupons ---');
    const { data: existingCoupons, error: fetchCError } = await supabase.from('coupons').select('id, code');
    if (fetchCError) {
        console.error('Error fetching existing coupons:', fetchCError.message);
        return;
    }
    const codeToCId = new Map(existingCoupons.map(c => [c.code, c.id]));

    console.log('\n--- Syncing Data with Full Metadata ---');
    if (force) console.log('FORCE MODE: Overwriting existing data.');
    else console.log('SAFE MODE: Skipping existing products to protect manual changes.');

    // Products from mockData.js are now imported directly at the top

    // Coupons from ShopContext.jsx
    const mockCoupons = [
        { code: 'WELCOME10', discountType: 'percentage', discountValue: 10, expiryDate: '2026-12-31', isActive: true, usageLimit: 100 },
        { code: 'FREESHIP', discountType: 'percentage', discountValue: 5, expiryDate: '2026-06-30', isActive: true, usageLimit: 50 },
        { code: 'SUPER90', discountType: 'percentage', discountValue: 90, expiryDate: '2027-12-31', isActive: true, usageLimit: 10 },
        { code: 'LUCKY25', discountType: 'percentage', discountValue: 25, expiryDate: '2026-12-31', isActive: true, usageLimit: 1000 }
    ];

    for (const p of mockProducts) {
        if (nameToId.has(p.name) && !force) {
            console.log(`Skipping existing product: ${p.name}`);
            continue;
        }

        const payload = {
            name: p.name,
            brand: p.brand,
            type: p.type || "Eau de Parfum",
            size: p.size || "100ml",
            price: p.price,
            old_price: p.oldPrice || null,
            discount: p.discount || null,
            is_new: p.isNew || false,
            image: Array.isArray(p.image) ? p.image : [p.image],
            category: p.category || [],
            gender: p.gender || 'unisex',
            description: p.description || p.notes?.join(', ') || '',
            stock: p.stock || 10,
            notes: p.notes || [],
            vibes: p.vibes || [],
            occasions: p.occasions || [],
            seasons: p.seasons || [],
            sku: `MOCK-${p.brand.substring(0,3).toUpperCase()}-${p.name.substring(0,3).toUpperCase()}`,
            attributes: p.attributes || {}
        };

        if (nameToId.has(p.name)) {
            payload.id = nameToId.get(p.name);
        }

        const { error } = await supabase.from('products').upsert(payload);
        if (error) {
            console.error(`Error syncing ${p.name}:`, error.message);
        } else {
            console.log(`Synced product: ${p.name}`);
        }
    }

    for (const c of mockCoupons) {
        if (codeToCId.has(c.code) && !force) {
            console.log(`Skipping existing coupon: ${c.code}`);
            continue;
        }

        const payload = {
            code: c.code,
            discount_percentage: c.discountValue,
            is_active: c.isActive,
            discount_type: c.discountType,
            discount_value: c.discountValue,
            expiry_date: c.expiryDate,
            usage_limit: c.usageLimit
        };

        if (codeToCId.has(c.code)) {
            payload.id = codeToCId.get(c.code);
        }

        const { error } = await supabase.from('coupons').upsert(payload);
        if (error) {
            console.error(`Error syncing coupon ${c.code}:`, error.message);
        } else {
            console.log(`Synced coupon: ${c.code}`);
        }
    }
}

async function syncExternalData() {
    console.log('\n--- Syncing External Fragrances ---');
    
    const { data: existingProducts, error: fetchError } = await supabase.from('products').select('id, name');
    if (fetchError) {
        console.error('Error fetching existing products for external sync:', fetchError.message);
        return;
    }
    const nameToId = new Map(existingProducts.map(p => [p.name, p.id]));

    const aiDataPath = path.join(process.cwd(), 'src', 'pages', 'PerfumeHubAI', 'PerfumeHubAI.jsx');
    try {
        const content = fs.readFileSync(aiDataPath, 'utf8');
        const items = [];
        
        const dbMatch = content.match(/const EXTERNAL_DATABASE = (\[[\s\S]*?\]);/);
        if (dbMatch) {
            const rawData = dbMatch[1];
            
            const regex = /\{[\s\S]*?name:\s*"(.*?)"[\s\S]*?brand:\s*"(.*?)"[\s\S]*?notes:\s*"(.*?)"[\s\S]*?reason:\s*"(.*?)"[\s\S]*?profile:\s*\[([\s\S]*?)\][\s\S]*?keyNotes:\s*\[([\s\S]*?)\][\s\S]*?vibes:\s*\[([\s\S]*?)\][\s\S]*?seasons:\s*\[([\s\S]*?)\][\s\S]*?occasions:\s*\[([\s\S]*?)\][\s\S]*?gender:\s*'(.*?)'[\s\S]*?\}/g;
            
            let m;
            while ((m = regex.exec(rawData)) !== null) {
                items.push({
                    name: m[1].trim(),
                    brand: m[2].trim(),
                    notes: m[3].split(',').map(s => s.trim()).filter(s => s),
                    reason: m[4].trim(),
                    profile: m[5].replace(/['"]/g, "").split(',').map(s => s.trim()).filter(s => s),
                    keyNotes: m[6].replace(/['"]/g, "").split(',').map(s => s.trim()).filter(s => s),
                    vibes: m[7].replace(/['"]/g, "").split(',').map(s => s.trim()).filter(s => s),
                    seasons: m[8].replace(/['"]/g, "").split(',').map(s => s.trim()).filter(s => s),
                    occasions: m[9].replace(/['"]/g, "").split(',').map(s => s.trim()).filter(s => s),
                    gender: m[10].trim()
                });
            }
        }

        console.log(`Found ${items.length} external fragrances.`);

        for (const p of items) {
            // Check for explicit conflicting fuzzy duplicates
            const normalizedName = p.name.toLowerCase();
            if (normalizedName.includes('chanel') && normalizedName.includes('no') && normalizedName.includes('5')) {
                continue;
            }
            if (normalizedName.includes('opium') && (normalizedName.includes('black') || p.brand.toLowerCase().includes('ysl') || p.brand.toLowerCase().includes('laurent'))) {
                continue;
            }

            if (nameToId.has(p.name) && !force) {
                // We could check more but skipping is safer to protect manual edits
                continue;
            }

            // Luxury mapping for generic images
            let mappedImage = "/assets/ext_modern.png"; // Fallback
            if (p.profile.includes('arabic') || p.profile.includes('oriental')) {
                mappedImage = "/assets/ext_gold.png";
            } else if (p.profile.includes('woody') || p.profile.includes('earthy')) {
                mappedImage = "/assets/ext_dark.png";
            } else if (p.profile.includes('fresh') || p.profile.includes('citrus')) {
                mappedImage = "/assets/ext_blue.png";
            } else if (p.profile.includes('floral') || p.profile.includes('spicy') || p.profile.includes('gourmand')) {
                mappedImage = "/assets/ext_modern.png";
            }

            const payload = {
                name: p.name,
                brand: p.brand,
                type: "Eau de Parfum",
                size: "100ml",
                price: 450,
                image: [mappedImage],
                category: p.profile,
                gender: p.gender,
                description: p.notes.join(', '),
                notes: p.notes,
                vibes: p.vibes,
                occasions: p.occasions,
                reason: p.reason,
                seasons: p.seasons,
                sku: `EXT-${p.brand.substring(0,3).toUpperCase()}-${p.name.substring(0,3).toUpperCase()}`
            };

            if (nameToId.has(p.name)) {
                payload.id = nameToId.get(p.name);
            }

            const { error } = await supabase.from('products').upsert(payload);
            if (error) {
                console.error(`Error syncing ext ${p.name}:`, error.message);
            }
        }
        console.log('Finished syncing external fragrances.');
    } catch (e) {
        console.error('Error in syncExternalData:', e);
    }
}

(async () => {
    await syncData();
    await syncExternalData();
    console.log('\n--- Full Sync Complete ---');
})();
