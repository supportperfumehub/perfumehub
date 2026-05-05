import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Supabase environment variables are missing!');
    if (!supabaseUrl) console.error('Missing: VITE_SUPABASE_URL');
    if (!supabaseAnonKey) console.error('Missing: VITE_SUPABASE_ANON_KEY');
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : { 
        auth: { 
            signInWithOAuth: () => { 
                const msg = `Supabase not configured! Missing: ${!supabaseUrl ? 'URL' : ''} ${!supabaseAnonKey ? 'AnonKey' : ''}`;
                alert(msg); 
                return { error: { message: msg } }; 
            }, 
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getSession: async () => ({ data: { session: null }, error: null })
        } 
    };
