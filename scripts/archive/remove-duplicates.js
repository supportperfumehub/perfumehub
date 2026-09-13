import { supabase } from './supabaseClient.js';

const run = async () => {
    try {
        console.log('Fetching all products from Supabase...');
        // Order ascending so the FIRST one created is kept, and later duplicates are deleted
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, brand, created_at')
            .order('created_at', { ascending: true });

        if (error) throw error;

        const seen = new Set();
        const toDelete = [];

        for (const p of products) {
            const key = `${p.brand}-${p.name}`.toLowerCase().trim();
            if (seen.has(key)) {
                console.log(`Duplicate found: [${p.id}] ${p.brand} - ${p.name}`);
                toDelete.push(p.id);
            } else {
                seen.add(key);
            }
        }

        if (toDelete.length > 0) {
            console.log(`Found ${toDelete.length} total duplicates. Deleting...`);
            
            // Delete in batches of 100 because Supabase limits in() array sizes
            for (let i = 0; i < toDelete.length; i += 100) {
                const batch = toDelete.slice(i, i + 100);
                const { error: delError } = await supabase.from('products').delete().in('id', batch);
                if (delError) {
                    console.error('Error deleting batch:', delError.message);
                } else {
                    console.log(`Deleted batch of ${batch.length} duplicates.`);
                }
            }
            console.log('Cleanup complete!');
        } else {
            console.log('No duplicates found in the database! Everything is clean.');
        }
        process.exit(0);
    } catch (e) {
        console.error('Fatal error:', e);
        process.exit(1);
    }
};

run();
