import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://zfdobbrogwismbziloej.supabase.co',
    'sb_secret_Wa6CGtbNgkkf_t10rN7A9A_UiSZ4vUc'
);

async function heal() {
    console.log('🩹 Starting Shop Healing: Replacing broken /assets/ paths...');

    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, image');

    if (error) {
        console.error('❌ Failed to fetch products:', error.message);
        process.exit(1);
    }

    let healedCount = 0;

    for (const product of products) {
        let images = Array.isArray(product.image) ? product.image : [product.image];
        let needsHealing = false;

        const newImages = images.map(img => {
            if (typeof img === 'string' && img.startsWith('/assets/')) {
                needsHealing = true;
                // Generate a luxury placeholder with the product name
                const encodedName = encodeURIComponent(product.name || 'Perfume');
                return `https://placehold.co/600x800/1a1a1a/d4af37?text=${encodedName}`;
            }
            return img;
        });

        if (needsHealing) {
            const finalImage = Array.isArray(product.image) ? newImages : newImages[0];
            const { error: updateError } = await supabase
                .from('products')
                .update({ image: finalImage })
                .eq('id', product.id);

            if (updateError) {
                console.error(`  ❌ Failed to heal [${product.id}] ${product.name}:`, updateError.message);
            } else {
                console.log(`  ✅ Healed: [${product.id}] ${product.name}`);
                healedCount++;
            }
        }
    }

    console.log(`\n🎉 Healing complete! ${healedCount} products updated with premium placeholders.`);
}

heal().catch(console.error);
