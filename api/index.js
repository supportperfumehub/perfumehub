import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from '../backend/supabaseClient.js';

dotenv.config();

const app = express();

// Timeout wrapper for Supabase queries
const withTimeout = (promise, ms = 15000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timed out')), ms)
        )
    ]);
};

app.use(cors());
app.use(express.json());

// Main logical routes...
// (I will include all the API endpoints from server.js to ensure full compatibility)

// Debug Route to check table accessibility
app.get('/api/debug/schema', async (req, res) => {
    try {
        console.log("Debug schema request received");
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) {
            console.error("Supabase Error:", error);
            return res.status(500).json({ error: 'Database check failed', details: error, message: error.message });
        }
        res.json({ message: 'Table accessible', data });
    } catch (err) {
        console.error("System Error:", err);
        res.status(500).json({ error: 'System error', details: err.message, stack: err.stack });
    }
});

// Debug Route to check Env Vars visibility on Vercel
app.get('/api/debug/env', (req, res) => {
    res.json({
        hasUrl: !!process.env.SUPABASE_URL,
        hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        urlPrefix: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 10) : 'none',
        nodeEnv: process.env.NODE_ENV
    });
});

// Products
app.get('/api/products', async (req, res) => {
    try {
        let query = supabase.from('products').select('*').order('created_at', { ascending: false });
        if (req.query.shop_id) query = query.eq('shop_id', req.query.shop_id);
        const { data, error } = await withTimeout(query);
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("API Error (/api/products):", error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('products').select('*').eq('id', req.params.id).single();
        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'Product not found' });
            throw error;
        }
        res.json(data);
    } catch (error) {
        console.error("API Error (/api/products/:id):", error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { 
        name, brand, type, size, price, oldPrice, discount, isNew, isFeatured,
        image, category, gender, description, sku, stock,
        notes, vibes, occasions, reason, seasons,
        topNotes, middleNotes, baseNotes, shop_id
    } = req.body;
    try {
        const { data, error } = await supabase.from('products').insert([{
            name, brand, type, size, price, old_price: oldPrice, discount, is_new: isNew, is_featured: isFeatured,
            image, category, gender, description, sku, stock: stock || 10, notes: notes || [], vibes: vibes || [],
            occasions: occasions || [], reason: reason || null, seasons: seasons || [], top_notes: topNotes || null,
            middle_notes: middleNotes || null, base_notes: baseNotes || null, shop_id: shop_id || null
        }]).select();
        if (error) throw error;
        res.status(201).json({ id: data[0].id, message: 'Product created' });
    } catch (error) {
        console.error("API Error (POST /api/products):", error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Auth
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const { data, error } = await supabase.from('customers').insert([{ name, email, password, role: role || 'customer' }]).select();
        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Email exists' });
            throw error;
        }
        res.status(201).json({ user: data[0], message: 'Success' });
    } catch (error) {
        console.error("API Error (/api/auth/register):", error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.from('customers').select('*').eq('email', email).eq('password', password).single();
        if (error) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ user: data, message: 'Login successful' });
    } catch (error) {
        console.error("API Error (/api/auth/login):", error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Shops
app.get('/api/shops', async (req, res) => {
    try {
        let query = supabase.from('shops').select('*, customers!shops_owner_id_fkey(name, email)');
        if (req.query.status) query = query.eq('status', req.query.status);
        const { data, error } = await withTimeout(query);
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("API Error (/api/shops):", error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Orders
app.post('/api/orders', async (req, res) => {
    const { customerName, email, phone, total, shippingAddress, paymentMethod, items } = req.body;
    const shopIds = [...new Set(items?.map(i => i.shop_id || i.product?.shop_id).filter(Boolean))];
    try {
        const { data, error } = await supabase.from('orders').insert([{
            customer_name: customerName, email, phone, total, shipping_address: shippingAddress,
            payment_method: paymentMethod, items, shop_ids: shopIds
        }]).select();
        if (error) throw error;
        res.status(201).json({ id: data[0].id });
    } catch (error) {
        console.error("API Error (POST /api/orders):", error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Coupons
app.get('/api/coupons', async (req, res) => {
    try {
        const query = supabase.from('coupons').select('*');
        const { data, error } = await withTimeout(query);
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("API Error (/api/coupons):", error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

app.post('/api/coupons', async (req, res) => {
    const { code, discountType, discountValue, isActive, expiryDate, usageLimit, usageCount, usedBy } = req.body;
    try {
        const { data, error } = await supabase.from('coupons').insert([{
            code: code.toUpperCase(), discount_percentage: discountType === 'percentage' ? discountValue : 0,
            is_active: isActive, discount_type: discountType || 'percentage', discount_value: discountValue,
            expiry_date: expiryDate, usage_limit: usageLimit || 1000, usage_count: usageCount || 0, used_by: usedBy || []
        }]).select();
        if (error) throw error;
        res.status(201).json({ id: data[0].id, message: 'Coupon created' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Backups & Recovery
app.get('/api/backups', async (req, res) => {
    try {
        const { data, error } = await supabase.from('backups').select('*').order('deleted_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

app.post('/api/backups/:id/restore', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: backup, error: fetchError } = await supabase.from('backups').select('*').eq('id', id).single();
        if (fetchError || !backup) throw new Error('Backup not found');
        const { table_name, data: recordData } = backup;
        const { error: restoreError } = await supabase.from(table_name).upsert([recordData]);
        if (restoreError) throw restoreError;
        await supabase.from('backups').delete().eq('id', id);
        res.json({ message: 'Restored successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Orders (Admin/Vendor View)
app.get('/api/orders', async (req, res) => {
    try {
        let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (req.query.shop_id) query = query.contains('shop_ids', [req.query.shop_id]);
        const { data, error } = await withTimeout(query);
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select();
        if (error || data.length === 0) throw error || new Error('Order not found');
        res.json({ message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Users
app.get('/api/users/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('customers').select('*, shops:shop_id(*)').eq('id', req.params.id).single();
        if (error) throw error;
        if (data && data.password) delete data.password;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Shop Manual Registration (Vendor Creation)
app.post('/api/shops/manual', async (req, res) => {
    const { ownerName, ownerEmail, ownerPassword, shopName, address, latitude, longitude, images, adminCreated, whatsapp_number, is_recommended } = req.body;
    const userRole = adminCreated ? 'vendor' : 'customer';
    const shopStatus = adminCreated ? 'active' : 'pending';
    try {
        const { data: user, error: userError } = await supabase.from('customers').insert([{ name: ownerName, email: ownerEmail, password: ownerPassword, role: userRole }]).select().single();
        if (userError) throw userError;
        
        // Define shop payload safely
        let shopPayload = { owner_id: user.id, name: shopName, address, latitude, longitude, images: images || [], status: shopStatus };
        if (whatsapp_number !== undefined) shopPayload.whatsapp_number = whatsapp_number;
        if (is_recommended !== undefined) shopPayload.is_recommended = is_recommended;

        const { data: shop, error: shopError } = await supabase.from('shops').insert([shopPayload]).select().single();
        if (shopError) throw shopError;
        await supabase.from('customers').update({ shop_id: shop.id }).eq('id', user.id);
        res.status(201).json({ message: 'Vendor added successfully', shop });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Shop Update
app.put('/api/shops/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, latitude, longitude, logo_url, images, status, whatsapp_number, is_recommended } = req.body;
    try {
        const updateData = { name, address, latitude, longitude, logo_url, images, status, whatsapp_number, is_recommended };
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
        const { data, error } = await supabase.from('shops').update(updateData).eq('id', id).select().single();
        if (error) throw error;
        if (status === 'active') await supabase.from('customers').update({ role: 'vendor' }).eq('id', data.owner_id);
        res.json({ shop: data, message: 'Shop updated' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// For Vercel: Export the app as default
export default app;
