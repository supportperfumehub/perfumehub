-- Nearest Shop Finder: Product-Aware Geospatial Query
-- Run this in your Supabase SQL Editor

-- 1. Partial index for active shops (performance boost)
CREATE INDEX IF NOT EXISTS idx_shops_active_geo 
    ON shops USING GIST (geo_location) 
    WHERE status = 'active';

-- 2. Composite index for inventory lookups (stock-aware)
CREATE INDEX IF NOT EXISTS idx_inventory_active_stock 
    ON vendor_inventory(product_id, shop_id) 
    WHERE is_active = true AND stock > 0;

-- 3. Product-aware nearest shop RPC
CREATE OR REPLACE FUNCTION find_nearest_shops_for_product(
    p_product_id INTEGER,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION DEFAULT 50000,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    shop_id UUID,
    shop_name VARCHAR(255),
    shop_address TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DOUBLE PRECISION,
    trust_score DECIMAL,
    tier VARCHAR(20),
    price DECIMAL,
    available_stock INTEGER,
    relevance_score DOUBLE PRECISION
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        s.address,
        s.latitude,
        s.longitude,
        ST_DistanceSphere(
            s.geo_location, 
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
        ) / 1000.0 AS distance_km,
        COALESCE(s.trust_score, 0) AS trust_score,
        s.tier,
        vi.price,
        (vi.stock - vi.reserved_quantity)::INTEGER AS available_stock,
        (
            -- 40% distance proximity (inverted, normalized)
            (0.40 * GREATEST(0, 1.0 - (
                ST_DistanceSphere(s.geo_location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)) 
                / p_radius_meters
            )))
            -- 30% trust (normalized 0-5 scale)
            + (0.30 * (COALESCE(s.trust_score, 0) / 5.0))
            -- 20% tier bonus
            + (0.20 * CASE 
                WHEN s.tier = 'enterprise' THEN 1.0 
                WHEN s.tier = 'premium' THEN 0.7 
                ELSE 0.3 
              END)
            -- 10% stock depth (more stock = more reliable)
            + (0.10 * LEAST(1.0, (vi.stock - vi.reserved_quantity) / 10.0))
        ) AS relevance_score
    FROM shops s
    INNER JOIN vendor_inventory vi 
        ON vi.shop_id = s.id 
        AND vi.product_id = p_product_id
        AND vi.is_active = true
        AND (vi.stock - vi.reserved_quantity) > 0
    WHERE s.status = 'active'
      AND s.geo_location IS NOT NULL
      AND ST_DWithin(
          s.geo_location::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_radius_meters
      )
    ORDER BY relevance_score DESC
    LIMIT p_limit;
END;
$$;
