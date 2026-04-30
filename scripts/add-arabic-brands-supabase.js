import { supabase } from './supabaseClient.js';

const newProducts = [
    // LATTAFA
    { name: "Khamrah", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 130, oldPrice: 160, discount: 18, isNew: true, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Khamrah", category: ["arabic", "spicy", "gourmand"], gender: "unisex", description: "A luxurious oriental gourmand fragrance with notes of cinnamon, praline, and vanilla.", stock: 50 },
    { name: "Asad", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 110, isNew: false, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Asad", category: ["arabic", "spicy"], gender: "men", description: "A bold, spicy and woody fragrance. An exceptional signature scent for men.", stock: 45 },
    { name: "Yara", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 115, oldPrice: 140, discount: 17, isNew: true, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Yara", category: ["arabic", "floral", "sweet"], gender: "women", description: "A beautiful, powdery, sweet floral fragrance with tropical vibes.", stock: 60 },
    { name: "Fakhar Black", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 105, oldPrice: 125, discount: 16, isNew: false, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Fakhar", category: ["arabic", "fresh", "aromatic"], gender: "men", description: "An aromatic fougere fragrance, perfect for daily wear.", stock: 40 },
    { name: "Bade'e Al Oud", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 140, oldPrice: 170, discount: 17, isNew: true, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Badee", category: ["arabic", "woody", "oud"], gender: "unisex", description: "Oud for Glory. A magnificent and extremely potent oud and saffron blend.", stock: 25 },
    { name: "Nebras", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 135, oldPrice: 155, discount: 12, isNew: true, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Nebras", category: ["arabic", "sweet", "vanilla"], gender: "unisex", description: "A breathtaking creamy vanilla and cacao scent.", stock: 35 },
    { name: "Qaa'ed", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 95, oldPrice: 115, discount: 17, isNew: false, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Qaaed", category: ["arabic", "leather", "spicy"], gender: "men", description: "A strong, spicy leather fragrance in a golden cylinder bottle.", stock: 30 },
    { name: "Ameer Al Oudh", brand: "Lattafa", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 100, oldPrice: 120, discount: 16, isNew: false, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Lattafa+Ameer", category: ["arabic", "oud", "sweet"], gender: "unisex", description: "Intense Oud. A warm, woody, and sweet vanilla oud fragrance.", stock: 40 },

    // AHMED AL MAGHRIBI
    { name: "Kaaf", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 250, oldPrice: 290, discount: 13, isNew: true, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Kaaf", category: ["arabic", "fresh", "aquatic"], gender: "unisex", description: "An incredibly fresh, aquatic and long-lasting scent. One of the best fresh Arabic perfumes.", stock: 30 },
    { name: "Marj", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "60ml / 2.0 oz", price: 320, isNew: false, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Marj", category: ["arabic", "woody", "oriental"], gender: "unisex", description: "A rich, potent blend of spices, woods and oud. For lovers of strong, majestic fragrances.", stock: 15 },
    { name: "Leather", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "50ml / 1.7 oz", price: 220, isNew: true, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Leather", category: ["arabic", "leather"], gender: "men", description: "Pure, high-quality leather mixed with subtle Arabic spices.", stock: 20 },
    { name: "Oud Classic", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "50ml / 1.7 oz", price: 180, oldPrice: 210, discount: 14, isNew: false, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Oud+Classic", category: ["arabic", "oud"], gender: "unisex", description: "A staple traditional classic oud for everyday wearing.", stock: 12 },
    { name: "Blue Oud", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 260, isNew: false, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Blue+Oud", category: ["arabic", "oud", "fresh"], gender: "unisex", description: "A unique take combining fresh marine notes with a dark oud base.", stock: 22 },
    { name: "Oud And Roses", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "60ml / 2.0 oz", price: 240, oldPrice: 280, discount: 14, isNew: true, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Oud+Roses", category: ["arabic", "floral", "oud"], gender: "unisex", description: "A majestic signature blend of Turkish rose and premium oud.", stock: 18 },
    { name: "Hirfah", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "75ml / 2.5 oz", price: 280, isNew: false, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Hirfah", category: ["arabic", "fruity", "sweet"], gender: "women", description: "An intoxicating sweet fruity oriental blend, immensely powerful.", stock: 10 },
    { name: "Summer Oud", brand: "Ahmed Al Maghribi", type: "EDP (Eau de Parfum)", size: "60ml / 2.0 oz", price: 210, oldPrice: 240, discount: 12, isNew: true, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=Ahmed+Summer+Oud", category: ["arabic", "fresh", "oud"], gender: "unisex", description: "A lighter, more aerated oud meant exclusively for hot summer days.", stock: 25 },

    // FRENCH AVENUE (Fragrance World)
    { name: "Divin Asylum", brand: "French Avenue", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 150, oldPrice: 180, discount: 16, isNew: true, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=French+Ave+Divin", category: ["arabic", "fresh", "citrus"], gender: "men", description: "A vibrant fresh citrus and woody fragrance. Extremely smooth and sophisticated.", stock: 40 },
    { name: "Royal Blend", brand: "French Avenue", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 160, isNew: false, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=French+Ave+Royal", category: ["arabic", "gourmand", "warm"], gender: "unisex", description: "An intoxicating blend of cognac, cinnamon, and oak. Luxurious and warm.", stock: 35 },
    { name: "Francique 63.55", brand: "French Avenue", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 140, oldPrice: 170, discount: 17, isNew: true, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=French+Ave+Francique", category: ["arabic", "fruity", "leather"], gender: "unisex", description: "Elegant blend of cardamom, leather, and fig. A unique and distinguished profile.", stock: 25 },
    { name: "Imperial Oud", brand: "French Avenue", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 155, isNew: false, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=French+Ave+Imperial", category: ["arabic", "oud", "spicy"], gender: "unisex", description: "A majestic oud fragrance surrounded by spices and dark woods.", stock: 20 },
    { name: "Liquid Brun", brand: "French Avenue", type: "EDP (Eau de Parfum)", size: "100ml / 3.4 oz", price: 165, oldPrice: 190, discount: 13, isNew: true, image: "https://placehold.co/400x500/1a1a1a/d4af37?text=French+Ave+Liquid", category: ["arabic", "warm", "spicy"], gender: "men", description: "A stunning warm spicy profile with exceptional longevity and projection.", stock: 45 }
];

const run = async () => {
    try {
        console.log(`Connecting to Supabase to add ${newProducts.length} Arabic perfumes...`);

        // Fetch existing to avoid duplicates
        const { data: existing, error: fetchErr } = await supabase.from('products').select('name, brand');
        if (fetchErr) throw fetchErr;

        const existingSet = new Set((existing || []).map(r => `${r.brand}-${r.name}`.toLowerCase()));
        
        let addedCount = 0;
        let skippedCount = 0;

        for (const p of newProducts) {
            const key = `${p.brand}-${p.name}`.toLowerCase();
            if (existingSet.has(key)) {
                console.log(`Skipped Duplicate: ${p.brand} - ${p.name}`);
                skippedCount++;
                continue;
            }

            // Map to Supabase snake_case format exactly as expected by the DB
            const supremeFormat = {
                name: p.name,
                brand: p.brand,
                type: p.type,
                size: JSON.stringify([p.size]),
                price: p.price,
                old_price: p.oldPrice || null,
                discount: p.discount || null,
                is_new: p.isNew ? true : false,
                image: JSON.stringify([p.image]),
                category: JSON.stringify(p.category),
                gender: p.gender,
                description: p.description,
                sku: p.sku || `${p.brand.substring(0,3).toUpperCase()}-${Math.floor(Math.random()*1000)}`,
                stock: p.stock
            };

            const { error: insertErr } = await supabase.from('products').insert([supremeFormat]);
            
            if (insertErr) {
                console.error(`Error inserting ${p.name}:`, insertErr.message);
            } else {
                console.log(`Added: ${p.brand} - ${p.name}`);
                addedCount++;
            }
        }

        console.log(`\nSuccessfully added ${addedCount} products to Supabase! Skipped ${skippedCount} duplicates.`);
        process.exit(0);

    } catch (err) {
        console.error("Fatal error:", err);
        process.exit(1);
    }
};

run();
