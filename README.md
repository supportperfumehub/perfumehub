# PerfumeHub - Multi-Vendor Luxury Fragrance & Beauty Marketplace

[![React](https://img.shields.io/badge/React-19.2-61dafb.svg?style=flat&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646cff.svg?style=flat&logo=vite)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-5.2-000000.svg?style=flat&logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2015-3ecf8e.svg?style=flat&logo=supabase)](https://supabase.com/)
[![PostGIS](https://img.shields.io/badge/PostGIS-Geospatial-336791.svg?style=flat)](https://postgis.net/)

**PerfumeHub** is an enterprise-grade multi-vendor e-commerce platform engineered for luxury perfumes, Arabian attars, and beauty products across Qatar and the GCC. It combines a high-performance React 19 storefront with an Express/Supabase micro-architecture supporting geospatial vendor routing, click & collect reservations, order splitting, and AI scent profiling.

---

## Architecture At a Glance

```
                         ┌─────────────────────────────┐
                         │   Vite + React 19 Client   │
                         │  (Port 3000 / Vercel CDN)   │
                         └──────────────┬──────────────┘
                                        │  Proxy /api
                                        ▼
                         ┌─────────────────────────────┐
                         │    Express REST API Layer   │
                         │   (Port 4000 / Serverless)  │
                         └──────────────┬──────────────┘
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │ Supabase PostGIS │  │  JWT & 2FA Auth  │  │ Click & Collect  │
        │ Database & RLS   │  │   Token Refresh  │  │  Reservation RPC │
        └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Key Features

- **Multi-Vendor Marketplace**: Independent vendor stores, localized catalog pricing, multi-branch management, and automated order splitting.
- **Geospatial Shop Locator**: PostGIS-powered Haversine radius queries that rank retail branches by proximity, vendor tier, and trust score.
- **Click & Collect (Reservations)**: In-store pickup with atomic row-level inventory locking and 6-digit verification codes.
- **AI Scent Advisor**: Machine-assisted fragrance discovery matching scent notes (woody, floral, amber, oriental) to customer preferences.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for `super_admin`, `regional_admin`, `vendor`, and `customer`.
- **Multi-Region & Localization**: Full English & Arabic (RTL) support with localized GCC currencies (QAR, SAR, AED, KWD, OMR, BHD).
- **Soft-Delete Archive & Recovery**: Central audit log and one-click item restoration from the Admin Portal.

---

## Directory Structure

```
perfumehub/
├── .env.example                     # Environment configuration template
├── package.json                     # NPM dependencies & task runners
├── vite.config.js                   # Vite configuration with @/ alias & proxy
├── jsconfig.json                    # Path alias resolution for IDEs
├── eslint.config.js                 # Scoped ESLint rules with strict React boundaries
├── ARCHITECTURE.md                  # Deep architectural and systems specification
├── api/
│   └── index.js                     # Vercel serverless function entrypoint
├── backend/
│   ├── sql/
│   │   ├── MASTER_SCHEMA.sql        # Monolithic production database schema
│   │   ├── README.md                # Data dictionary & entity relationships
│   │   └── migrations/              # Chronological numbered SQL migrations (001-019)
│   └── src/
│       ├── app.js                   # Express application & middleware pipeline
│       ├── server.js                # Standalone HTTP server (defaults to port 4000)
│       ├── config/                  # Environment & database client setup
│       ├── routes/                  # API routes (centralized in routes/index.js)
│       ├── controllers/             # Controller layer (auth, shops, users, recs)
│       ├── services/                # Service layer (business logic & rules)
│       ├── repositories/            # Repository layer (Supabase data access)
│       └── middleware/              # Auth guards, upload, validation, rate limiting
├── src/                             # React 19 Frontend Application
│   ├── App.jsx                      # App root router, lazy routes, and RTL logic
│   ├── services/                    # Centralized API service layer
│   │   ├── api.js                   # Axios client with JWT refresh interceptors
│   │   ├── productService.js        # Product catalog API calls
│   │   ├── orderService.js          # Orders & checkout API calls
│   │   ├── shopService.js           # Shop & proximity API calls
│   │   └── authService.js           # Auth & session API calls
│   ├── components/                  # Reusable UI components (Admin, Layout, UI, Vendor)
│   ├── context/                     # Context providers (Auth, Cart, Region, Shop, Wishlist)
│   ├── pages/                       # Route views (Home, Shop, Admin, Vendor, Checkout)
│   └── utils/                       # Frontend helpers (geolocation, compatibility)
├── scripts/                         # Operational & maintenance utilities
│   ├── verify-db.js                 # Modern database health & table count verification
│   ├── sync-data.js                 # Catalog synchronization tool
│   ├── init-db.js                   # Database initialization utility
│   ├── optimize-assets.js           # Image compression & asset optimization
│   └── archive/                     # Preserved historical migration/diagnostic scripts
└── logs/                            # Dedicated runtime log files (gitignored)
```

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **NPM**: v9.0.0 or later
- **Supabase Account**: With PostgreSQL 15+ and PostGIS extension enabled

### 2. Environment Setup
Create your local environment file:
```bash
cp .env.example .env
```
Ensure the following variables are configured in `.env`:
```env
PORT=4000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
```

### 3. Verify Database Connectivity
Test your Supabase connection and view live table record counts:
```bash
npm run db:verify
```

### 4. Run Development Servers
Start both the Express backend (`http://localhost:4000`) and the Vite React frontend (`http://localhost:3000`) concurrently:
```bash
npm run dev:all
# Or run individually:
# npm run server   (starts Express backend with nodemon)
# npm run dev      (starts Vite frontend)
```

---

## Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev:all` | Runs backend server and frontend Vite dev server concurrently |
| `npm run dev` | Runs Vite frontend development server on port 3000 with HMR |
| `npm run server` | Runs Express backend with auto-reload via nodemon on port 4000 |
| `npm run build` | Compiles production-ready frontend bundle into `dist/` |
| `npm run preview` | Locally previews the compiled production build |
| `npm run lint` | Lints codebase using ESLint with React flat config |
| `npm run lint:fix` | Automatically fixes autofixable ESLint warnings/errors |
| `npm run db:verify` | Connects to Supabase, runs health checks, and outputs table records table |
| `npm run sync` | Synchronizes inventory and product catalog |

---

## API Endpoints Overview

All backend endpoints are mounted under `/api` and protected by global rate limiting:

| Prefix | Handler | Description |
| :--- | :--- | :--- |
| `GET /health` | System Health | Overall server and database connectivity status |
| `/api/auth` | Auth Controller | Register, login, refresh token, 2FA, password reset |
| `/api/users` | User Controller | User profiles, account management, address book |
| `/api/products` | Products Router | Global catalog search, filter, pagination, SKU lookups |
| `/api/shops` | Shop Controller | Vendor registration, status workflow, proximity lookup |
| `/api/inventory` | Inventory Router | Vendor stock management, branch pricing |
| `/api/orders` | Orders Router | Order placement, vendor sub-order splitting, tracking |
| `/api/reservations` | Reservations Router | Click & Collect reservation requests and verification |
| `/api/coupons` | Coupons Router | Coupon creation, validation, and usage tracking |
| `/api/regions` | Regions Router | Multi-country and regional admin scopes |
| `/api/admin` | Admin Router | Algorithm weights, discovery boosts, backup recovery |
| `/api/subscriptions`| Subscriptions Router| Vendor SaaS tier plans and subscriptions |
| `/api/banners` | Banners Router | Storefront top and hero promotional banners |
| `/api/backups` | Backups Router | Soft-delete archives and one-click data restoration |

---

## Quality Assurance & Verification

- **Production Build**: Verified via `npm run build` (0 errors, code split into optimized chunks).
- **Linter**: Verified via `npm run lint` (0 fatal errors).
- **Database Status**: Verified via `npm run db:verify` (17/17 tables healthy).

---

## License

Private & Proprietary. All rights reserved by PerfumeHub.

