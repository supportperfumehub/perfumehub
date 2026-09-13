-- Data Migration Script: Move existing product data into vendor_inventory
-- Run this in your Supabase SQL Editor if you have existing products.

INSERT INTO vendor_inventory (product_id, shop_id, price, stock, is_active, pickup_available)
SELECT 
    id as product_id,
    shop_id,
    COALESCE(price, 0) as price,
    COALESCE(stock, 0) as stock,
    true as is_active,
    false as pickup_available
FROM products
WHERE shop_id IS NOT NULL
ON CONFLICT (product_id, shop_id) DO NOTHING;

-- Optionally, you can now remove these columns from products if you are confident:
-- ALTER TABLE products DROP COLUMN price;
-- ALTER TABLE products DROP COLUMN stock;
-- ALTER TABLE products DROP COLUMN old_price;
-- ALTER TABLE products DROP COLUMN discount;
-- ALTER TABLE products INHERIT... 
-- Note: It is recommended to keep them briefly to ensure the API shift is complete.
