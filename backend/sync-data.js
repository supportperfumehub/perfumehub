import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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

    // Products from mockData.js
    const mockProducts = [
        { 
            name: "Sauvage Eau de Parfum", 
            brand: "Dior", 
            type: "Eau de Parfum", 
            size: "100ml / 3.4 oz", 
            price: 520, 
            oldPrice: 580, 
            discount: 10, 
            isNew: true, 
            image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=1000", // Generic luxury bottle
            category: ["woody", "spicy", "fresh"], 
            gender: "men", 
            notes: ["bergamot", "pepper", "lavender", "ambroxan", "sandalwood", "vetiver"], 
            description: "Bergamot, Sichuan Pepper, Lavender, Ambroxan, Sandalwood, Vetiver.", 
            vibes: ["bold", "elegant", "mysterious"], 
            occasions: ["daily", "night"], 
            stock: 12 
        },
        { 
            name: "Chanel No. 5", 
            brand: "Chanel", 
            type: "Eau de Parfum", 
            size: "100ml / 3.4 oz", 
            price: 750, 
            isNew: false, 
            image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1000", // Classic bottle
            category: ["floral"], 
            gender: "women", 
            notes: ["rose", "jasmine", "ylang-ylang", "iris", "vanilla", "sandalwood"], 
            description: "Ylang-Ylang, Rose, Jasmine, Iris, Sandalwood, Vanilla, Amber.", 
            vibes: ["elegant", "romantic"], 
            occasions: ["daily", "night"], 
            stock: 8 
        },
        { 
            name: "Oud Wood", 
            brand: "Tom Ford", 
            type: "Eau de Parfum", 
            size: "50ml / 1.7 oz", 
            price: 1050, 
            isNew: true, 
            image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1000", // Dark luxury bottle
            category: ["arabic", "woody"], 
            gender: "unisex", 
            notes: ["oud", "rosewood", "cardamom", "sandalwood", "vetiver", "amber"], 
            description: "Oud, Rosewood, Cardamom, Chinese Pepper, Sandalwood, Vetiver, Amber.", 
            vibes: ["mysterious", "elegant"], 
            occasions: ["night", "daily"], 
            stock: 5 
        },
        { 
            name: "Baccarat Rouge 540", 
            brand: "Maison Francis Kurkdjian", 
            type: "Eau de Parfum", 
            size: "70ml / 2.4 oz", 
            price: 1250, 
            oldPrice: 1400, 
            discount: 11, 
            isNew: true, 
            image: "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?q=80&w=1000", // Golden bottle
            category: ["arabic", "floral", "spicy"], 
            gender: "unisex", 
            notes: ["saffron", "jasmine", "amberwood", "cedar", "fir resin"], 
            description: "Saffron, Jasmine, Amberwood, Cedar, Fir Resin, Ambergris.", 
            vibes: ["mysterious", "elegant", "romantic"], 
            occasions: ["night", "daily"], 
            stock: 3 
        }
    ];

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
            sku: `MOCK-${p.brand.substring(0,3).toUpperCase()}-${p.name.substring(0,3).toUpperCase()}`
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
