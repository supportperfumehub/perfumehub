-- Migration Script: Reserve in Shop Feature
-- Run this in your Supabase SQL Editor

-- 1. Add reserved_quantity to vendor_inventory
ALTER TABLE vendor_inventory
ADD COLUMN IF NOT EXISTS reserved_quantity INT DEFAULT 0;

-- 2. Add constraint to prevent overselling
ALTER TABLE vendor_inventory
ADD CONSTRAINT check_stock_reserved CHECK (stock >= reserved_quantity);

-- 3. Create Reservation Status Enum
DO $$ BEGIN
    CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Create Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    status reservation_status DEFAULT 'pending',
    pickup_time_start TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup_time_end TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_shop ON reservations(shop_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status_expires ON reservations(status, expires_at);

-- 5. RPC to safely create a reservation
CREATE OR REPLACE FUNCTION create_reservation(
    p_customer_id INTEGER,
    p_shop_id UUID,
    p_product_id INTEGER,
    p_quantity INT,
    p_pickup_start TIMESTAMP WITH TIME ZONE,
    p_pickup_end TIMESTAMP WITH TIME ZONE
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_reservation_id UUID;
    v_available_stock INT;
BEGIN
    -- Explicitly lock the row for update to prevent race conditions
    SELECT (stock - reserved_quantity) INTO v_available_stock
    FROM vendor_inventory
    WHERE shop_id = p_shop_id AND product_id = p_product_id
    FOR UPDATE;

    IF v_available_stock IS NULL THEN
        RAISE EXCEPTION 'Inventory record not found';
    END IF;

    IF v_available_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_available_stock, p_quantity;
    END IF;

    -- Increment reserved stock
    UPDATE vendor_inventory
    SET reserved_quantity = reserved_quantity + p_quantity,
        updated_at = timezone('utc'::text, now())
    WHERE shop_id = p_shop_id AND product_id = p_product_id;

    -- Insert reservation
    INSERT INTO reservations (
        customer_id, shop_id, product_id, quantity, status, 
        pickup_time_start, pickup_time_end, expires_at
    ) VALUES (
        p_customer_id, p_shop_id, p_product_id, p_quantity, 'pending',
        p_pickup_start, p_pickup_end, p_pickup_end + interval '1 hour'
    ) RETURNING id INTO v_reservation_id;

    RETURN v_reservation_id;
END;
$$;

-- 6. RPC to safely complete a reservation
CREATE OR REPLACE FUNCTION complete_reservation(p_reservation_id UUID) 
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_shop_id UUID;
    v_product_id INTEGER;
    v_quantity INT;
    v_status reservation_status;
BEGIN
    SELECT shop_id, product_id, quantity, status 
    INTO v_shop_id, v_product_id, v_quantity, v_status
    FROM reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF v_status != 'confirmed' THEN
        RAISE EXCEPTION 'Only confirmed reservations can be completed.';
    END IF;

    -- Update inventory (deduct from both stock and reserved_quantity)
    UPDATE vendor_inventory
    SET stock = stock - v_quantity,
        reserved_quantity = reserved_quantity - v_quantity,
        updated_at = timezone('utc'::text, now())
    WHERE shop_id = v_shop_id AND product_id = v_product_id;

    -- Update reservation
    UPDATE reservations
    SET status = 'completed',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_reservation_id;

    RETURN TRUE;
END;
$$;

-- 7. RPC to cancel or expire a reservation
CREATE OR REPLACE FUNCTION cancel_reservation(p_reservation_id UUID, p_new_status reservation_status) 
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_shop_id UUID;
    v_product_id INTEGER;
    v_quantity INT;
    v_status reservation_status;
BEGIN
    SELECT shop_id, product_id, quantity, status 
    INTO v_shop_id, v_product_id, v_quantity, v_status
    FROM reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF v_status IN ('completed', 'cancelled', 'expired') THEN
        RAISE EXCEPTION 'Reservation is already closed.';
    END IF;

    IF p_new_status NOT IN ('cancelled', 'expired') THEN
        RAISE EXCEPTION 'Invalid target status for cancellation.';
    END IF;

    -- Release reserved stock
    UPDATE vendor_inventory
    SET reserved_quantity = reserved_quantity - v_quantity,
        updated_at = timezone('utc'::text, now())
    WHERE shop_id = v_shop_id AND product_id = v_product_id;

    -- Update reservation
    UPDATE reservations
    SET status = p_new_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_reservation_id;

    RETURN TRUE;
END;
$$;
