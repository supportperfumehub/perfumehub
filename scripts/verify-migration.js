import { supabase } from './backend/supabaseClient.js';

async function verify() {
    console.log('Verifying data in Supabase...');
    const tables = ['products', 'coupons', 'shipping_rules', 'orders'];
    for (const table of tables) {
        const { data, count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.log(`Error checking table "${table}": ${error.message}`);
        } else {
            console.log(`Table "${table}" has ${count} records.`);
        }
    }
}

verify();
