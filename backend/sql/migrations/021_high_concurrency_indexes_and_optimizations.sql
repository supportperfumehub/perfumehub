-- ==============================================================================
-- MIGRATION 021: HIGH-CONCURRENCY INDEXES, BANNERS TABLE & DISCOVERY RPC
-- Target: 9.5+ / 10 Site Health, Zero N+1 Queries, Sub-100ms API Execution
-- ==============================================================================

-- 1. COMPOSITE INDEXES FOR HIGH-TRAFFIC LOOKUPS
-- Inventory lookup acceleration for catalog availability
CREATE INDEX IF NOT EXISTS idx_inventory_lookup 
ON public.vendor_inventory (product_id, is_active, stock);

CREATE INDEX IF NOT EXISTS idx_inventory_shop_active 
ON public.vendor_inventory (shop_id, is_active);

-- Sub-order fulfillment acceleration
CREATE INDEX IF NOT EXISTS idx_sub_orders_shop_status 
ON public.sub_orders (shop_id, status);

-- Reservation expiry monitoring
CREATE INDEX IF NOT EXISTS idx_reservations_status_expiry 
ON public.reservations (status, expires_at);

-- Geospatial Index on Shops
CREATE INDEX IF NOT EXISTS idx_shops_geo_gist 
ON public.shops USING GIST (geo_location);


-- 2. DEDICATED PROMOTIONAL BANNERS TABLE
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) DEFAULT 'top_banner',
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    badge VARCHAR(50),
    discount_code VARCHAR(50),
    link_url TEXT,
    bg_color VARCHAR(50),
    text_color VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners (type, is_active, display_order);

-- Initial default promotion banner if table is empty
INSERT INTO public.banners (type, title_en, title_ar, badge, discount_code, link_url, is_active, display_order)
SELECT 'top_banner', 'NEW', 'جديد', 'Special Offer', 'HELLO025', '/shop', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.banners LIMIT 1);


-- 3. PERSISTENT PLATFORM SYSTEM SETTINGS TABLE (Zero volatile RAM loss across serverless lambdas)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


-- 4. SINGLE-QUERY OPTIMIZED DISCOVERY RPC FUNCTION (Zero N+1 Query Waterfall)
CREATE OR REPLACE FUNCTION get_active_discovery_slides(p_region_id INT DEFAULT NULL)
RETURNS TABLE (
    id TEXT,
    campaign_id UUID,
    product_id INT,
    type TEXT,
    placement_slot VARCHAR,
    region_id INT,
    product JSONB,
    shop JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH active_campaigns AS (
        SELECT 
            dc.id AS c_id,
            dc.shop_id AS c_shop_id,
            dc.product_id AS c_product_id,
            dc.placement_slot AS c_placement_slot,
            s.region_id AS s_region_id,
            to_jsonb(s) AS s_json
        FROM discover_campaigns dc
        LEFT JOIN shops s ON s.id = dc.shop_id
        WHERE dc.active = true
          AND dc.start_date <= timezone('utc'::text, now())
          AND dc.end_date >= timezone('utc'::text, now())
          AND (
              p_region_id IS NULL 
              OR s.region_id = p_region_id 
              OR s.region_id IS NULL
          )
    ),
    product_campaigns AS (
        SELECT 
            ('product-' || ac.c_product_id || '-' || ac.c_id)::TEXT AS slide_id,
            ac.c_id AS campaign_id,
            ac.c_product_id AS product_id,
            'product'::TEXT AS slide_type,
            ac.c_placement_slot,
            ac.s_region_id AS region_id,
            (
                to_jsonb(p) || jsonb_build_object(
                    'price', COALESCE(vi.price, p.price)
                )
            ) AS product_data,
            ac.s_json AS shop_data
        FROM active_campaigns ac
        JOIN products p ON p.id = ac.c_product_id
        LEFT JOIN vendor_inventory vi ON vi.product_id = p.id 
                                     AND vi.shop_id = ac.c_shop_id 
                                     AND vi.is_active = true
        WHERE ac.c_product_id IS NOT NULL
    ),
    shop_campaigns AS (
        SELECT 
            ('shop-product-' || vi.product_id || '-' || ac.c_id)::TEXT AS slide_id,
            ac.c_id AS campaign_id,
            vi.product_id,
            'product'::TEXT AS slide_type,
            ac.c_placement_slot,
            ac.s_region_id AS region_id,
            (
                to_jsonb(p) || jsonb_build_object(
                    'price', vi.price
                )
            ) AS product_data,
            ac.s_json AS shop_data
        FROM active_campaigns ac
        JOIN LATERAL (
            SELECT vi_inner.product_id, vi_inner.price
            FROM vendor_inventory vi_inner
            WHERE vi_inner.shop_id = ac.c_shop_id 
              AND vi_inner.is_active = true
            LIMIT 15
        ) vi ON true
        JOIN products p ON p.id = vi.product_id
        WHERE ac.c_product_id IS NULL AND ac.c_shop_id IS NOT NULL
    )
    SELECT * FROM product_campaigns
    UNION ALL
    SELECT * FROM shop_campaigns;
END;
$$ LANGUAGE plpgsql STABLE;


-- 5. DISTRIBUTED RATE LIMITING TABLE (Optional persistent rate limiting store)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key VARCHAR(255) PRIMARY KEY,
    total_hits INTEGER DEFAULT 1,
    reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON public.rate_limits (reset_time);

