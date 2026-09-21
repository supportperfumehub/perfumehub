-- 022_user_avatar_support.sql
-- Add avatar_url column to customers table for personal vendor & customer profile photos

ALTER TABLE IF EXISTS customers 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN customers.avatar_url IS 'Public storage URL for user or boutique merchant personal profile avatar';
