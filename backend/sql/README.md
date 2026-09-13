# PerfumeHub Database Documentation

This directory contains the database schema definitions, extensions, tables, relations, and migration scripts for the **PerfumeHub Multi-Vendor Marketplace**.

The database runs on **Supabase (PostgreSQL 15+)** with geospatial PostGIS extensions enabled.

---

## 1. Schema Overview & Core Entities

| Table | Description | Key Relationships |
| :--- | :--- | :--- |
| **`customers`** | Registered users, admins, and shop owners with bcrypt passwords, roles, and 2FA. | `shop_id` &rarr; `shops(id)` |
| **`shops`** | Vendor retail branches with PostGIS `geo_location`, trust scoring, tiers, and status. | `owner_id` &rarr; `customers(id)`, `region_id` &rarr; `regions(id)` |
| **`products`** | Global central perfume & beauty catalog, fragrance notes, categories, and media. | `shop_id` &rarr; `shops(id)` (optional primary vendor) |
| **`vendor_inventory`** | Shop-level stock, localized pricing, reserved stock, and pickup toggles. | `product_id` &rarr; `products(id)`, `shop_id` &rarr; `shops(id)` |
| **`orders`** | Customer checkout orders, delivery address, COD payment, and tracking state. | `user_id` &rarr; `customers(id)`, `pickup_shop_id` &rarr; `shops(id)` |
| **`sub_orders`** | Split vendor sub-orders for multi-vendor fulfillment and status tracking. | `parent_order_id` &rarr; `orders(id)`, `shop_id` &rarr; `shops(id)` |
| **`reservations`** | In-store Click & Collect reservations with temporary inventory hold & pin verification. | `customer_id` &rarr; `customers(id)`, `shop_id` &rarr; `shops(id)` |
| **`coupons`** | Promotional discount codes with percentage/fixed types, limits, and expiry dates. | Standalone |
| **`regions`** | GCC geographic regions with regional currencies and pricing scopes. | `country_id` &rarr; `countries(id)` |
| **`countries`** | Supported GCC and international countries (QAT, SAU, ARE, etc.). | Standalone |
| **`admin_region_mapping`** | Regional Admin assignments restricting admin view to specific geographic zones. | `admin_id` &rarr; `customers(id)`, `region_id` &rarr; `regions(id)` |
| **`subscription_plans`** | Vendor subscription tiers (Free, Premium, Enterprise) with feature flags. | Standalone |
| **`subscriptions`** | Vendor active subscription lifecycle and billing records. | `user_id` &rarr; `customers(id)`, `plan_id` &rarr; `subscription_plans(id)` |
| **`discover_campaigns`** | Paid shop discover campaigns and featured placement slots. | `shop_id` &rarr; `shops(id)` |
| **`banners`** | Promotional banners displayed on the storefront top bar and hero sections. | Standalone |
| **`algorithm_configs`** | Tunable multi-criteria weights for the geospatial recommendation engine. | Standalone |
| **`shipping_rules`** | Area-based delivery fees and free shipping spend thresholds. | Standalone |
| **`backups`** | Audit archive storing soft-deleted products, shops, and orders for recovery. | `deleted_by` &rarr; `customers(id)` |

---

## 2. Directory Layout

- **`MASTER_SCHEMA.sql`**: Complete, monolithic DDL schema script creating all tables, indexes, constraints, and initial configurations.
- **`migrations/`**: Numbered, incremental SQL migration scripts (`001_schema.sql` through `019_migrate-products-to-inventory.sql`) capturing historical database evolution.

---

## 3. Geospatial Features & PostGIS

PerfumeHub leverages PostGIS for distance calculation:
- `shops.geo_location`: Stores 4326 Point `(longitude, latitude)`.
- Spatial Index: `GIST (geo_location)` for sub-millisecond Haversine queries.
- Proximity RPC: `search_shops(user_lat, user_lng, radius_meters)` calculates nearest shops with vendor tier and trust score weighting.

---

## 4. Running Migrations

To apply or verify the schema:
1. Log into the **Supabase Dashboard** for your project.
2. Open the **SQL Editor**.
3. Run `MASTER_SCHEMA.sql` for fresh setups, or individual files from `migrations/` as needed.
