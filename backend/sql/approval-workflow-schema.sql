-- 1. Ensure `shops` uses standard statuses: PENDING, APPROVED, REJECTED
-- We'll add the new fields required for the approval workflow
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Standardize existing statuses to uppercase for consistency
UPDATE shops SET status = 'APPROVED' WHERE status IN ('active', 'APPROVED');
UPDATE shops SET status = 'PENDING' WHERE status IN ('pending', 'PENDING');
UPDATE shops SET status = 'REJECTED' WHERE status IN ('suspended', 'rejected', 'REJECTED');

-- Ensure valid statuses only (optional constraint depending on strictness required)
-- ALTER TABLE shops ADD CONSTRAINT chk_shop_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));

-- 2. Validate region tables and admin mappings (if missing from multi-region-schema.sql)
CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS admin_region_mapping (
    admin_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
    PRIMARY KEY (admin_id, region_id)
);
