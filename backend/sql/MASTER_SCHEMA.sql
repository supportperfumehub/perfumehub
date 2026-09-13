-- ==============================================================================
-- PERFUMEHUB MASTER DATABASE SCHEMA
-- PostgreSQL / Supabase Edition
-- Target Integrity Score: 9.5+ / 10
-- ==============================================================================
-- Unified, production-ready schema for the entire PerfumeHub Multi-Vendor 
-- Marketplace, global catalog, geospatial services, click & collect reservations,
-- subscriptions, coupons, atomic transactions, inventory ledger, and RBAC.
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
    shop_id UUID,                        -- Cached default_shop_id populated via trigger; true ownership is shops.owner_id
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
    opening_hours JSONB DEFAULT '{"open": "09:00", "close": "22:00", "weekend": "16:00 - 23:30"}'::jsonb,
    allow_pickup BOOLEAN DEFAULT true,
    allow_delivery BOOLEAN DEFAULT true,
    delivery_window VARCHAR(50) DEFAULT 'same_day',
    whatsapp_greeting TEXT DEFAULT 'Thank you for choosing our boutique on PerfumeHub.',
    low_stock_threshold INTEGER DEFAULT 5,
    bank_details JSONB DEFAULT '{"bank_name": "", "account_holder": "", "iban": "", "swift": ""}'::jsonb,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shops_geo_location ON shops USING GIST (geo_location);
CREATE INDEX IF NOT EXISTS idx_shops_active ON shops (id) WHERE deleted_at IS NULL;

-- 5. GLOBAL PRODUCT CATALOG
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    type VARCHAR(100),
    size JSONB DEFAULT '[]'::jsonb,
    price DECIMAL(10, 2) NOT NULL,
    oldPrice DECIMAL(10, 2),
    old_price DECIMAL(10, 2),
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
    top_notes TEXT,
    middle_notes TEXT,
    base_notes TEXT,
    attributes JSONB DEFAULT '{}'::jsonb,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (id) WHERE deleted_at IS NULL;

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
CREATE INDEX IF NOT EXISTS idx_inventory_lookup ON vendor_inventory (product_id, is_active, stock);
CREATE INDEX IF NOT EXISTS idx_inventory_shop_active ON vendor_inventory (shop_id, is_active);

