-- ==============================================================================
-- Migration 024: Remove Obsolete Discovery Campaigns and Multi-Shop Artifacts
-- ==============================================================================
-- PerfumeHub has transitioned to a single luxury boutique architecture (SA - Super Admin).
-- Multi-vendor shop discovery campaigns and regional targeting are completely retired.

-- 1. Drop discover_campaigns table and any associated indexes/foreign keys
DROP TABLE IF EXISTS discover_campaigns CASCADE;

-- 2. Drop multi-vendor shop boost and featured columns from shops
ALTER TABLE IF EXISTS shops 
    DROP COLUMN IF EXISTS manual_boost_multiplier,
    DROP COLUMN IF EXISTS is_featured;

-- 3. Drop legacy regional admin mapping table if present
DROP TABLE IF EXISTS admin_region_mapping CASCADE;
