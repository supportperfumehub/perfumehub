import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { supabase } from './config/supabaseClient.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Import Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import productsRoutes from './routes/products.js';
import ordersRoutes from './routes/orders.js';
import shopsRoutes from './routes/shops.js';
import couponsRoutes from './routes/coupons.js';
import regionsRoutes from './routes/regions.js';
import backupsRoutes from './routes/backups.js';
import inventoryRoutes from './routes/inventory.js';
import discoverRoutes from './routes/discover.js';
import recommendationRoutes from './routes/recommendations.js';
// import webhooksRoutes from './routes/webhooks.js'; // Removed for COD-only flow
import reservationsRoutes from './routes/reservations.js';
import adminRoutes from './routes/admin.js';
import subscriptionRoutes from './routes/subscriptions.js';

dotenv.config();

const app = express();

// Security Headers
app.use(helmet());

const corsOptions = {
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'x-user-id', 'X-Requested-With', 'Accept', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(cookieParser());

// Webhooks must be parsed as raw body, so they must be mounted BEFORE express.json()
// app.use('/api/webhooks', webhooksRoutes); // Removed for COD flow

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health Check / Diagnostic (At the root)
app.get('/health', async (req, res) => {
    try {
        const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
        const { count: sCount } = await supabase.from('shops').select('*', { count: 'exact', head: true });
        const { count: iCount } = await supabase.from('vendor_inventory').select('*', { count: 'exact', head: true });
        
        res.json({
            status: 'online',
            database: {
                products: pCount || 0,
                shops: sCount || 0,
                inventory: iCount || 0,
                connected: pCount !== null
            },
            environment: process.env.NODE_ENV
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});


// Debug Routes (Disabled in production)
if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug/schema', async (req, res) => {
        try {
            const table = req.query.table || 'customers';
            const { data, error } = await supabase.from(table).select('*').limit(50);
            if (error) return res.status(500).json({ error: `Database check failed for ${table}`, details: error });
            res.json({ message: `Table ${table} accessible`, count: data.length, data });
        } catch (err) {
            res.status(500).json({ error: 'System error', details: err.message });
        }
    });

    app.get('/api/debug/env', (req, res) => {
        res.json({
            hasUrl: !!process.env.SUPABASE_URL,
            hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            urlPrefix: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 10) : 'none',
            nodeEnv: process.env.NODE_ENV
        });
    });
}

// Create API Router
const apiRouter = express.Router();

// Health Check in API
apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));

// Recovery Tool in API
apiRouter.post('/admin/recover-all-products', async (req, res) => {
    try {
        const { products } = req.body;
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ error: 'Invalid products data' });
        }
        const { data, error } = await supabase.from('products').upsert(products, { onConflict: 'name, brand' }).select();
        if (error) throw error;
        res.json({ success: true, count: data.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mount Routes to API Router
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/products', productsRoutes);
apiRouter.use('/orders', ordersRoutes);
apiRouter.use('/shops', shopsRoutes);
apiRouter.use('/coupons', couponsRoutes);
apiRouter.use('/regions', regionsRoutes);
apiRouter.use('/backups', backupsRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/discover', discoverRoutes);
apiRouter.use('/recommendations', recommendationRoutes);
apiRouter.use('/reservations', reservationsRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/subscriptions', subscriptionRoutes);

// Root health check endpoint
app.get('/health', async (req, res) => {
    res.setHeader('X-PerfumeHub-Version', '1.0.2-RESTORED');
    try {
        const { data, error } = await supabase.from('products').select('id', { count: 'exact' });
        if (error) throw error;
        res.json({ status: 'ok', products: data.length, message: 'DATABASE CONNECTED' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Mount the API Router to /api
app.use('/api', (req, res, next) => {
    res.setHeader('X-PerfumeHub-Version', '1.0.2-RESTORED');
    next();
}, apiRouter);

// Error Handler (Must be last)
app.use(errorHandler);

// For Vercel: Export the app as default
export default app;
