import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import config from './config/env.js';
import { supabase } from './config/supabaseClient.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import apiRouter from './routes/index.js';

const app = express();

// Security Headers
app.use(helmet());

// CORS Configuration
const corsOptions = {
    origin: config.server.isProduction ? config.server.frontendUrl : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'x-user-id', 'X-Requested-With', 'Accept', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(cookieParser());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logger (Development / Diagnostics)
if (!config.server.isProduction) {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
    });
}

// Health Check & System Status Endpoint
app.get('/health', async (req, res) => {
    try {
        const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
        const { count: sCount } = await supabase.from('shops').select('*', { count: 'exact', head: true });
        const { count: iCount } = await supabase.from('vendor_inventory').select('*', { count: 'exact', head: true });
        
        res.json({
            status: 'online',
            service: 'PerfumeHub API',
            database: {
                connected: pCount !== null,
                products: pCount || 0,
                shops: sCount || 0,
                inventory: iCount || 0
            },
            environment: config.server.nodeEnv
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Mount Central API Router
app.use('/api', apiLimiter, apiRouter);

// Global Error Handler (Must be last)
app.use(errorHandler);

export default app;

