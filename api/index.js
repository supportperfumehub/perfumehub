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

// Debug Route
app.get('/api/debug/schema', async (req, res) => {
    try {
        const { data, error } = await supabase.from('customers').select('*').limit(1);
        if (error) return res.status(500).json({ error: 'Database check failed', details: error });
        res.json({ message: 'Table accessible', data });
    } catch (err) {
        res.status(500).json({ error: 'System error', details: err.message });
    }
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
        res.status(500).json({ error: 'Internal server error' });
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
        res.status(500).json({ error: 'Internal server error' });
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
        res.status(500).json({ error: 'Internal server error' });
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.from('customers').select('*').eq('email', email).eq('password', password).single();
        if (error) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ user: data, message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
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
        res.status(500).json({ error: 'Internal server error' });
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

// For Vercel: Export the app as default
export default app;
