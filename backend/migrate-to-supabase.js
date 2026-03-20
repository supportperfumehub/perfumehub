import pool from './db.js';
import { supabase } from './supabaseClient.js';

const migrate = async () => {
    try {
        console.log('Starting migration to Supabase...');

        // 1. Create tables if they don't exist
        // Supabase/PostgreSQL syntax is a bit different, but for now we assume 
        // the user has either created them or we use the SQL editor.
        // However, we can try to use supabase.rpc or direct queries if needed.
        // For simplicity in this script, we'll focus on data migration.
        // NOTE: The user should run the SQL schema in Supabase dashboard first.
        // I will provide the SQL below.

        /*
        -- SQL for Supabase SQL Editor:
        
        CREATE TABLE products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            brand TEXT,
            type TEXT,
            size JSONB,
            price DECIMAL(10, 2) NOT NULL,
            old_price DECIMAL(10, 2), -- Changed from oldPrice to old_price for PG convention
            discount INT DEFAULT 0,
            is_new BOOLEAN DEFAULT FALSE, -- Changed from isNew to is_new
            image JSONB,
            category JSONB,
            gender TEXT,
            description TEXT,
            sku TEXT,
            stock INT DEFAULT 10,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE coupons (
            id SERIAL PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            discount_percentage INT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE shipping_rules (
            id SERIAL PRIMARY KEY,
            area TEXT NOT NULL,
            charge DECIMAL(10, 2) NOT NULL,
            free_threshold DECIMAL(10, 2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE orders (
            id SERIAL PRIMARY KEY,
            customer_name TEXT NOT NULL, -- Changed from customerName
            email TEXT,
            phone TEXT,
            total DECIMAL(10, 2) NOT NULL,
            shipping_address TEXT, -- Changed from shippingAddress
            payment_method TEXT, -- Changed from paymentMethod
            items JSONB,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        */

        // MIGRATION LOGIC

        // Migrate Products
        console.log('Migrating products...');
        const [products] = await pool.query('SELECT * FROM products');
        for (const p of products) {
            const { error } = await supabase.from('products').upsert({
                id: p.id,
                name: p.name,
                brand: p.brand,
                type: p.type,
                size: typeof p.size === 'string' ? JSON.parse(p.size) : p.size,
                price: p.price,
                old_price: p.oldPrice,
                discount: p.discount,
                is_new: p.isNew,
                image: typeof p.image === 'string' ? JSON.parse(p.image) : p.image,
                category: typeof p.category === 'string' ? JSON.parse(p.category) : p.category,
                gender: p.gender,
                description: p.description,
                sku: p.sku,
                stock: p.stock,
                created_at: p.created_at
            });
            if (error) console.error(`Error migrating product ${p.id}:`, error.message);
        }

        // Migrate Coupons
        console.log('Migrating coupons...');
        const [coupons] = await pool.query('SELECT * FROM coupons');
        for (const c of coupons) {
            const { error } = await supabase.from('coupons').upsert({
                id: c.id,
                code: c.code,
                discount_percentage: c.discount_percentage,
                is_active: c.is_active,
                created_at: c.created_at
            });
            if (error) console.error(`Error migrating coupon ${c.code}:`, error.message);
        }

        // Migrate Shipping Rules
        console.log('Migrating shipping rules...');
        const [rules] = await pool.query('SELECT * FROM shipping_rules');
        for (const r of rules) {
            const { error } = await supabase.from('shipping_rules').upsert({
                id: r.id,
                area: r.area,
                charge: r.charge,
                free_threshold: r.free_threshold,
                created_at: r.created_at
            });
            if (error) console.error(`Error migrating shipping rule ${r.area}:`, error.message);
        }

        // Migrate Orders
        console.log('Migrating orders...');
        const [orders] = await pool.query('SELECT * FROM orders');
        for (const o of orders) {
            const { error } = await supabase.from('orders').upsert({
                id: o.id,
                customer_name: o.customerName,
                email: o.email,
                phone: o.phone,
                total: o.total,
                shipping_address: o.shippingAddress,
                payment_method: o.paymentMethod,
                items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
                status: o.status,
                created_at: o.created_at
            });
            if (error) console.error(`Error migrating order ${o.id}:`, error.message);
        }

        console.log('Migration completed!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
