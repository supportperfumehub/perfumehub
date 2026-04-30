import { supabase } from './supabaseClient.js';

const nicheUpdates = [
    { name: "London", brand: "Widian", price: 1000, old_price: 1200 },
    
    // London Collection
    { name: "Royal English Oak", brand: "London Collection", price: 840, old_price: 999 },
    { name: "Soho Nights", brand: "London Collection", price: 840, old_price: 999 },
    { name: "Thames Midnight", brand: "London Collection", price: 640, old_price: 750 },
    { name: "Mayfair Rose Essence", brand: "London Collection", price: 640, old_price: 750 },
    { name: "Piccadilly Citrus", brand: "London Collection", price: 455, old_price: 550 },
    
    // Elite Scents
    { name: "Royal Oud of Riyadh", brand: "Elite Scents", price: 1250, old_price: 1500 },
    { name: "Desert Bloom", brand: "Elite Scents", price: 550, old_price: 650 },
    
    // Luxura
    { name: "Mirage Gold", brand: "Luxura", price: 1800, old_price: 2100 },
    { name: "Oasis Azure", brand: "Luxura", price: 840, old_price: 999 }
];

async function updateNichePrices() {
    console.log('Updating Niche/Private-Label prices (Int. Benchmark + 25% Import Expense)...');
    
    let updatedCount = 0;

    for (const update of nicheUpdates) {
        const { data: products, error: fetchError } = await supabase
            .from('products')
            .select('id, name, brand')
            .ilike('name', `%${update.name}%`)
            .ilike('brand', `%${update.brand}%`);

        if (fetchError) {
            console.error(`Error fetching ${update.name}:`, fetchError);
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
                    console.error(`Error updating ID ${p.id}:`, updateError);
                } else {
                    console.log(`Updated ${p.brand} ${p.name}: ${update.price} QAR (Old: ${update.old_price})`);
                    updatedCount++;
                }
            }
        }
    }

    console.log(`\nFinished. Updated ${updatedCount} niche product records.`);
}

updateNichePrices();
