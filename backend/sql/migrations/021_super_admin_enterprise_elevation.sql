-- ==============================================================================
-- MIGRATION 021: SUPER ADMIN ENTERPRISE ELEVATION & FINANCIAL COMMAND
-- ==============================================================================
-- 1. Financial Settlement & Vendor Payouts Table
-- 2. Immutable Platform Audit Logs
-- 3. Persistent Platform System Settings
-- 4. Native Promotional Banners & Countdown Timers
-- ==============================================================================

-- 1. Create Vendor Payouts Escrow & Settlement Table
CREATE TABLE IF NOT EXISTS public.vendor_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES public.customers(id),
    gross_amount DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00, -- e.g. 10.00%
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
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON public.vendor_payouts(status);

-- 2. Create Immutable Platform Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id INTEGER NOT NULL REFERENCES public.customers(id),
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'approve_shop', 'ban_shop', 'update_algorithm', 'delete_product', 'change_settings', etc.
    target_entity VARCHAR(50) NOT NULL, -- 'shops', 'products', 'algorithm_configs', 'system_settings', 'payouts', 'banners'
    target_id VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.admin_audit_logs(target_entity, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.admin_audit_logs(actor_id);

-- 3. Create Persistent Platform System Settings Table (Zero Serverless Reset)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default settings if not existing
INSERT INTO public.system_settings (key, value)
VALUES ('platform_settings', '{
    "general": {
        "storeName": "PerfumeHub",
        "storeNameAr": "بيرفيوم هب",
        "tagline": "Best Luxury Perfumes & Fragrances in Qatar & Middle East",
        "taglineAr": "أفخم العطور الفاخرة في قطر والشرق الأوسط",
        "contactEmail": "support@perfumehubqa.com",
        "supportPhone": "+974 5555 1234",
        "whatsappNumber": "+974 5555 1234",
        "defaultCurrency": "QAR",
        "storeAddress": "Lusail Marina Promenade, Doha, Qatar"
    },
    "orders": {
        "freeShippingThreshold": 300,
        "standardShippingFee": 25,
        "expressShippingFee": 50,
        "enableExpressShipping": true,
        "enableStorePickup": true,
        "giftWrapFee": 10,
        "enableGiftWrap": true,
        "enableCOD": true,
        "enableCardPayment": true
    },
    "notifications": {
        "adminAlertEmail": "admin@perfumehubqa.com",
        "notifyCustomerOnOrder": true,
        "notifyCustomerOnShipment": true,
        "notifyWhatsAppUpdates": true,
        "lowStockThreshold": 5,
        "dailySummaryEmail": true
    },
    "aiDiscovery": {
        "enableAIFinder": true,
        "aiPersonality": "luxury",
        "matchingSensitivity": "balanced",
        "dailyFreeQueries": 10,
        "maxRecommendationsPerQuery": 6
    },
    "security": {
        "maintenanceMode": false,
        "maintenanceMessage": "PerfumeHub is undergoing scheduled maintenance to bring you an elevated luxury experience. We will be back shortly.",
        "maintenanceMessageAr": "موقع بيرفيوم هب قيد الصيانة المجدولة لتحسين تجربتكم الفاخرة. سنعود قريباً.",
        "allowGuestCheckout": true,
        "sessionTimeoutHours": 24,
        "maxConcurrentDevices": 3,
        "requireStrongPassword": true
    }
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Create Native Banners Table
CREATE TABLE IF NOT EXISTS public.banners (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type VARCHAR(50) DEFAULT 'top_banner',
    title_en TEXT,
    title_ar TEXT,
    badge VARCHAR(50),
    discount_code VARCHAR(50),
    link_url TEXT,
    countdown_end TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners(is_active, display_order);
