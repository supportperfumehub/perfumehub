-- Add Verification Code to Reservations
-- Run this in your Supabase SQL Editor

-- 1. Add column for the human-readable code
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10);

-- 2. Create index for fast lookups by code
CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(verification_code);

-- 3. Update the create_reservation RPC to generate a random 6-digit code
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
    v_code VARCHAR(10);
BEGIN
    -- Generate a random 6-digit verification code
    v_code := lpad(floor(random() * 1000000)::text, 6, '0');

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
        pickup_time_start, pickup_time_end, expires_at,
        verification_code
    ) VALUES (
        p_customer_id, p_shop_id, p_product_id, p_quantity, 'pending',
        p_pickup_start, p_pickup_end, p_pickup_end + interval '1 hour',
        v_code
    ) RETURNING id INTO v_reservation_id;

    RETURN v_reservation_id;
END;
$$;
