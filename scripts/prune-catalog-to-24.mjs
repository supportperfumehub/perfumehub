import fs from 'fs';
import path from 'path';
import { supabase } from '../backend/src/config/supabaseClient.js';

// The exact 24 active products from the dashboard
const KEEP_PRODUCT_IDS = [
    1263, 1261, 1260, 1259, 1258, 1257, 1256, 1255,
    1254, 1253, 1252, 1251, 1250, 1249, 1248, 1247,
    1246, 1245, 1244, 1243, 1242, 1241, 1240, 1239
];

async function pruneCatalog() {
    console.log('\n============================================================');
    console.log('       CATALOG PRUNING: RETAINING EXACT 24 PRODUCTS          ');
    console.log('============================================================\n');

    // 1. Safety verification: Check backup exists
    const backupDir = path.resolve('backend/data/backups');
    const backups = fs.existsSync(backupDir) ? fs.readdirSync(backupDir).filter(f => f.startsWith('catalog_backup_')) : [];
    if (backups.length === 0) {
        console.error('❌ SAFETY ABORT: No backup file found in backend/data/backups/. Aborting deletion.');
        process.exit(1);
    }
    console.log(`✅ Safety backup confirmed: ${backups[backups.length - 1]}`);

    // 2. Fetch all current product IDs
    let allProducts = [];
    let from = 0;
    let step = 1000;
    while (true) {
        const { data, error } = await supabase.from('products').select('id, name, category, brand').range(from, from + step - 1);
        if (error) { console.error('Fetch error:', error); process.exit(1); }
        if (!data || data.length === 0) break;
        allProducts = allProducts.concat(data);
        if (data.length < step) break;
        from += step;
    }

    console.log(`Current catalog count: ${allProducts.length} products.`);

    const toDelete = allProducts.filter(p => !KEEP_PRODUCT_IDS.includes(p.id));
    const toKeep = allProducts.filter(p => KEEP_PRODUCT_IDS.includes(p.id));

    console.log(`Identified ${toDelete.length} products to remove.`);
    console.log(`Identified ${toKeep.length} products to retain.`);

    if (toKeep.length !== 24) {
        console.warn(`⚠️ Warning: Expected 24 products to keep, found ${toKeep.length}`);
    }

    // 3. Delete in batches of 40 IDs
    const deleteIds = toDelete.map(p => p.id);
    console.log('\nDeleting obsolete products from database...');

    let deletedCount = 0;
    for (let i = 0; i < deleteIds.length; i += 40) {
        const batchIds = deleteIds.slice(i, i + 40);
        const { error } = await supabase.from('products').delete().in('id', batchIds);
        if (error) {
            console.error(`Error deleting batch ${i} - ${i + batchIds.length}:`, error.message);
        } else {
            deletedCount += batchIds.length;
            process.stdout.write(`Pruned: ${deletedCount} / ${deleteIds.length}\r`);
        }
    }
    console.log(`\nSuccessfully deleted ${deletedCount} products.`);

    // 4. Verify post-pruning state
    const { count: finalCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const { data: remaining } = await supabase.from('products').select('id, name, brand, category, gender').order('created_at', { ascending: false });

    console.log('\n============================================================');
    console.log(`FINAL DATABASE PRODUCT COUNT: ${finalCount}`);
    console.log('============================================================');

    const counts = { all: 0, perfume: 0, fashion: 0, abaya: 0, giftbox: 0, jewellery: 0 };
    const fashionTags = ['fashion', 'abaya', 'clothing', 'apparel', 'accessories', 'bags', 'bag', 'shoes', 'eyewear'];
    const jewTags = ['jewellery', 'jewelry', 'watches', 'watch', 'rings', 'ring', 'necklaces', 'necklace', 'earrings', 'earring', 'bracelets', 'bracelet'];
    const giftTags = ['giftbox', 'gift-box', 'gift box', 'gifts', 'gift'];

    (remaining || []).forEach(product => {
        counts.all++;
        const cats = Array.isArray(product.category) 
            ? product.category.map(c => String(c).toLowerCase()) 
            : (product.category ? [String(product.category).toLowerCase()] : []);
        
        const isAbaya = cats.includes('abaya') || (product.name && product.name.toLowerCase().includes('abaya'));
        const isFashion = cats.some(c => fashionTags.includes(c)) || product.gender === 'fashion';
        const isJewellery = cats.some(c => jewTags.includes(c));
        const isGiftbox = cats.some(c => giftTags.includes(c));

        if (isAbaya) counts.abaya++;
        if (isFashion && !isAbaya) counts.fashion++;
        if (isJewellery) counts.jewellery++;
        if (isGiftbox) counts.giftbox++;
        if (!isFashion && !isJewellery && !isGiftbox && !isAbaya) counts.perfume++;
    });

    console.log('\nCategory breakdown matching dashboard UI:');
    console.log(`  All Products:        ${counts.all}`);
    console.log(`  Perfume:             ${counts.perfume}`);
    console.log(`  Fashion:             ${counts.fashion}`);
    console.log(`  Exclusive (Abaya):   ${counts.abaya}`);
    console.log(`  Gift Box:            ${counts.giftbox}`);
    console.log(`  Jewellery:           ${counts.jewellery}`);

    console.log('\nAll Remaining 24 Products:');
    (remaining || []).forEach((p, idx) => {
        console.log(`  ${idx + 1}. [ID ${p.id}] ${p.name} (${p.brand})`);
    });

    process.exit(0);
}

pruneCatalog();
