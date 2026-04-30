-- V2 Multi-Vendor Architecture Migration Script
-- Execute this script in your Supabase SQL Editor

-- 1. Enable PostGIS Extension (Required for Geospatial Search)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Modify Shops Table (Geospatial and Trust Features)
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS geo_location geometry(Point, 4326),
ADD COLUMN IF NOT EXISTS trust_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'standard'; -- standard, premium, enterprise

-- Create a spatial index for the shops table
CREATE INDEX IF NOT EXISTS idx_shops_geo_location ON shops USING GIST (geo_location);
-- Backfill the geo_location column using existing latitude/longitude
UPDATE shops SET geo_location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

-- 3. Discover Campaigns Table (Super Admin Feed)
CREATE TABLE IF NOT EXISTS discover_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    placement_slot VARCHAR(50) NOT NULL, -- e.g. 'homepage_featured', 'search_top'
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_discover_active ON discover_campaigns(active, start_date, end_date);

-- 4. Vendor Inventory Table (Splitting Global Catalog from Vendor Specifics)
-- The existing 'products' table will now act as the Global Catalog.
-- Vendors will add stock and set prices in 'vendor_inventory'.
CREATE TABLE IF NOT EXISTS vendor_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    pickup_available BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(product_id, shop_id) -- A shop can only have one inventory record per basic product
);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON vendor_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shop ON vendor_inventory(shop_id);

-- 5. Modify Orders Table for Fulfillment Types
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(20) DEFAULT 'delivery', -- delivery, pickup
ADD COLUMN IF NOT EXISTS pickup_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;

-- 6. Recommendation and Geospatial Search RPC
-- Priority Queue scoring: Nearest -> Trusted -> Subscription Tier
-- Using standard Haversine ST_DistanceSphere for lightweight distance scoring
CREATE OR REPLACE FUNCTION search_shops(
    user_lat double precision,
    user_lng double precision,
    radius_meters double precision
) 
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    trust_score DECIMAL,
    tier VARCHAR(20),
    distance_meters double precision,
    relevance_score double precision
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        s.id,
        s.name,
        COALESCE(s.trust_score, 0) as trust_score,
        s.tier,
        ST_DistanceSphere(s.geo_location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)) as distance_meters,
        (
            -- Scoring Algorithm
            -- 1. Base Score inversely proportional to distance
            (1000000 / GREATEST(ST_DistanceSphere(s.geo_location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)), 1))
            -- 2. Multiplier for Premium Tier
            * CASE WHEN s.tier = 'premium' THEN 1.5 ELSE 1.0 END
            -- 3. Multiplier for Trust Score (Base score + trust_score)
            * (1.0 + (COALESCE(s.trust_score, 0) * 0.1))
        ) as relevance_score
    FROM shops s
    WHERE s.status = 'active'
      AND ST_DWithin(
          s.geo_location::geography, 
          ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, 
          radius_meters
      )
    ORDER BY relevance_score DESC;
END;
$$;
