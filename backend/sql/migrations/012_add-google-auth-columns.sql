-- Migration: Add Google Auth columns to customers table
-- Run this script in your Supabase SQL Editor

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS supabase_id TEXT;

-- Make password column nullable to allow Google OAuth users (who don't have password hashes)
ALTER TABLE customers ALTER COLUMN password DROP NOT NULL;
