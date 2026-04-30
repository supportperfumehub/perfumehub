-- PerfumeHub Marketplace Expansion Schema
-- Phase 2: Fulfillment & Subscriptions
-- Execute this in the Supabase SQL Editor

-- 1. COUNTRIES & LOCALIZATION
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    iso_code VARCHAR(3) UNIQUE, -- e.g. QAT, SAU, ARE
    default_currency VARCHAR(3),
    calling_code VARCHAR(10),
    is_active BOOLEAN DEFAULT true
);

-- Link Regions to Countries (if not already linked)
ALTER TABLE regions 
ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE;

-- 2. MULTI-VENDOR FULFILLMENT (SUB-ORDERS)
CREATE TABLE IF NOT EXISTS sub_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    vendor_id INTEGER REFERENCES customers(id), -- Redundant but good for indexing
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, shipped, ready_for_pickup, completed, cancelled
    fulfillment_type VARCHAR(20) DEFAULT 'delivery', -- delivery, pickup
    
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

-- 3. SUBSCRIPTION SYSTEM
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    interval VARCHAR(20) DEFAULT 'month', -- month, year
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
    
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active', -- active, past_due, canceled, trialling
    
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- 4. AUTOMATED ORDER SPLITTING (POSTGRES RPC)
-- This function is called after a main order is inserted to split it into sub-orders
CREATE OR REPLACE FUNCTION split_order_to_vendors(p_order_id UUID)
RETURNS void AS $$
DECLARE
    order_record RECORD;
    item RECORD;
    v_shop_id UUID;
    v_sub_order_id UUID;
BEGIN
    -- 1. Fetch the master order
    SELECT * INTO order_record FROM orders WHERE id = p_order_id;
    
    -- 2. Loop through items in the JSONB 'items' column
    -- Assuming items JSON format: [{"id": 1, "shop_id": "...", "price": 100, "quantity": 2}, ...]
    FOR item IN SELECT * FROM jsonb_to_recordset(order_record.items) AS x(id int, shop_id uuid, price decimal, quantity int)
    LOOP
        v_shop_id := item.shop_id;
        
        -- Check if a sub-order already exists for this shop under this parent order
        SELECT id INTO v_sub_order_id FROM sub_orders 
        WHERE parent_order_id = p_order_id AND shop_id = v_shop_id;
        
        IF v_sub_order_id IS NULL THEN
            -- Create new sub-order
            INSERT INTO sub_orders (
                parent_order_id, 
                shop_id, 
                subtotal, 
                total_amount,
                fulfillment_type
            ) VALUES (
                p_order_id,
                v_shop_id,
                (item.price * item.quantity),
                (item.price * item.quantity), -- Simplified, adding shipping/tax later
                order_record.fulfillment_type
            ) RETURNING id INTO v_sub_order_id;
        ELSE
            -- Update existing sub-order total
            UPDATE sub_orders 
            SET subtotal = subtotal + (item.price * item.quantity),
                total_amount = total_amount + (item.price * item.quantity)
            WHERE id = v_sub_order_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
