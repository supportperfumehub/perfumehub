-- Phase 5: RBAC & Row-Level Security (RLS) for vendor_inventory
-- Note: PerfumeHub uses a custom Node.js backend for authentication with integer-based User IDs.
-- Supabase native auth.uid() (UUID) is NOT used. Therefore, RLS should be completely DISABLED 
-- for tables securely accessed via the Node.js backend using the Service Role Key.

-- 1. Disable RLS and drop native user policies to prevent 'integer = uuid' errors
ALTER TABLE vendor_inventory DISABLE ROW LEVEL SECURITY;

-- If you MUST use RLS (e.g., exposing inventory directly to frontend SDK instead of Node.js /api),
-- you would need to use a public SELECT policy and let Node.js handle C/U/D inserts.
-- Example of read-only public access:
-- ALTER TABLE vendor_inventory ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public can view active inventory" ON vendor_inventory FOR SELECT USING (is_active = true);
