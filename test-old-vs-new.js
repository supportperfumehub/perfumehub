import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testOptimizedTwoStep() {
    console.time('optimized-two-step');
    try {
        // 1. Get shops in region (very fast index scan)
        const { data: regionShops, error: err1 } = await supabase
            .from('shops')
            .select('id')
            .eq('region_id', 4);
        if (err1) throw err1;
        
        const shopIds = regionShops ? regionShops.map(s => s.id) : [];
        let data = [];
        
        if (shopIds.length > 0) {
            // 2. Query products inner joined with inventory on shopIds (super fast index scan)
            const { data: productsInRegion, error: err2 } = await supabase
                .from('products')
                .select(`
                    *,
                    vendor_inventory!inner (
                        is_active,
                        shop_id
                    )
                `)
                .eq('vendor_inventory.is_active', true)
                .in('vendor_inventory.shop_id', shopIds)
                .order('created_at', { ascending: false });
                
            if (err2) throw err2;
            data = productsInRegion || [];
        }
        
        console.timeEnd('optimized-two-step');
        console.log(`Optimized Two-Step Count: ${data.length}`);
    } catch (e) {
        console.error('Error Optimized:', e.message);
    }
}

async function run() {
    console.log('=== Benchmarking Optimized Two-Step ===');
    await testOptimizedTwoStep();
}

run();
