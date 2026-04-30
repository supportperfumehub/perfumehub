-- Migration Script for Multi-Vendor Marketplace Support
-- Run this in your Supabase SQL Editor

-- 1. Create Shops Table
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    logo_url TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, suspended, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for distance sorting (optional, depending on DB usage)
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);

-- 2. Modify Customers Table (Roles)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer',
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;

-- Set existing specific user as admin (you can modify the email here)
-- UPDATE customers SET role = 'admin' WHERE email = 'YOUR_ADMIN_EMAIL';

-- 3. Modify Products Table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE CASCADE;

-- Create an index to quickly find products by shop
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);

-- Note: We omit modifying orders table structure because orders already has items JSON. 
-- We'll add a 'shop_ids' array directly into the `orders` jsonb payload from backend 
-- or we can add it as a column for easier filtering.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shop_ids JSONB DEFAULT '[]'::jsonb;
