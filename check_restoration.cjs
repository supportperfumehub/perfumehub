const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRestoration() {
    console.log('--- Database Restoration Check ---');

    // 1. Check backups
    const { data: backups, error: bError } = await supabase.from('backups').select('*');
    if (bError) console.error('Error fetching backups:', bError);
    else {
        console.log(`Current backups count: ${backups.length}`);
        backups.forEach(b => {
            console.log(`- Backup ID: ${b.id}, Table: ${b.table_name}, Item: ${b.data?.name || b.data?.code}`);
        });
    }

    // 2. Check products
    const { data: products, error: pError } = await supabase.from('products').select('id, name').order('created_at', { ascending: false }).limit(5);
    if (pError) console.error('Error fetching products:', pError);
    else {
        console.log('Latest 5 products:');
        products.forEach(p => console.log(`- ID: ${p.id}, Name: ${p.name}`));
    }

    // 3. Check for specific restored items if known
    // (We'll just look at the logs for now)
}

checkRestoration();
