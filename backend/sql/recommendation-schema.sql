-- Recommendation Engine Schema & Core Tables
-- Execute this in your Supabase SQL Editor

-- 1. EXTEND SHOPS TABLE
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_boost_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(2,1) DEFAULT 4.0, -- Default to 4.0 for new shops
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- 2. ALGORITHM CONFIGURATION (Tunable Weights)
CREATE TABLE IF NOT EXISTS algorithm_configs (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'default_v1'
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

-- Seed initial config
INSERT INTO algorithm_configs (id, is_active) 
VALUES ('default_v1', true)
ON CONFLICT (id) DO NOTHING;

-- 3. CURRENCY EXCHANGE RATES
-- Base Currency is QAR (Qatar Riyal)
CREATE TABLE IF NOT EXISTS currency_exchange_rates (
    code VARCHAR(3) PRIMARY KEY, -- SAR, GBP, AED, USD
    rate_to_qar DECIMAL(10, 6) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed some rates
INSERT INTO currency_exchange_rates (code, rate_to_qar) VALUES
('QAR', 1.0),
('SAR', 0.97),
('AED', 0.99),
('USD', 3.64),
('GBP', 4.60)
ON CONFLICT (code) DO UPDATE SET rate_to_qar = EXCLUDED.rate_to_qar;
