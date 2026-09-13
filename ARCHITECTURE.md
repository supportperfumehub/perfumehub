# PerfumeHub Systems Architecture & Technical Manual

This document details the architectural decisions, database modeling, geospatial routing, fulfillment workflows, and security protocols of the **PerfumeHub Multi-Vendor Marketplace**.

---

## 1. High-Level System Design

PerfumeHub operates on a decoupled client-server architecture:
- **Presentation Tier**: Single-Page Application (SPA) built on React 19 and Vite 7, deployed to Vercel global Edge Network.
- **Application Tier**: Express.js REST API layer providing request validation, role-based access control (RBAC), rate limiting, and business orchestrations.
- **Persistence Tier**: Managed PostgreSQL 15 via Supabase, with PostGIS spatial extensions, Row-Level Security (RLS), and custom PL/pgSQL transaction functions.

---

## 2. Multi-Vendor Inventory & Catalog Model

To prevent catalog duplication while allowing multiple vendors to stock identical fragrances at different prices, PerfumeHub splits products into two distinct layers:

### Global Catalog (products)
- Acts as the central master repository of perfume records (e.g., Dior Sauvage EDP 100ml).
- Stores standard attributes: brand, fragrance families (notes, vibes, occasions, seasons), SKU, and media.
- Maintained centrally by Super Admins.

### Vendor Inventory (`vendor_inventory`)
- Represents a vendor retail branch listing for a product.
- Controls shop_id, product_id, price, stock, reserved_quantity, and pickup_available.
- Constraint: UNIQUE(product_id, shop_id) ensures each shop has exactly one pricing/stock record per master product.

---

## 3. Geospatial Shop Search & Proximity Engine

PerfumeHub leverages **PostGIS** to calculate distance between shoppers and vendor retail branches.
- Data Storage: Each vendor store contains a PostGIS Point (geo_location geometry(Point, 4326)) with GIST index.
- Scoring Algorithm (search_shops RPC): Ranks shops by proximity, tier multiplier (premium vs standard), and trust score.

---

## 4. Multi-Vendor Order Splitting Lifecycle

1. Master Order Creation (orders): Single order record created with total, shipping address, and full cart items.
2. Automated Order Splitting (split_order_to_vendors RPC): Splits cart into sub_orders per shop_id.
3. Vendor Notification: Vendors independently process and fulfill their respective sub_orders.

---

## 5. Click & Collect (Store Reservation System)

1. Atomic Reservation Flow (create_reservation RPC): Locks row via FOR UPDATE, verifies stock, increments reserved_quantity.
2. Generates 6-digit verification code with pickup window and expiration time.
3. In-store verification in Vendor Portal completes collection and deducts inventory.

---

## 6. Authentication & Security Architecture

- Access Tokens: 15-minute signed JWTs with user ID, role, and assigned regions.
- Refresh Tokens: 7-day secure HTTP-only cookies paired with localStorage backup.
- Invisible Refresh Queue: Axios client interceptor queues concurrent requests during token renewal.
- RBAC: super_admin, regional_admin, vendor, customer.

---

## 7. Frontend State Architecture

- AuthContext: User session, refresh event listener, RBAC guards.
- ShopContext: Catalog caching, vendor inventory mapping, active filters.
- CartContext: Local shopping cart synchronization and calculations.
- RegionContext: GCC country, currency conversions, regional scoping.
- WishlistContext: Saved favorites list with persistence.
