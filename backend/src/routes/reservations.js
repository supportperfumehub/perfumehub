import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get reservations (Customer or Vendor)
router.get('/', authenticateUser, async (req, res) => {
    try {
        let query = supabase
            .from('reservations')
            .select(`
                *,
                products (id, name, brand, image_url, price),
                shops (id, name, address)
            `)
            .order('created_at', { ascending: false });

        const user = req.user;

        // If customer, show only their reservations
        if (user.role === 'customer') {
            query = query.eq('customer_id', user.id);
        } else if (user.role === 'vendor') {
            // Vendors see reservations for their shop
            if (!user.shop_id) return res.status(403).json({ error: 'No shop assigned.' });
            query = query.eq('shop_id', user.shop_id);
        } else if (user.role === 'regional_admin' || user.role === 'super_admin') {
            // Admins can filter by shop
            if (req.query.shop_id) {
                query = query.eq('shop_id', req.query.shop_id);
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a reservation
router.post('/', authenticateUser, async (req, res) => {
    const { shop_id, product_id, quantity, pickup_time_start, pickup_time_end } = req.body;
    const user = req.user;

    if (!shop_id || !product_id || !quantity || !pickup_time_start || !pickup_time_end) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        // Call the RPC to handle the atomic transaction
        const { data: reservationId, error } = await supabase.rpc('create_reservation', {
            p_customer_id: user.id,
            p_shop_id: shop_id,
            p_product_id: product_id,
            p_quantity: quantity,
            p_pickup_start: pickup_time_start,
            p_pickup_end: pickup_time_end
        });

        if (error) {
            if (error.message && error.message.includes('Insufficient stock')) {
                return res.status(409).json({ error: error.message });
            }
            throw error;
        }

        res.status(201).json({ 
            message: 'Reservation created successfully', 
            reservation_id: reservationId 
        });
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Vendor confirms reservation
router.post('/:id/confirm', authenticateUser, verifyRole(['vendor', 'super_admin', 'regional_admin']), async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    try {
        // Verify ownership
        if (user.role === 'vendor') {
            const { data: resv } = await supabase.from('reservations').select('shop_id').eq('id', id).single();
            if (!resv || resv.shop_id !== user.shop_id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        const { data, error } = await supabase
            .from('reservations')
            .update({ status: 'confirmed', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('status', 'pending')
            .select();

        if (error) throw error;
        if (!data.length) return res.status(400).json({ error: 'Reservation cannot be confirmed (may not be pending).' });

        res.json({ message: 'Reservation confirmed', reservation: data[0] });
    } catch (error) {
        console.error('Error confirming reservation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Complete reservation (Customer picked up)
router.post('/:id/complete', authenticateUser, verifyRole(['vendor', 'super_admin', 'regional_admin']), async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    try {
        if (user.role === 'vendor') {
            const { data: resv } = await supabase.from('reservations').select('shop_id').eq('id', id).single();
            if (!resv || resv.shop_id !== user.shop_id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        const { data, error } = await supabase.rpc('complete_reservation', {
            p_reservation_id: id
        });

        if (error) throw error;

        res.json({ message: 'Reservation completed successfully.' });
    } catch (error) {
        console.error('Error completing reservation:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Cancel reservation
router.post('/:id/cancel', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    try {
        const { data: resv } = await supabase.from('reservations').select('customer_id, shop_id').eq('id', id).single();
        if (!resv) return res.status(404).json({ error: 'Not found' });

        // Customers can cancel their own, vendors can cancel their shop's
        if (user.role === 'customer' && resv.customer_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
        if (user.role === 'vendor' && resv.shop_id !== user.shop_id) return res.status(403).json({ error: 'Forbidden' });

        const { data, error } = await supabase.rpc('cancel_reservation', {
            p_reservation_id: id,
            p_new_status: 'cancelled'
        });

        if (error) throw error;

        res.json({ message: 'Reservation cancelled successfully.' });
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Verify reservation by code (for Shop Staff)
router.post('/verify', authenticateUser, verifyRole(['vendor', 'super_admin', 'regional_admin']), async (req, res) => {
    const { code } = req.body;
    const user = req.user;

    if (!code) return res.status(400).json({ error: 'Code is required.' });

    try {
        let query = supabase
            .from('reservations')
            .select(`
                *,
                products (id, name, brand, image_url, price),
                customers (id, name, email)
            `)
            .eq('verification_code', code)
            .in('status', ['pending', 'confirmed'])
            .maybeSingle();

        // If vendor, restrict to their shop
        if (user.role === 'vendor') {
            query = query.eq('shop_id', user.shop_id);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Valid reservation not found with this code.' });

        res.json({ 
            message: 'Reservation verified', 
            reservation: data 
        });
    } catch (error) {
        console.error('Error verifying reservation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Cron Endpoint to expire reservations
router.post('/cron/expire', async (req, res) => {
    // Basic API Key protection for cron endpoints
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Fetch pending or confirmed reservations that have expired
        const { data: expiredList, error: fetchErr } = await supabase
            .from('reservations')
            .select('id')
            .in('status', ['pending', 'confirmed'])
            .lt('expires_at', new Date().toISOString());

        if (fetchErr) throw fetchErr;

        let expiredCount = 0;
        for (const resv of expiredList) {
            const { error: cancelErr } = await supabase.rpc('cancel_reservation', {
                p_reservation_id: resv.id,
                p_new_status: 'expired'
            });
            if (!cancelErr) expiredCount++;
        }

        res.json({ message: 'Cron completed', expiredCount });
    } catch (error) {
        console.error('Error in cron/expire:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
