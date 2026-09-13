import { supabase } from './backend/supabaseClient.js';

async function check() {
    console.log('Checking tables in Supabase...');
    const tables = ['products', 'coupons', 'shipping_rules', 'orders', 'customers'];
    for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error) {
            console.log(`Table "${table}" NOT found or accessible. Error: ${error.message}`);
        } else {
            console.log(`Table "${table}" is ready.`);
        }
    }
}

check();
