-- ==============================================================================
-- PERFUMEHUB MASTER DATABASE SCHEMA
-- PostgreSQL / Supabase Edition
-- ==============================================================================
-- Unified, production-ready schema for the entire PerfumeHub Multi-Vendor 
-- Marketplace, global catalog, geospatial services, click & collect reservations,
-- subscriptions, coupons, and role-based access control.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. CORE CUSTOMERS & USERS
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer', -- customer, vendor, regional_admin, super_admin, admin
    shop_id UUID,
    phone VARCHAR(50),
    google_id VARCHAR(255),
    avatar_url TEXT,
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT false,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_role ON customers(role);

-- 3. COUNTRIES & REGIONS
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    iso_code VARCHAR(3) UNIQUE,
    default_currency VARCHAR(3) DEFAULT 'QAR',
    calling_code VARCHAR(10) DEFAULT '+974',
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    currency VARCHAR(3) DEFAULT 'QAR',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS admin_region_mapping (
    admin_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
    PRIMARY KEY (admin_id, region_id)
);

-- 4. SHOPS & VENDORS
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geo_location geometry(Point, 4326),
    logo_url TEXT,
    banner_url TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, suspended, rejected
    tier VARCHAR(20) DEFAULT 'standard',  -- standard, premium, enterprise
    trust_score DECIMAL(3,2) DEFAULT 0.00,
    is_featured BOOLEAN DEFAULT false,
    manual_boost_multiplier DECIMAL(3,2) DEFAULT 1.00,
    rating_avg DECIMAL(2,1) DEFAULT 4.0,
    review_count INTEGER DEFAULT 0,
    region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shops_geo_location ON shops USING GIST (geo_location);

-- 5. GLOBAL PRODUCT CATALOG
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    type VARCHAR(100),
    size JSONB DEFAULT '[]'::jsonb,
    price DECIMAL(10, 2) NOT NULL,
    oldPrice DECIMAL(10, 2),
    discount INT DEFAULT 0,
    isNew BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    isFeatured BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    image JSONB DEFAULT '[]'::jsonb,
    category JSONB DEFAULT '[]'::jsonb,
    gender VARCHAR(50),
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    stock INT DEFAULT 10,
    notes JSONB DEFAULT '[]'::jsonb,
    vibes JSONB DEFAULT '[]'::jsonb,
    occasions JSONB DEFAULT '[]'::jsonb,
    seasons JSONB DEFAULT '[]'::jsonb,
    reason TEXT,
    topNotes TEXT,
    middleNotes TEXT,
    baseNotes TEXT,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);

-- 6. VENDOR INVENTORY
CREATE TABLE IF NOT EXISTS vendor_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    pickup_available BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_stock_reserved CHECK (stock >= reserved_quantity),
    UNIQUE(product_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON vendor_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shop ON vendor_inventory(shop_id);

-- 7. ORDERS & SUB-ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customerName VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    total DECIMAL(10, 2) NOT NULL,
    shippingAddress TEXT,
    paymentMethod VARCHAR(100) DEFAULT 'Cash On Delivery',
    items JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'Pending',
    shop_ids JSONB DEFAULT '[]'::jsonb,
    fulfillment_type VARCHAR(20) DEFAULT 'delivery',
    pickup_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS sub_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    vendor_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending',
    fulfillment_type VARCHAR(20) DEFAULT 'delivery',
    subtotal DECIMAL(10, 2) NOT NULL,
    shipping_fee DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    tracking_number VARCHAR(100),
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sub_orders_parent ON sub_orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_shop ON sub_orders(shop_id);

-- 8. CLICK & COLLECT RESERVATIONS
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    status VARCHAR(20) DEFAULT 'pending',
    pickup_time_start TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup_time_end TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verification_code VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_shop ON reservations(shop_id);

-- 9. COUPONS & DISCOUNTS
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percentage INT DEFAULT 0,
    discount_type VARCHAR(20) DEFAULT 'percentage',
    discount_value NUMERIC,
    is_active BOOLEAN DEFAULT true,
    expiry_date DATE,
    usage_limit INTEGER DEFAULT 1000,
    usage_count INTEGER DEFAULT 0,
    used_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_upper ON coupons (UPPER(code));

-- 10. SHIPPING RULES
CREATE TABLE IF NOT EXISTS shipping_rules (
    id SERIAL PRIMARY KEY,
    area VARCHAR(100) NOT NULL,
    charge DECIMAL(10, 2) NOT NULL,
    free_threshold DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    interval VARCHAR(20) DEFAULT 'month',
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- 12. DISCOVERY & BANNERS
CREATE TABLE IF NOT EXISTS discover_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    placement_slot VARCHAR(50) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_discover_active ON discover_campaigns(active, start_date, end_date);

CREATE TABLE IF NOT EXISTS banners (
    id VARCHAR(100) PRIMARY KEY,
    type VARCHAR(50) DEFAULT 'top_banner',
    title_en TEXT,
    title_ar TEXT,
    badge VARCHAR(50),
    discount_code VARCHAR(50),
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 13. RECOMMENDATION ENGINE & EXCHANGE RATES
CREATE TABLE IF NOT EXISTS algorithm_configs (
    id VARCHAR(50) PRIMARY KEY,
    weight_trust DECIMAL(3,2) DEFAULT 0.25,
    weight_tier DECIMAL(3,2) DEFAULT 0.15,
    weight_distance DECIMAL(3,2) DEFAULT 0.20,
    weight_rating DECIMAL(3,2) DEFAULT 0.20,
    weight_price DECIMAL(3,2) DEFAULT 0.20,
    max_distance_km INTEGER DEFAULT 100,
    new_vendor_boost DECIMAL(3,2) DEFAULT 0.10,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS currency_exchange_rates (
    code VARCHAR(3) PRIMARY KEY,
    rate_to_qar DECIMAL(10, 6) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 14. SOFT-DELETE BACKUPS ARCHIVE
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    deleted_by INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_backups_table ON backups(table_name);
