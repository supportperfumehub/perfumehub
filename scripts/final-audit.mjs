import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://zfdobbrogwismbziloej.supabase.co',
    'sb_secret_Wa6CGtbNgkkf_t10rN7A9A_UiSZ4vUc'
);

async function finalAudit() {
    console.log('🧐 Starting Final Deep-Scan of all product links...\n');

    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, image');

    if (error) {
        console.error('❌ Failed to fetch products:', error.message);
        process.exit(1);
    }

    let brokenCount = 0;
    let totalCount = products.length;
    let categoryStats = {
        supabase: 0,
        external: 0,
        placeholder: 0,
        broken: 0,
        empty: 0
    };

    const issues = [];

    for (const product of products) {
        let images = Array.isArray(product.image) ? product.image : [product.image];
        
        if (!product.image || (Array.isArray(product.image) && product.image.length === 0)) {
            categoryStats.empty++;
            issues.push(`[${product.id}] ${product.name}: ⚠️ EMPTY IMAGE FIELD`);
            continue;
        }

        for (const img of images) {
            const sImg = String(img);
            if (sImg.startsWith('/assets/')) {
                categoryStats.broken++;
                issues.push(`[${product.id}] ${product.name}: ❌ REMAINING BROKEN PATH: ${sImg}`);
            } else if (sImg.includes('supabase.co/storage')) {
                categoryStats.supabase++;
            } else if (sImg.includes('placehold.co')) {
                categoryStats.placeholder++;
            } else if (sImg.startsWith('http')) {
                categoryStats.external++;
            } else if (sImg.startsWith('data:')) {
                categoryStats.broken++;
                issues.push(`[${product.id}] ${product.name}: 📦 REMAINING BASE64 (MIGRATION MISSED)`);
            } else {
                categoryStats.broken++;
                issues.push(`[${product.id}] ${product.name}: ❓ UNKNOWN FORMAT: ${sImg.substring(0, 50)}`);
            }
        }
    }

    console.log('📊 FINAL REPORT:');
    console.log(`✅ Supabase Storage: ${categoryStats.supabase}`);
    console.log(`✅ External URLs:   ${categoryStats.external}`);
    console.log(`✅ Placeholders:    ${categoryStats.placeholder}`);
    console.log(`⚠️ Empty Fields:    ${categoryStats.empty}`);
    console.log(`❌ Broken/Unknown:  ${categoryStats.broken}`);
    console.log('\n--- Details ---');
    if (issues.length === 0) {
        console.log('✨ EVERYTHING IS PERFECT! No broken links found.');
    } else {
        issues.forEach(issue => console.log(issue));
    }
}

finalAudit().catch(console.error);
