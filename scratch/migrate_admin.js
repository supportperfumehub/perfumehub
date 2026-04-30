import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrateAdmin() {
    const email = 'admin@perfumehub.com';
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 12);

    console.log(`Migrating ${email}...`);
    
    // First try to set it to an empty string to satisfy NOT NULL if present
    const { data, error } = await supabase
        .from('customers')
        .update({ 
            password_hash: hash,
            password: '' // Use empty string instead of NULL if constraint exists
        })
        .eq('email', email)
        .select();

    if (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
    
    console.log('Migration successful:', data);
}

migrateAdmin();
