import { supabase } from 'file:///c:/Users/LENOVO/OneDrive/Documents/perfumehub/backend/src/config/supabaseClient.js';

async function run() {
    try {
        const { data, error } = await supabase.from('regions').select('*');
        if (error) throw error;
        console.log('Existing Regions:', data);
    } catch (err) {
        console.error('Error:', err.message);
    }
}
run();
