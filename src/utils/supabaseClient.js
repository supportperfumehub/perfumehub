import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Supabase environment variables are missing! Google Login will not work.');
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : { auth: { signInWithOAuth: () => { alert('Supabase not configured!'); return { error: { message: 'Not configured' } }; }, onAuthStateChange: () => ({ data: { subscription: null } }) } };
