const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/LENOVO/OneDrive/Documents/perfumehub/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deepRepair() {
    console.log('--- DEEP REPAIR: SYNCING REAL DATA ---');
    
    try {
        const localConn = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'perfumehub_db'
        });

        console.log('Successfully connected to local MySQL!');

        // 1. Fetch ALL products from local MySQL (including Labbra)
        const [localProducts] = await localConn.query('SELECT * FROM products');
        console.log(`Found ${localProducts.length} products in local database.`);

        for (const lp of localProducts) {
            console.log(`Checking ${lp.name}...`);
            
            // 2. Prepare payload with REAL details from local DB
            // Ensure images are stored as an array for Supabase
            let imageArray = [];
            try {
                imageArray = typeof lp.image === 'string' ? JSON.parse(lp.image) : (lp.image || []);
                if (!Array.isArray(imageArray)) imageArray = [imageArray];
            } catch (e) {
                imageArray = lp.image ? [lp.image] : [];
            }

            const payload = {
                name: lp.name,
                brand: lp.brand,
                price: lp.price,
                description: lp.description,
                image: imageArray,
                category: lp.category ? (typeof lp.category === 'string' ? lp.category.split(',') : lp.category) : [],
                gender: lp.gender,
                sku: lp.sku,
                stock: lp.stock
            };

            // 3. Upsert to Supabase
            const { data, error } = await supabase
                .from('products')
                .upsert(payload, { onConflict: 'name, brand' })
                .select();

            if (error) {
                console.error(`Error syncing ${lp.name}:`, error.message);
            } else {
                console.log(`✅ Synced ${lp.name} with REAL data.`);
            }
        }

        await localConn.end();
        console.log('--- DEEP REPAIR COMPLETE ---');
    } catch (e) {
        console.error('MySQL Connection Error:', e.code, e.message);
    }
}

deepRepair();
