import { supabase } from './backend/supabaseClient.js';

async function checkRls() {
    console.log('Checking RLS status for customers table...');
    try {
        // We can check if we can insert a dummy row. 
        // If RLS is on, this will fail with 42501.
        const { data, error } = await supabase
            .from('customers')
            .insert([{ 
                name: 'rls_check', 
                email: 'rls_' + Date.now() + '@check.com', 
                password: 'check' 
            }])
            .select();

        if (error) {
            if (error.code === '42501') {
                console.log('RLS is STILL ON (42501).');
            } else {
                console.error('Insert failed with other error:', error);
            }
        } else {
            console.log('RLS is OFF. Insert successful:', data);
            // Cleanup the check row
            await supabase.from('customers').delete().match({ name: 'rls_check' });
        }
    } catch (err) {
        console.error('System error:', err);
    }
}

checkRls();
