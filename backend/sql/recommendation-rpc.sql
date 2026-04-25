-- Standardized Multi-Vendor Recommendation Algorithm
-- Calculated server-side for maximum performance

CREATE OR REPLACE FUNCTION get_recommended_vendors(
    p_id INTEGER,
    u_lat DOUBLE PRECISION,
    u_lng DOUBLE PRECISION
)
RETURNS TABLE (
    inventory_id UUID,
    shop_id UUID,
    shop_name VARCHAR(255),
    price DECIMAL,
    currency VARCHAR(10),
    converted_price_qar DECIMAL,
    dist_km DOUBLE PRECISION,
    trust_score DECIMAL,
    recommendation_score DOUBLE PRECISION,
    badges TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Algorithm Weights
    w_trust DECIMAL; w_tier DECIMAL; w_dist DECIMAL; w_rate DECIMAL; w_price DECIMAL;
    max_d_km INTEGER; nv_boost DECIMAL;
BEGIN
    -- 1. Fetch Current Weights
    SELECT weight_trust, weight_tier, weight_distance, weight_rating, weight_price, max_distance_km, new_vendor_boost
    INTO w_trust, w_tier, w_dist, w_rate, w_price, max_d_km, nv_boost
    FROM algorithm_configs WHERE is_active = true LIMIT 1;

    -- Defaults if no active config
    IF NOT FOUND THEN
        w_trust := 0.25; w_tier := 0.15; w_dist := 0.20; w_rate := 0.20; w_price := 0.20; max_d_km := 100; nv_boost := 0.10;
    END IF;

    RETURN QUERY
    WITH raw_data AS (
        -- Combine inventory, shops, and currencies
        SELECT 
            vi.id as inv_id,
            s.id as s_id,
            s.name as s_name,
            vi.price as p,
            r.currency_code as curr,
            (vi.price * COALESCE(er.rate_to_qar, 1.0)) as p_qar,
            ST_DistanceSphere(s.geo_location, ST_SetSRID(ST_MakePoint(u_lng, u_lat), 4326)) / 1000.0 as d_km,
            COALESCE(s.trust_score, 0) as t_score,
            s.tier as s_tier,
            COALESCE(s.rating_avg, 0) as r_avg,
            s.is_featured,
            s.manual_boost_multiplier,
            (s.review_count = 0 AND s.created_at > (now() - interval '30 days')) as is_new_vendor
        FROM vendor_inventory vi
        JOIN shops s ON vi.shop_id = s.id
        JOIN regions r ON s.region_id = r.id
        LEFT JOIN currency_exchange_rates er ON r.currency_code = er.code
        WHERE vi.product_id = p_id 
          AND vi.is_active = true 
          AND s.status = 'active'
    ),
    stats AS (
        -- Calculate ranges for normalization
        SELECT 
            MIN(p_qar) as min_p, MAX(p_qar) as max_p,
            MIN(d_km) as min_d, MAX(d_km) as max_d
        FROM raw_data
    )
    SELECT 
        rd.inv_id,
        rd.s_id,
        rd.s_name,
        rd.p,
        rd.curr,
        CAST(rd.p_qar AS DECIMAL),
        rd.d_km,
        rd.t_score,
        CAST((
            -- 1. Normalization & Weighted Scoring
            
            -- Trust Score (0-5 normalized)
            (w_trust * (rd.t_score / 5.0)) +
            
            -- Subscription Tier (Mapping)
            (w_tier * (CASE WHEN rd.s_tier = 'premium' THEN 1.0 WHEN rd.s_tier = 'enterprise' THEN 1.2 ELSE 0.5 END)) +
            
            -- Proximity Score (Inverted normalization against max distance limit)
            (w_dist * GREATEST(0, (1.0 - (rd.d_km / max_d_km)))) +
            
            -- Rating Score (Normalized 1-5 to 0-1)
            (w_rate * (rd.r_avg / 5.0)) +
            
            -- Price Competitiveness (Normalized: Lower price = Higher score)
            (w_price * (CASE WHEN stats.max_p = stats.min_p THEN 1.0 ELSE (stats.max_p - rd.p_qar) / (stats.max_p - stats.min_p + 0.01) END)) +
            
            -- 2. Logic Boosters
            (CASE WHEN rd.is_new_vendor THEN nv_boost ELSE 0 END) +
            (CASE WHEN rd.is_featured THEN 0.15 ELSE 0 END)
            
        ) * rd.manual_boost_multiplier AS double precision) as final_score,
        
        -- 3. Dynamic Badges
        ARRAY(
            SELECT b FROM (
                SELECT 'Featured' as b WHERE rd.is_featured
                UNION ALL SELECT 'Best Seller' WHERE rd.t_score >= 4.5
                UNION ALL SELECT 'New Vendor' WHERE rd.is_new_vendor
                UNION ALL SELECT 'Best Price' WHERE rd.p_qar = (SELECT min_p FROM stats)
                UNION ALL SELECT 'Nearest' WHERE rd.d_km = (SELECT min_d FROM stats)
            ) sub WHERE b IS NOT NULL
        ) as badges
    FROM raw_data rd, stats
    -- Hard Filter for Distance
    WHERE rd.d_km <= max_d_km
    ORDER BY final_score DESC;
END;
$$;
