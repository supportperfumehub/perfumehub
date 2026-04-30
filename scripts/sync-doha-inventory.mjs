import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://zfdobbrogwismbziloej.supabase.co',
    'sb_secret_Wa6CGtbNgkkf_t10rN7A9A_UiSZ4vUc'
);

const DOHA_SHOP_ID = 'd635b4b4-0b9b-4e54-a5ee-06871db64bc9';

async function syncInventory() {
    console.log('🔄 Starting Doha Inventory Sync...');

    // 1. Get all global products
    const { data: globalProducts, error: gpError } = await supabase
        .from('products')
        .select('id, name, price');

    if (gpError) throw gpError;

    // 2. Get current Doha inventory
    const { data: currentInv, error: invError } = await supabase
        .from('vendor_inventory')
        .select('product_id')
        .eq('shop_id', DOHA_SHOP_ID);

    if (invError) throw invError;

    const existingProductIds = new Set(currentInv.map(i => i.product_id));
    const missingProducts = globalProducts.filter(p => !existingProductIds.has(p.id));

    console.log(`📊 Global Products: ${globalProducts.length}`);
    console.log(`✅ Already in Doha: ${existingProductIds.size}`);
    console.log(`⚠️ Missing from Doha: ${missingProducts.length}`);

    if (missingProducts.length === 0) {
        console.log('✨ Doha shop is already fully synced!');
        return;
    }

    // 3. Link missing products
    const inserts = missingProducts.map(p => ({
        product_id: p.id,
        shop_id: DOHA_SHOP_ID,
        price: p.price || 0,
        stock: 50, // Default stock
        is_active: true,
        pickup_available: true
    }));

    const { error: insertError } = await supabase
        .from('vendor_inventory')
        .insert(inserts);

    if (insertError) {
        console.error('❌ Failed to link missing products:', insertError.message);
    } else {
        console.log(`🎉 Successfully linked ${missingProducts.length} new products to Doha!`);
    }
}

syncInventory().catch(console.error);
