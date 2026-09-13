import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostic() {
    console.log('--- DB Diagnostic ---');
    
    const { count: productCount, error: pErr } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log('Product Count:', productCount, pErr || '');

    const { count: shopCount, error: sErr } = await supabase.from('shops').select('*', { count: 'exact', head: true });
    console.log('Shop Count:', shopCount, sErr || '');

    const { count: inventoryCount, error: iErr } = await supabase.from('vendor_inventory').select('*', { count: 'exact', head: true });
    console.log('Inventory Count:', inventoryCount, iErr || '');

    if (productCount > 0) {
        const { data: sampleProducts } = await supabase.from('products').select('id, name, brand').limit(3);
        console.log('Sample Products:', sampleProducts);
    }

    if (inventoryCount > 0) {
        const { data: sampleInv } = await supabase.from('vendor_inventory').select('id, product_id, shop_id').limit(3);
        console.log('Sample Inventory:', sampleInv);
    }

    // Check for RLS issues on shops
    const { data: publicShops, error: pubErr } = await createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY).from('shops').select('id, name');
    console.log('Public Shops Access:', publicShops?.length || 0, pubErr?.message || 'OK');
}

diagnostic();
