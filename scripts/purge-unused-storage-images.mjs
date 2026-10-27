import { supabase } from '../backend/src/config/supabaseClient.js';

async function purgeUnusedImages() {
    console.log('🔄 Fetching active image references from database...');
    const { data: products } = await supabase.from('products').select('image');
    const { data: shops } = await supabase.from('shops').select('logo_url, images');
    
    const usedUrls = new Set();
    function extract(v) {
        if (!v) return;
        if (typeof v === 'string') {
            try { 
                const parsed = JSON.parse(v);
                if (Array.isArray(parsed)) parsed.forEach(extract);
                else usedUrls.add(v);
            } catch { 
                usedUrls.add(v); 
            }
        } else if (Array.isArray(v)) {
            v.forEach(extract);
        }
    }

    products?.forEach(p => extract(p.image));
    shops?.forEach(s => { extract(s.logo_url); extract(s.images); });
    console.log(`✅ Found ${usedUrls.size} active image references in database.`);

    async function listBucket(folder = '') {
        const { data, error } = await supabase.storage.from('product-images').list(folder, { limit: 1000 });
        if (error) { 
            console.error('Error listing folder:', folder, error); 
            return []; 
        }
        let files = [];
        for (const item of data) {
            const currentPath = folder ? `${folder}/${item.name}` : item.name;
            if (!item.id && !item.metadata) {
                const nested = await listBucket(currentPath);
                files = files.concat(nested);
            } else {
                files.push(currentPath);
            }
        }
        return files;
    }

    console.log('🔄 Scanning product-images bucket...');
    const allFiles = await listBucket();
    console.log(`Total files in bucket: ${allFiles.length}`);

    const unusedFiles = allFiles.filter(f => !Array.from(usedUrls).some(u => u.includes(f)));
    console.log(`🗑️  Unused files identified: ${unusedFiles.length}`);

    if (unusedFiles.length === 0) {
        console.log('✅ Bucket is already completely clean!');
        return;
    }

    console.log('\n🚀 Deleting unused files from Supabase Storage...');
    const batchSize = 25;
    let deleted = 0;
    for (let i = 0; i < unusedFiles.length; i += batchSize) {
        const batch = unusedFiles.slice(i, i + batchSize);
        const { data, error } = await supabase.storage.from('product-images').remove(batch);
        if (error) {
            console.error(`❌ Batch deletion error:`, error.message);
        } else {
            deleted += (data ? data.length : batch.length);
            console.log(`  Purged ${deleted} / ${unusedFiles.length} files...`);
        }
    }

    console.log('\n🔍 Verifying remaining bucket contents...');
    const remaining = await listBucket();
    console.log(`✅ Success! Remaining files in product-images bucket (${remaining.length}):`);
    remaining.forEach(f => console.log(`  - ${f}`));
}

purgeUnusedImages()
    .catch(err => {
        console.error('Unexpected error:', err);
        process.exit(1);
    });
