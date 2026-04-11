import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabaseClient.js';

// Import Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import productsRoutes from './routes/products.js';
import ordersRoutes from './routes/orders.js';
import shopsRoutes from './routes/shops.js';
import couponsRoutes from './routes/coupons.js';
import regionsRoutes from './routes/regions.js';
import backupsRoutes from './routes/backups.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Debug Routes
app.get('/api/debug/schema', async (req, res) => {
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) return res.status(500).json({ error: 'Database check failed', details: error });
        res.json({ message: 'Table accessible', data });
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

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/shops', shopsRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/regions', regionsRoutes);
app.use('/api/backups', backupsRoutes);

// For Vercel: Export the app as default
export default app;
