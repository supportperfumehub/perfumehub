import { supabase } from './supabaseClient.js';

const priceUpdates = [
    // DIOR
    { name: "Sauvage", brand: "Dior", price: 498, old_price: 520 },
    { name: "Sauvage Elixir", brand: "Dior", price: 650, old_price: 750 },
    
    // CHANEL
    { name: "Chanel No. 5", brand: "Chanel", price: 733, old_price: 800 },
    { name: "Bleu de Chanel EDP", brand: "Chanel", price: 650, old_price: 750 },
    
    // TOM FORD
    { name: "Oud Wood", brand: "Tom Ford", price: 1141, old_price: 1232 },
    
    // MFK
    { name: "Baccarat Rouge 540", brand: "Maison Francis Kurkdjian", price: 1033, old_price: 1250 },
    
    // CREED
    { name: "Silver Mountain Water", brand: "Creed", price: 975, old_price: 1100 },
    
    // LATTAFA
    { name: "Khamrah", brand: "Lattafa", price: 115, old_price: 140 },
    { name: "Asad", brand: "Lattafa", price: 107, old_price: 150 },
    { name: "Yara", brand: "Lattafa", price: 82, old_price: 100 },
    { name: "Fakhar Black", brand: "Lattafa", price: 100, old_price: 125 },
    { name: "Bade'e Al Oud", brand: "Lattafa", price: 97, old_price: 120 },
    { name: "Nebras", brand: "Lattafa", price: 195, old_price: 255 },
    { name: "Qaa'ed", brand: "Lattafa", price: 95, old_price: 130 },
    { name: "Ameer Al Oudh", brand: "Lattafa", price: 90, old_price: 100 },
    { name: "Mayar Cherry Intense", brand: "Lattafa", price: 100, old_price: 130 },
    { name: "Asad Bourbon", brand: "Lattafa", price: 130, old_price: 150 },
    { name: "Asad Elixir", brand: "Lattafa", price: 130, old_price: 150 },
    { name: "Fire On Ice", brand: "Lattafa", price: 110, old_price: 130 },
    { name: "Dynasty", brand: "Lattafa", price: 125, old_price: 150 },
    { name: "Atheeri", brand: "Lattafa", price: 125, old_price: 150 },
    { name: "Teriaq Intense", brand: "Lattafa", price: 160, old_price: 180 },
    { name: "Petra", brand: "Lattafa", price: 100, old_price: 125 },
    { name: "Ishq Al Shuyukh Gold", brand: "Lattafa", price: 130, old_price: 150 },
    
    // AHMED AL MAGHRIBI
    { name: "Kaaf", brand: "Ahmed Al Maghribi", price: 103, old_price: 117 },
    { name: "Marj", brand: "Ahmed Al Maghribi", price: 176, old_price: 192 },
    { name: "Leather", brand: "Ahmed Al Maghribi", price: 114, old_price: 168 },
    { name: "Oud Classic", brand: "Ahmed Al Maghribi", price: 119, old_price: 145 },
    { name: "Blue Oud", brand: "Ahmed Al Maghribi", price: 102, old_price: 129 },
    { name: "Oud And Roses", brand: "Ahmed Al Maghribi", price: 149, old_price: 175 },
    { name: "Hirfah", brand: "Ahmed Al Maghribi", price: 240, old_price: 280 },
    { name: "Summer Oud", brand: "Ahmed Al Maghribi", price: 153, old_price: 159 },
    
    // FRENCH AVENUE
    { name: "Divin Asylum", brand: "French Avenue", price: 147, old_price: 180 },
    { name: "Royal Blend", brand: "French Avenue", price: 137, old_price: 160 },
    { name: "Francique 63.55", brand: "French Avenue", price: 140, old_price: 170 },
    { name: "Imperial Oud", brand: "French Avenue", price: 147, old_price: 175 },
    { name: "Liquid Brun", brand: "French Avenue", price: 140, old_price: 190 },
    
    // OTHER BRANDS
    { name: "BLOOM EAU DE PARFUM", brand: "GUCCI", price: 280, old_price: 325 },
    { name: "Guilty Pour Homme Eau de Toilette", brand: "Gucci", price: 400, old_price: 460 },
    { name: "Invictus Parfum", brand: "Paco Rabanne", price: 350, old_price: 400 },
    { name: "Acqua di Giò Profumo", brand: "Giorgio Armani", price: 525, old_price: 600 },
    { name: "Versace Eros Energy", brand: "Versace", price: 280, old_price: 360 },
    { name: "Luna Rossa Ocean", brand: "Prada", price: 475, old_price: 550 }
];

async function updatePrices() {
    console.log('Starting price updates based on Qatar market research...');
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const update of priceUpdates) {
        // Find products matching by name and brand (case insensitive)
        const { data: products, error: fetchError } = await supabase
            .from('products')
            .select('id, name, brand')
            .ilike('name', `%${update.name}%`)
            .ilike('brand', `%${update.brand}%`);

        if (fetchError) {
            console.error(`Error fetching ${update.name}:`, fetchError);
            errorCount++;
            continue;
        }

        if (products && products.length > 0) {
            for (const p of products) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update({
                        price: update.price,
                        old_price: update.old_price,
                        discount: Math.round(((update.old_price - update.price) / update.old_price) * 100)
                    })
                    .eq('id', p.id);

                if (updateError) {
                    console.error(`Error updating ID ${p.id} (${p.name}):`, updateError);
                    errorCount++;
                } else {
                    console.log(`Updated ID ${p.id}: ${p.name} -> Price: ${update.price}, Old: ${update.old_price}`);
                    updatedCount++;
                }
            }
        } else {
            console.warn(`No product found matching: ${update.name} by ${update.brand}`);
        }
    }

    console.log(`\nUpdate finished. Total updated: ${updatedCount}, Errors/Warnings: ${errorCount}`);
}

updatePrices();
