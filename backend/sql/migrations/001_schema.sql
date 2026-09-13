-- Migration Script for PerfumeHub
-- Copy and paste this into the Supabase SQL Editor to add missing columns.

-- 1. Update Products Table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS vibes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS occasions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS seasons JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE;

-- 2. Update Coupons Table
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS discount_value NUMERIC,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS used_by JSONB DEFAULT '[]'::jsonb;

-- 3. Ensure case-insensitive index on coupon codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_upper ON coupons (UPPER(code));
