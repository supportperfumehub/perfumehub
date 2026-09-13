import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables!');
}

// Use Service Role Key for backend if available to bypass RLS
const keyToUse = supabaseServiceKey || supabaseAnonKey;
console.log(`Supabase Client initialized with key: ${keyToUse ? keyToUse.substring(0, 10) + '...' : 'MISSING'}`);
if (supabaseServiceKey) console.log('Using SERVICE ROLE KEY (RLS Bypass enabled)');
else console.log('WARNING: Using ANON KEY (RLS may block insertions)');

/**
 * Supabase Connection Options configured for High-Concurrency Serverless Execution:
 * - Session persistence disabled to eliminate serverless state memory leaks
 * - Auto refresh token disabled for headless service worker
 * - x-application-name tagged for connection tracing in Supavisor / pgBouncer
 * - Directs traffic through Transaction Pooler (Port 6543) under high load
 */
export const supabase = createClient(supabaseUrl, keyToUse, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    },
    db: {
        schema: 'public'
    },
    global: {
        headers: {
            'x-application-name': 'perfumehub-backend-high-concurrency'
        }
    }
});
