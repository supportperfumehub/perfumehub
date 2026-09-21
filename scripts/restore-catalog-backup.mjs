import fs from 'fs';
import path from 'path';
import { supabase } from '../backend/src/config/supabaseClient.js';

async function restoreCatalog() {
    console.log('\n--- RESTORE CATALOG FROM BACKUP ---');
    const backupDir = path.resolve('backend/data/backups');
    if (!fs.existsSync(backupDir)) {
        console.error('No backup directory found at:', backupDir);
        process.exit(1);
    }

    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('catalog_backup_') && f.endsWith('.json'));
    if (files.length === 0) {
        console.error('No catalog backup files found in:', backupDir);
        process.exit(1);
    }

    // Pick latest backup
    files.sort().reverse();
    const latestFile = path.join(backupDir, files[0]);
    console.log('Loading latest backup file:', latestFile);

    const backupData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    const products = backupData.products || [];
    const inventory = backupData.vendor_inventory || [];

    console.log(`Found ${products.length} products and ${inventory.length} inventory mappings to restore.`);

    // Restore products in batches of 50
    console.log('Restoring products...');
    for (let i = 0; i < products.length; i += 50) {
        const batch = products.slice(i, i + 50);
        const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
        if (error) {
            console.error(`Error restoring products batch ${i} - ${i + batch.length}:`, error.message);
        } else {
            process.stdout.write(`Restored products: ${Math.min(i + 50, products.length)} / ${products.length}\r`);
        }
    }
    console.log('\nProducts restored.');

    // Restore inventory in batches of 50
    if (inventory.length > 0) {
        console.log('Restoring vendor inventory...');
        for (let i = 0; i < inventory.length; i += 50) {
            const batch = inventory.slice(i, i + 50);
            const { error } = await supabase.from('vendor_inventory').upsert(batch, { onConflict: 'id' });
            if (error) {
                console.error(`Error restoring inventory batch ${i} - ${i + batch.length}:`, error.message);
            } else {
                process.stdout.write(`Restored inventory: ${Math.min(i + 50, inventory.length)} / ${inventory.length}\r`);
            }
        }
        console.log('\nVendor inventory restored.');
    }

    const { count: finalCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log(`\n✅ Restoration complete. Total products in database: ${finalCount}`);
    process.exit(0);
}

restoreCatalog();
