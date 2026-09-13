import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function linkToShop() {
    console.log('--- Linking Products to Shop ---');

    // 1. Get the Shop ID for perfumehubqa
    const { data: shops, error: sErr } = await supabase
        .from('shops')
        .select('id, name')
        .ilike('name', '%perfumehubqa%');

    if (sErr || !shops || shops.length === 0) {
        console.error('Could not find perfumehubqa shop:', sErr?.message || 'Not found');
        return;
    }

    const shopId = shops[0].id;
    console.log(`Found Shop: ${shops[0].name} (ID: ${shopId})`);

    // 2. Get all products
    const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, name, price');

    if (pErr) {
        console.error('Error fetching products:', pErr.message);
        return;
    }

    console.log(`Linking ${products.length} products to shop...`);

    // 3. Insert into vendor_inventory
    const inventoryItems = products.map(p => ({
        product_id: p.id,
        shop_id: shopId,
        price: p.price || 450.00,
        stock: 50,
        is_active: true
    }));

    // Upsert to avoid duplicates
    const { error: iErr } = await supabase
        .from('vendor_inventory')
        .upsert(inventoryItems, { onConflict: 'product_id,shop_id' });

    if (iErr) {
        console.error('Error linking inventory:', iErr.message);
    } else {
        console.log(`Successfully linked ${inventoryItems.length} products to ${shops[0].name}!`);
    }
}

linkToShop();
