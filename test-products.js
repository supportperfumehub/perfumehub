import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('--- Testing Products Query with Integer Region ID ---');
    const regionId = 4; // Qatar
    
    console.time('query-time');
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                vendor_inventory!inner (
                    is_active,
                    shops!inner (
                        region_id
                    )
                )
            `)
            .eq('vendor_inventory.is_active', true)
            .eq('vendor_inventory.shops.region_id', regionId);
            
        console.timeEnd('query-time');
        if (error) {
            console.error('Error:', error);
        } else {
            console.log(`Success! Retrieved products count: ${data?.length}`);
            if (data && data.length > 0) {
                console.log('First product name:', data[0].name);
            }
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

test();
