import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function individualAudit() {
    console.log('--- INDIVIDUAL PRODUCT AUDIT ---');

    // 1. Fetch 5 products with their inventory data
    const { data: products, error } = await supabase
        .from('products')
        .select(`
            id, 
            name, 
            brand, 
            image, 
            description,
            vendor_inventory (
                shop_id,
                price,
                stock
            )
        `)
        .limit(10);

    if (error) {
        console.error('Audit Error:', error.message);
        return;
    }

    products.forEach((p, i) => {
        console.log(`\n[Product #${i + 1}]`);
        console.log(`ID: ${p.id}`);
        console.log(`Name: ${p.name}`);
        console.log(`Brand: ${p.brand}`);
        console.log(`Image URL: ${p.image?.[0] || 'MISSING'}`);
        console.log(`Linked Shops: ${p.vendor_inventory?.length || 0}`);
        if (p.vendor_inventory?.[0]) {
            console.log(`Price in Shop: QAR ${p.vendor_inventory[0].price}`);
            console.log(`Stock Level: ${p.vendor_inventory[0].stock}`);
        }
    });
}

individualAudit();
