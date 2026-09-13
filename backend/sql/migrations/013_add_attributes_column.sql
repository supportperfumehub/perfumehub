-- Run this in your Supabase SQL Editor to add the attributes column to the products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;
