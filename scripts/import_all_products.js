import fs from 'fs';
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

async function run() {
    console.log("=== STARTING IMPORT OF ALL PRODUCTS TO SUPABASE ===");

    const rawData = JSON.parse(fs.readFileSync('scratch/parsed_products.json', 'utf8'));
    console.log(`Loaded ${rawData.length} products from parsed_products.json.`);

    const primaryShopId = 'a2acdb78-9838-4bc0-8bc9-f69b638bc395'; // Perfume Hub primary boutique

    const BATCH_SIZE = 100;
    let totalInserted = 0;
    let totalInventory = 0;

    for (let i = 0; i < rawData.length; i += BATCH_SIZE) {
        const batch = rawData.slice(i, i + BATCH_SIZE);
        
        const productsToInsert = batch.map(p => {
            const cleanBrand = decodeXml(p.brand);
            const cleanName = decodeXml(p.productName);
            const cleanFullTitle = decodeXml(p.fullTitle);
            const cleanSize = p.size.trim();
            const cleanBarcode = p.barcode ? p.barcode.trim() : null;
            const usd = parseFloat(p.priceUsd) || 0;
            const priceQar = parseFloat((usd * 3.64).toFixed(2));
            const stockCount = parseInt(p.stock, 10);
            const stock = isNaN(stockCount) || stockCount < 0 ? 10 : stockCount;

            const placeholderImg = `https://placehold.co/400x500/1a1a1a/d4af37?text=${encodeURIComponent(cleanBrand + ' ' + cleanName)}`;

            return {
                name: cleanName,
                brand: cleanBrand,
                size: JSON.stringify([cleanSize]),
                price: priceQar,
                sku: cleanBarcode,
                stock: stock,
                image: JSON.stringify([placeholderImg]),
                shop_id: primaryShopId,
                attributes: JSON.stringify({
                    barcode: cleanBarcode,
                    full_title: cleanFullTitle,
                    price_usd: usd
                })
            };
        });

        const { data: insertedProducts, error: pError } = await supabase
            .from('products')
            .insert(productsToInsert)
            .select('id, price, stock');

        if (pError) {
            console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, pError);
            process.exit(1);
        }

        totalInserted += insertedProducts.length;

        // Insert corresponding vendor_inventory rows
        const inventoryRows = insertedProducts.map(p => ({
            product_id: p.id,
            shop_id: primaryShopId,
            price: p.price,
            stock: p.stock,
            is_active: true,
            pickup_available: true
        }));

        const { error: invError } = await supabase
            .from('vendor_inventory')
            .upsert(inventoryRows, { onConflict: 'product_id,shop_id' });

        if (invError) {
            console.warn(`Notice on inventory batch ${i / BATCH_SIZE + 1}:`, invError.message);
        } else {
            totalInventory += inventoryRows.length;
        }

        console.log(`Inserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(rawData.length / BATCH_SIZE)} (${totalInserted}/${rawData.length} products)`);
    }

    console.log(`\n=== IMPORT COMPLETE ===`);
    console.log(`Total Products Inserted: ${totalInserted}`);
    console.log(`Total Inventory Linked: ${totalInventory}`);
    process.exit(0);
}

run().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
