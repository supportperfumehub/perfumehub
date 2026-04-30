import { supabase } from './backend/supabaseClient.js';

async function testRegister() {
    console.log('Attempting to register test user...');
    try {
        const { data, error } = await supabase
            .from('customers')
            .insert([{ 
                name: 'test', 
                email: 'tester_' + Date.now() + '@gmail.com', 
                password: 'Test123' 
            }])
            .select();

        if (error) {
            console.error('Registration failed:', error);
        } else {
            console.log('Registration successful:', data);
        }
    } catch (err) {
        console.error('System error:', err);
    }
}

testRegister();
