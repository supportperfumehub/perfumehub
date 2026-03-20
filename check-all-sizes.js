import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAllSizes() {
    const { data, error } = await supabase.from('products').select('name, size');
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }
    
    const objectsFound = data.filter(p => {
        if (Array.isArray(p.size)) {
            return p.size.some(s => typeof s === 'object' && s !== null);
        }
        return typeof p.size === 'object' && p.size !== null;
    });

    if (objectsFound.length > 0) {
        console.log(`Found ${objectsFound.length} products with object sizes!`);
        console.log(JSON.stringify(objectsFound.slice(0, 3), null, 2));
    } else {
        console.log('No object sizes found in any products.');
    }
}

checkAllSizes();
