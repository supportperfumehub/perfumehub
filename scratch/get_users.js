import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getUsers() {
    const { data, error } = await supabase.from('customers')
        .select('email, role, password, password_hash')
        .in('role', ['super_admin', 'admin']);
    if (error) {
        console.error('Error fetching users:', error);
        process.exit(1);
    }
    console.log(JSON.stringify(data, null, 2));
}

getUsers();
