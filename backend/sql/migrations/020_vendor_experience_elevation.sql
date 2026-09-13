-- ==============================================================================
-- MIGRATION 020: VENDOR EXPERIENCE ELEVATION & MULTI-BRANCH GOVERNANCE
-- ==============================================================================
-- Run this in your Supabase SQL Editor to support:
-- 1. Database-persisted store operating preferences (hours, delivery, notifications)
-- 2. Bank details & Payout ledger requests
-- 3. Automatic master order status synchronization from sub-orders
-- ==============================================================================

-- 1. Add Operating & Payout Columns to Shops Table
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{"open": "09:00", "close": "22:00", "weekend": "16:00 - 23:30"}'::jsonb,
ADD COLUMN IF NOT EXISTS allow_pickup BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_delivery BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS delivery_window VARCHAR(50) DEFAULT 'same_day',
ADD COLUMN IF NOT EXISTS whatsapp_greeting TEXT DEFAULT 'Thank you for choosing our boutique on PerfumeHub.',
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{"bank_name": "", "account_holder": "", "iban": "", "swift": ""}'::jsonb;

-- 2. Create Payout Requests Table
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    vendor_id INTEGER REFERENCES public.customers(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, rejected
    iban VARCHAR(50),
    bank_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_shop ON public.payout_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_vendor ON public.payout_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

-- 3. Trigger / Helper Function to Sync Sub-Order Fulfillment to Master Order
CREATE OR REPLACE FUNCTION public.evaluate_master_order_status(p_parent_order_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_total_sub_orders INT;
    v_completed_sub_orders INT;
    v_shipped_sub_orders INT;
    v_cancelled_sub_orders INT;
    v_processing_sub_orders INT;
    v_new_status VARCHAR;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('completed', 'delivered')),
        COUNT(*) FILTER (WHERE status = 'shipped'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        COUNT(*) FILTER (WHERE status IN ('processing', 'preparing', 'ready_for_pickup', 'confirmed'))
    INTO 
        v_total_sub_orders,
        v_completed_sub_orders,
        v_shipped_sub_orders,
        v_cancelled_sub_orders,
        v_processing_sub_orders
    FROM public.sub_orders
    WHERE parent_order_id = p_parent_order_id;

    IF v_total_sub_orders = 0 THEN
        RETURN 'pending';
    END IF;

    IF v_completed_sub_orders = v_total_sub_orders THEN
        v_new_status := 'completed';
    ELSIF (v_completed_sub_orders + v_shipped_sub_orders) = v_total_sub_orders THEN
        v_new_status := 'shipped';
    ELSIF (v_completed_sub_orders + v_shipped_sub_orders) > 0 THEN
        v_new_status := 'partially_shipped';
    ELSIF v_cancelled_sub_orders = v_total_sub_orders THEN
        v_new_status := 'cancelled';
    ELSIF v_processing_sub_orders > 0 THEN
        v_new_status := 'processing';
    ELSE
        v_new_status := 'pending';
    END IF;

    UPDATE public.orders
    SET status = v_new_status
    WHERE id = p_parent_order_id;

    RETURN v_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
