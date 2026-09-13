-- Add Password Reset Token support to Customers Table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_customers_reset_token ON customers(reset_token) WHERE reset_token IS NOT NULL;