-- 7. IMMUTABLE INVENTORY AUDIT LEDGER
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES vendor_inventory(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL,
    product_id INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    delta INTEGER NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- 'order_sale', 'reservation_lock', 'reservation_cancel', 'vendor_restock', 'manual_adjustment'
    reference_id VARCHAR(100),        -- order_id, reservation_id, etc.
    performed_by INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_inv ON inventory_logs(inventory_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_shop ON inventory_logs(shop_id);

-- 8. ORDERS & SUB-ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    total DECIMAL(10, 2) NOT NULL,
    shipping_address TEXT,
    payment_method VARCHAR(100) DEFAULT 'Cash On Delivery',
    items JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'pending',
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
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, shipped, ready_for_pickup, completed, cancelled
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
CREATE INDEX IF NOT EXISTS idx_sub_orders_status ON sub_orders(status);

-- 9. RELATIONAL ORDER ITEMS (3NF FINANCIAL ISOLATION)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sub_order_id UUID REFERENCES sub_orders(id) ON DELETE SET NULL,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    size VARCHAR(50),
    is_gift_wrapped BOOLEAN DEFAULT false,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_sub_order ON order_items(sub_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_shop ON order_items(shop_id);

-- 10. CLICK & COLLECT RESERVATIONS
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

-- 11. COUPONS & DISCOUNTS
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
    used_by_phones JSONB DEFAULT '[]'::jsonb,
    used_by_ips JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_upper ON coupons (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (id) WHERE deleted_at IS NULL;

-- 12. SHIPPING RULES
CREATE TABLE IF NOT EXISTS shipping_rules (
    id SERIAL PRIMARY KEY,
    area VARCHAR(100) NOT NULL,
    charge DECIMAL(10, 2) NOT NULL,
    free_threshold DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 13. SUBSCRIPTIONS
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

-- 14. DISCOVERY & NATIVE BANNERS
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL DEFAULT 'top_banner', -- 'top_banner', 'hero_slide', 'promo_strip'
    title_en VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    badge VARCHAR(100),
    discount_code VARCHAR(50),
    link_url TEXT,
    bg_color VARCHAR(30),
    text_color VARCHAR(30),
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_banners_active_order ON banners (type, is_active, display_order);

-- 15. RECOMMENDATION ENGINE & EXCHANGE RATES
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

-- 16. SOFT-DELETE BACKUPS ARCHIVE
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    deleted_by INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_backups_table ON backups(table_name);

-- 17. PAYOUT REQUESTS & FINANCIAL LEDGER
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    vendor_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, rejected
    iban VARCHAR(50),
    bank_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_shop ON payout_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_vendor ON payout_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

-- 17B. VENDOR ESCROW SETTLEMENT & PAYOUTS LEDGER
CREATE TABLE IF NOT EXISTS public.vendor_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES public.customers(id),
    gross_amount DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    commission_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    net_payout DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'approved', 'processing', 'completed', 'rejected'
    bank_account_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    payout_reference VARCHAR(100),
    processed_by INTEGER REFERENCES public.customers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_vendor_payouts_shop ON public.vendor_payouts(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor ON public.vendor_payouts(vendor_id);

-- 17C. IMMUTABLE PLATFORM AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id INTEGER NOT NULL REFERENCES public.customers(id),
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.admin_audit_logs(target_entity, target_id);

-- 17D. PERSISTENT PLATFORM SYSTEM SETTINGS (Zero Serverless Reset)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==============================================================================
-- 18. AUTOMATED TRIGGERS & PL/PGSQL FUNCTIONS
-- ==============================================================================

-- Trigger A: PostGIS Spatial Geometry Synchronization
CREATE OR REPLACE FUNCTION sync_shop_geolocation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geo_location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_shop_geolocation ON shops;
CREATE TRIGGER trg_sync_shop_geolocation
BEFORE INSERT OR UPDATE OF latitude, longitude ON shops
FOR EACH ROW EXECUTE FUNCTION sync_shop_geolocation();

-- Trigger B: Vendor Single Source of Truth & Default Shop Synchronization
CREATE OR REPLACE FUNCTION sync_customer_default_shop()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE customers
        SET shop_id = NEW.id
        WHERE id = NEW.owner_id AND (shop_id IS NULL OR shop_id = NEW.id);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE customers
        SET shop_id = (SELECT id FROM shops WHERE owner_id = OLD.owner_id AND id != OLD.id LIMIT 1)
        WHERE id = OLD.owner_id AND shop_id = OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_customer_default_shop ON shops;
CREATE TRIGGER trg_sync_customer_default_shop
AFTER INSERT OR DELETE ON shops
FOR EACH ROW EXECUTE FUNCTION sync_customer_default_shop();

-- Trigger C: Sub-Order Status Rollup to Parent Order
CREATE OR REPLACE FUNCTION sync_parent_order_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_subs INTEGER;
    v_completed_subs INTEGER;
    v_shipped_subs INTEGER;
    v_cancelled_subs INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('completed', 'delivered')),
        COUNT(*) FILTER (WHERE status IN ('shipped', 'ready_for_pickup', 'completed', 'delivered')),
        COUNT(*) FILTER (WHERE status = 'cancelled')
    INTO v_total_subs, v_completed_subs, v_shipped_subs, v_cancelled_subs
    FROM sub_orders
    WHERE parent_order_id = NEW.parent_order_id;

    IF v_total_subs > 0 THEN
        IF v_completed_subs = v_total_subs THEN
            UPDATE orders SET status = 'completed' WHERE id = NEW.parent_order_id;
        ELSIF v_shipped_subs = v_total_subs THEN
            UPDATE orders SET status = 'shipped' WHERE id = NEW.parent_order_id;
        ELSIF v_shipped_subs > 0 THEN
            UPDATE orders SET status = 'partially_shipped' WHERE id = NEW.parent_order_id;
        ELSIF v_cancelled_subs = v_total_subs THEN
            UPDATE orders SET status = 'cancelled' WHERE id = NEW.parent_order_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_parent_order_status ON sub_orders;
CREATE TRIGGER trg_sync_parent_order_status
AFTER UPDATE OF status ON sub_orders
FOR EACH ROW EXECUTE FUNCTION sync_parent_order_status();

-- Function D: Enhanced Automated Multi-Vendor Sub-Order Splitting
CREATE OR REPLACE FUNCTION split_order_to_vendors(p_order_id INTEGER)
RETURNS void AS $$
DECLARE
    order_record RECORD;
    item RECORD;
    v_shop_id UUID;
    v_sub_order_id UUID;
    v_vendor_id INTEGER;
BEGIN
    SELECT * INTO order_record FROM orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Process relational order_items
    FOR item IN SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
        v_shop_id := item.shop_id;

        SELECT id INTO v_sub_order_id FROM sub_orders 
        WHERE parent_order_id = p_order_id AND shop_id = v_shop_id;

        IF v_sub_order_id IS NULL THEN
            SELECT owner_id INTO v_vendor_id FROM shops WHERE id = v_shop_id;

            INSERT INTO sub_orders (
                parent_order_id, 
                shop_id, 
                vendor_id,
                subtotal, 
                total_amount,
                fulfillment_type,
                status
            ) VALUES (
                p_order_id, 
                v_shop_id, 
                v_vendor_id,
                (item.unit_price * item.quantity),
                (item.unit_price * item.quantity),
                COALESCE(order_record.fulfillment_type, 'delivery'),
                'pending'
            ) RETURNING id INTO v_sub_order_id;
        ELSE
            UPDATE sub_orders 
            SET subtotal = subtotal + (item.unit_price * item.quantity),
                total_amount = total_amount + (item.unit_price * item.quantity)
            WHERE id = v_sub_order_id;
        END IF;

        UPDATE order_items
        SET sub_order_id = v_sub_order_id
        WHERE id = item.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function E: Atomic Multi-Item Order Creation & Stock Reservation RPC
CREATE OR REPLACE FUNCTION place_order_atomic(p_order_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id INTEGER;
    v_item JSONB;
    v_inv_id UUID;
    v_current_stock INTEGER;
    v_reserved_qty INTEGER;
    v_requested_qty INTEGER;
    v_item_price NUMERIC;
BEGIN
    -- 1. Create Master Order Record
    INSERT INTO orders (
        customer_name, email, phone, total, shipping_address, 
        payment_method, fulfillment_type, pickup_shop_id, status, items, shop_ids
    ) VALUES (
        p_order_payload->>'customerName',
        p_order_payload->>'email',
        p_order_payload->>'phone',
        (p_order_payload->>'total')::NUMERIC,
        p_order_payload->>'shippingAddress',
        p_order_payload->>'paymentMethod',
        COALESCE(p_order_payload->>'fulfillment_type', 'delivery'),
        (p_order_payload->>'pickup_shop_id')::UUID,
        CASE WHEN p_order_payload->>'fulfillment_type' = 'pickup' THEN 'reserved' ELSE 'pending' END,
        p_order_payload->'items',
        COALESCE(p_order_payload->'shop_ids', '[]'::jsonb)
    ) RETURNING id INTO v_order_id;

    -- 2. Lock & Decrement Each Inventory Row with Row-Level Locking (FOR UPDATE)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_payload->'items')
    LOOP
        v_requested_qty := (v_item->>'quantity')::INTEGER;

        -- Acquire exclusive lock on the specific vendor inventory row
        SELECT id, stock, reserved_quantity, price 
        INTO v_inv_id, v_current_stock, v_reserved_qty, v_item_price
        FROM vendor_inventory
        WHERE product_id = (v_item->>'product_id')::INTEGER 
          AND shop_id = (v_item->>'shop_id')::UUID
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Inventory record not found for product % at shop %', v_item->>'product_id', v_item->>'shop_id';
        END IF;

        IF (v_current_stock - v_reserved_qty) < v_requested_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product % at shop %. Available: %, Requested: %', 
                v_item->>'product_id', v_item->>'shop_id', (v_current_stock - v_reserved_qty), v_requested_qty;
        END IF;

        -- Decrement physical stock
        UPDATE vendor_inventory
        SET stock = stock - v_requested_qty,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_inv_id;

        -- Insert audit log into inventory_logs
        INSERT INTO inventory_logs (
            inventory_id, shop_id, product_id, previous_stock, new_stock, delta, change_type, reference_id
        ) VALUES (
            v_inv_id,
            (v_item->>'shop_id')::UUID,
            (v_item->>'product_id')::INTEGER,
            v_current_stock,
            v_current_stock - v_requested_qty,
            -v_requested_qty,
            'order_sale',
            v_order_id::TEXT
        );

        -- 3. Insert Relational Line Item
        INSERT INTO order_items (
            order_id, product_id, shop_id, quantity, unit_price, size, is_gift_wrapped
        ) VALUES (
            v_order_id,
            (v_item->>'product_id')::INTEGER,
            (v_item->>'shop_id')::UUID,
            v_requested_qty,
            v_item_price,
            v_item->>'size',
            COALESCE((v_item->>'isGiftWrapped')::BOOLEAN, false)
        );
    END LOOP;

    -- 4. Automatically trigger vendor sub-order splitting
    PERFORM split_order_to_vendors(v_order_id);

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
EXCEPTION WHEN OTHERS THEN
    -- Entire transaction rolls back automatically on error
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ==============================================================================
-- SECTION 14: HIGH-CONCURRENCY COMPOSITE INDEXES & SCALABILITY OPTIMIZATIONS
-- Target: 9.5+ / 10 Site Health, Sub-100ms API Execution, Resilient Serverless State
-- ==============================================================================

-- 1. COMPOSITE INDEXES FOR HIGH-TRAFFIC LOOKUPS
CREATE INDEX IF NOT EXISTS idx_inventory_lookup 
ON public.vendor_inventory (product_id, is_active, stock);

CREATE INDEX IF NOT EXISTS idx_inventory_shop_active 
ON public.vendor_inventory (shop_id, is_active);

CREATE INDEX IF NOT EXISTS idx_sub_orders_shop_status 
ON public.sub_orders (shop_id, status);

CREATE INDEX IF NOT EXISTS idx_reservations_status_expiry 
ON public.reservations (status, expires_at);

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

