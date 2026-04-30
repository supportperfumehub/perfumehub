/**
 * migrate-images-to-storage.mjs
 * 
 * Migrates all base64 images stored in the products table 
 * to Supabase Storage bucket "product-images".
 * Updates each product record with the new public URL.
 * 
 * Run: node scripts/migrate-images-to-storage.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zfdobbrogwismbziloej.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_Wa6CGtbNgkkf_t10rN7A9A_UiSZ4vUc';
const BUCKET = 'product-images';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function uploadBase64ToStorage(base64String, fileName) {
    if (!base64String || !base64String.startsWith('data:')) return null;

    const matches = base64String.match(/^data:([a-zA-Z0-9+/.-]+);base64,(.+)$/);
    if (!matches) return null;

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const fullFileName = `${fileName}.${ext}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fullFileName, buffer, { contentType: mimeType, upsert: true });

    if (error) {
        console.error(`  ❌ Upload failed for ${fullFileName}:`, error.message);
        return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fullFileName);
    return data.publicUrl;
}

async function migrate() {
    console.log('🚀 Starting image migration to Supabase Storage...\n');

    // Fetch all products
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, image');

    if (error) {
        console.error('❌ Failed to fetch products:', error.message);
        process.exit(1);
    }

    console.log(`📦 Found ${products.length} products to process.\n`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const product of products) {
        const safeName = (product.name || `product_${product.id}`)
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase()
            .substring(0, 40);

        process.stdout.write(`[${product.id}] ${product.name?.substring(0, 30)}... `);

        // Handle image field (can be string, array, or null)
        let images = product.image;
        if (!images) {
            console.log('⏭  No image, skipped.');
            skipped++;
            continue;
        }
        if (typeof images === 'string') images = [images];
        if (!Array.isArray(images)) images = [String(images)];

        // Check if all images are already URLs (not base64)
        const allUrls = images.every(img => !img || !img.startsWith('data:'));
        if (allUrls) {
            console.log('✅ Already URLs, skipped.');
            skipped++;
            continue;
        }

        // Upload each image
        const newUrls = [];
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (!img || !img.startsWith('data:')) {
                newUrls.push(img); // Keep existing URL as-is
                continue;
            }
            const url = await uploadBase64ToStorage(img, `${safeName}_${product.id}_${i}`);
            if (url) {
                newUrls.push(url);
            } else {
                newUrls.push(img); // Keep base64 as fallback if upload fails
                failed++;
            }
        }

        // Update the product record with new URLs
        const imageValue = newUrls.length === 1 ? newUrls[0] : newUrls;
        const { error: updateError } = await supabase
            .from('products')
            .update({ image: imageValue })
            .eq('id', product.id);

        if (updateError) {
            console.log(`❌ DB update failed: ${updateError.message}`);
            failed++;
        } else {
            console.log(`🖼  Migrated ${newUrls.length} image(s).`);
            migrated++;
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
    }

    console.log('\n═══════════════════════════════════');
    console.log(`✅ Migrated:  ${migrated} products`);
    console.log(`⏭  Skipped:   ${skipped} products (already URLs or no image)`);
    console.log(`❌ Failed:    ${failed} images`);
    console.log('═══════════════════════════════════');
    console.log('\n🎉 Migration complete! Your shop will now load MUCH faster.');
}

migrate().catch(console.error);
