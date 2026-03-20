import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkImages() {
    const { data, error } = await supabase.from('products').select('name, image').limit(5);
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }
    console.log('Sample images from Supabase:');
    console.log(JSON.stringify(data, null, 2));
}

checkImages();
