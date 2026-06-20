import { supabase } from './supabaseClient.js';

async function addGlobalVendors() {
    console.log('--- STARTING GLOBAL VENDOR ADDITION ---');

    try {
        // 1. Create Saudi Vendor & Shop
        console.log('Creating Saudi Arabia Boutique...');
        const { data: saudiUser, error: saudiUserErr } = await supabase
            .from('customers')
            .insert([{
                name: 'Ahmed Riyadh (Modern Scents)',
                email: 'riyadh@perfumehub.com',
                password: 'Riyadh2024!',
                role: 'vendor'
            }])
            .select();

        if (saudiUserErr) throw saudiUserErr;
        const ownerId1 = saudiUser[0].id;

        const { data: shop1, error: shop1Err } = await supabase
            .from('shops')
            .insert([{
                owner_id: ownerId1,
                name: 'Elite Scents Riyadh',
                address: 'Tahlia St, Riyadh, KSA',
                latitude: 24.7136,
                longitude: 46.6753,
                logo_url: '/assets/shops/shop_riyadh.webp',
                status: 'active'
            }])
            .select();

        if (shop1Err) throw shop1Err;
        const shopId1 = shop1[0].id;

        // Link shop to vendor
        await supabase.from('customers').update({ shop_id: shopId1 }).eq('id', ownerId1);

        // 2. Create Dubai Vendor & Shop
        console.log('Creating Dubai Boutique...');
        const { data: dubaiUser, error: dubaiUserErr } = await supabase
            .from('customers')
            .insert([{
                name: 'Zayed Dubai (Luxura)',
                email: 'dubai@perfumehub.com',
                password: 'Dubai2024!',
                role: 'vendor'
            }])
            .select();

        if (dubaiUserErr) throw dubaiUserErr;
        const ownerId2 = dubaiUser[0].id;

        const { data: shop2, error: shop2Err } = await supabase
            .from('shops')
            .insert([{
                owner_id: ownerId2,
                name: 'Luxura Dubai Mall',
                address: 'Dubai Mall, G Floor, Dubai, UAE',
                latitude: 25.1972,
                longitude: 55.2744,
                logo_url: '/assets/shops/shop_dubai.webp',
                status: 'active'
            }])
            .select();

        if (shop2Err) throw shop2Err;
        const shopId2 = shop2[0].id;

        // Link shop to vendor
        await supabase.from('customers').update({ shop_id: shopId2 }).eq('id', ownerId2);

        // 3. Add Products (2 per shop)
        console.log('Adding Premium Products...');
        const products = [
            {
                name: 'Royal Oud of Riyadh',
                brand: 'Elite Scents',
                type: 'Parfum',
                size: '100ml',
                price: 1250,
                old_price: 1400,
                discount: 10,
                is_new: true,
                is_featured: true,
                image: '/assets/products/royal_oud.webp',
                category: 'Oriental',
                gender: 'Unisex',
                description: 'A regal blend of pure Saudi Oud and amber, designed for Riyadh royalty.',
                sku: 'ESR-OU-001',
                stock: 25,
                shop_id: shopId1,
                notes: ['Oud', 'Amber', 'Sandalwood']
            },
            {
                name: 'Desert Bloom',
                brand: 'Elite Scents',
                type: 'EDP',
                size: '75ml',
                price: 550,
                image: '/assets/products/desert_bloom.webp',
                category: 'Floral',
                gender: 'Women',
                description: 'The scent of blooming flowers in the heart of the Saudi desert.',
                sku: 'ESR-DB-002',
                stock: 40,
                shop_id: shopId1,
                notes: ['Rose', 'Saffron', 'Musk']
            },
            {
                name: 'Mirage Gold',
                brand: 'Luxura',
                type: 'Extrait de Parfum',
                size: '100ml',
                price: 1800,
                old_price: 2100,
                discount: 15,
                is_new: true,
                is_featured: true,
                image: '/assets/products/mirage_gold.webp',
                category: 'Luxury',
                gender: 'Unisex',
                description: 'The essence of Dubai luxury bottled. A complex gold-standard fragrance.',
                sku: 'LDM-MG-001',
                stock: 15,
                shop_id: shopId2,
                notes: ['Gold Saffron', 'Civet', 'Labdanum']
            },
            {
                name: 'Oasis Azure',
                brand: 'Luxura',
                type: 'EDP',
                size: '100ml',
                price: 850,
                image: '/assets/products/oasis_azure.webp',
                category: 'Fresh',
                gender: 'Men',
                description: 'Inspired by the fresh waters of the Dubai Marina at dusk.',
                sku: 'LDM-OA-002',
                stock: 30,
                shop_id: shopId2,
                notes: ['Sea salt', 'Grapefruit', 'Cedar']
            }
        ];

        const { error: prodErr } = await supabase.from('products').insert(products);
        if (prodErr) throw prodErr;

        console.log('--- ALL RECORDS CREATED SUCCESSFULLY ---');
        console.log(`Boutique 1 ID: ${shopId1}`);
        console.log(`Boutique 2 ID: ${shopId2}`);

    } catch (error) {
        console.error('ERROR IN ADDITION SCRIPT:', error);
    }
}

addGlobalVendors();
