import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function linkToShop() {
    console.log('--- Linking All Products to Perfume Hub ---');

    // 1. Get the Shop ID for Perfume Hub owned by Northclubparis@gmail.com (owner_id: 59)
    const { data: shops, error: sErr } = await supabase
        .from('shops')
        .select('id, name')
        .eq('owner_id', 59);

    if (sErr || !shops || shops.length === 0) {
        console.error('Could not find Perfume Hub shop owned by owner_id 59:', sErr?.message || 'Not found');
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
        price: p.price || 350.00,
        stock: 50,
        is_active: true,
        pickup_available: true
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
