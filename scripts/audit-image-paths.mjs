import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://zfdobbrogwismbziloej.supabase.co',
    'sb_secret_Wa6CGtbNgkkf_t10rN7A9A_UiSZ4vUc'
);

const { data, error } = await supabase
    .from('products')
    .select('id, name, image');

if (error) { console.error(error); process.exit(1); }

let localAssets = 0, supabaseUrls = 0, placeholders = 0, base64 = 0, other = 0;
const localAssetProducts = [];

for (const p of data) {
    const imgs = Array.isArray(p.image) ? p.image : [p.image];
    for (const img of imgs) {
        if (!img) continue;
        if (String(img).startsWith('/assets/')) {
            localAssets++;
            localAssetProducts.push({ id: p.id, name: p.name, img: String(img) });
        } else if (String(img).includes('supabase.co/storage')) {
            supabaseUrls++;
        } else if (String(img).startsWith('http') && String(img).includes('placehold')) {
            placeholders++;
        } else if (String(img).startsWith('data:')) {
            base64++;
        } else {
            other++;
            console.log(`OTHER: [${p.id}] ${p.name} → ${String(img).substring(0,80)}`);
        }
    }
}

console.log('\n═══ Image Storage Breakdown ═══');
console.log(`❌ Broken /assets/ paths:  ${localAssets}`);
console.log(`✅ Supabase Storage URLs:  ${supabaseUrls}`);
console.log(`🔲 Placeholder images:     ${placeholders}`);
console.log(`📦 Base64 (still):         ${base64}`);
console.log(`❓ Other URLs:             ${other}`);
console.log('\nBroken products:');
localAssetProducts.forEach(p => console.log(`  [${p.id}] ${p.name} → ${p.img}`));
