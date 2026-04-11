import express from 'express';
import { supabase } from '../config/supabaseClient.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    console.log('--- SIGNUP REQUEST RECEIVED ---');
    console.log('Body:', req.body);
    const { name, email, password, role } = req.body;
    try {
        const { data, error } = await supabase
            .from('customers')
            .insert([{ name, email, password, role: role || 'customer' }])
            .select();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
            throw error;
        }
        res.status(201).json({ user: data[0], message: 'Registration successful' });
    } catch (error) {
        console.error('Error registering customer:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            code: error.code 
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(401).json({ error: 'Invalid email or password' });
            throw error;
        }
        res.json({ user: data, message: 'Login successful' });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
