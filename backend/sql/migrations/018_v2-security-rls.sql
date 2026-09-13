-- ===================================================================================
-- MULTI-VENDOR ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================================
-- This script enables Row Level Security on critical tables to ensure that
-- vendors can only ever access their own data, regardless of backend API bugs.

-- 1. Enable RLS on the tables
ALTER TABLE public.vendor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- 2. Define the authentication helper function
-- This assumes the backend sets the 'request.jwt.claim.shop_id' during the Supabase client initialization
-- OR you use auth.uid() mapped to the users table.

-- Policy for vendor_inventory: Vendors can only SELECT/UPDATE/INSERT/DELETE their own products
CREATE POLICY "Vendors manage own products" 
ON public.vendor_inventory 
FOR ALL
USING (
  -- Super Admin bypass
  (current_setting('request.jwt.claims', true)::json->>'role' = 'super_admin') 
  OR 
  -- Vendor match
  (shop_id = (current_setting('request.jwt.claims', true)::json->>'shop_id')::uuid)
);

-- Policy for vendor_inventory: Customers can SELECT active products
CREATE POLICY "Public can view active products" 
ON public.vendor_inventory 
FOR SELECT
USING (stock > 0 AND is_active = true);


-- Note: Since order items are stored as JSONB in the orders table, 
-- we secure the orders table directly based on the customer_id or shop context.
-- If multi-vendor orders are split, each shop would view their specific order record.

-- Policy for orders: Customers can only view their own orders
CREATE POLICY "Customers view own orders" 
ON public.orders
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role' IN ('super_admin', 'regional_admin'))
  OR
  (email = (current_setting('request.jwt.claims', true)::json->>'email'))
);

-- Prevent Cross-Tenant Data Leakage in Shops
-- Vendors can only UPDATE their own shop profile
CREATE POLICY "Vendors update own shop"
ON public.shops
FOR UPDATE
USING (
  (current_setting('request.jwt.claims', true)::json->>'role' = 'super_admin')
  OR
  (id = (current_setting('request.jwt.claims', true)::json->>'shop_id')::uuid)
);
