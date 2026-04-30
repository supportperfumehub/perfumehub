-- Multi-Region Marketplace Architecture Updates
-- Execute this script in the Supabase SQL Editor

-- 1. Create Regions Table
CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) UNIQUE,
    currency_code VARCHAR(5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Admin-Region Mapping Table
CREATE TABLE IF NOT EXISTS admin_region_mapping (
    admin_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES customers(id), -- Super admin who assigned this
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (admin_id, region_id)
);

-- 3. Modify Shops Table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE;

-- Add index to quickly fetch shops by region
CREATE INDEX IF NOT EXISTS idx_shops_region ON shops(region_id);
