import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://zfdobbrogwismbziloej.supabase.co',
    'sb_secret_Wa6CGtbNgkkf_t10rN7A9A_UiSZ4vUc'
);

const { data, error } = await supabase
    .from('products')
    .select('id, name, image')
    .limit(5);

if (error) { console.error(error); process.exit(1); }

for (const p of data) {
    const imgVal = p.image;
    const type = typeof imgVal;
    const isArray = Array.isArray(imgVal);
    let preview = '';
    if (isArray) {
        preview = `Array[${imgVal.length}]: first="${String(imgVal[0]).substring(0, 80)}"`;
    } else if (type === 'string') {
        preview = `String: "${imgVal.substring(0, 80)}"`;
    } else {
        preview = `${type}: ${JSON.stringify(imgVal).substring(0, 80)}`;
    }
    console.log(`[${p.id}] ${p.name?.substring(0,30)}`);
    console.log(`  → ${preview}`);
    console.log('');
}
