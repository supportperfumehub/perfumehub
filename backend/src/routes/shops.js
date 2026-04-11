import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get all shops (public optionally supports status and admin filtering)
router.get('/', async (req, res) => {
    try {
        let query = supabase.from('shops').select('*, customers!shops_owner_id_fkey(name, email)');
        
        if (req.query.status) query = query.eq('status', req.query.status);
        if (req.query.owner_id) query = query.eq('owner_id', req.query.owner_id);

        if (req.query.admin_id) {
            const { data: regionsMap } = await supabase
                .from('admin_region_mapping')
                .select('region_id')
                .eq('admin_id', req.query.admin_id);
            
            if (regionsMap && regionsMap.length > 0) {
                const regionIds = regionsMap.map(rm => rm.region_id);
                query = query.in('region_id', regionIds);
            } else {
                return res.json([]);
            }
        }

        const { data, error } = await withTimeout(query);
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching shops:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register a shop (vendor request)
router.post('/', async (req, res) => {
    const { owner_id, name, address, latitude, longitude, logo_url, images } = req.body;
    try {
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .insert([{ owner_id, name, address, latitude, longitude, logo_url, images: images || [], status: 'pending' }])
            .select()
            .single();

        if (shopError) throw shopError;

        await supabase
            .from('customers')
            .update({ shop_id: shop.id })
            .eq('id', owner_id);

        res.status(201).json({ shop, message: 'Shop application submitted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a complete Vendor + Shop (Admin or Guest self-registration)
router.post('/manual', async (req, res) => {
    const { ownerName, ownerEmail, ownerPassword, shopName, address, latitude, longitude, images, adminCreated, whatsapp_number, is_recommended } = req.body;
    
    const userRole = adminCreated ? 'vendor' : 'customer';
    const shopStatus = adminCreated ? 'APPROVED' : 'PENDING';

    try {
        const { data: user, error: userError } = await supabase
            .from('customers')
            .insert([{ name: ownerName, email: ownerEmail, password: ownerPassword, role: userRole }])
            .select()
            .single();

        if (userError) throw userError;

        let shopPayload = { owner_id: user.id, name: shopName, address, latitude, longitude, images: images || [], status: shopStatus };
        if (whatsapp_number !== undefined) shopPayload.whatsapp_number = whatsapp_number;
        if (is_recommended !== undefined) shopPayload.is_recommended = is_recommended;

        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .insert([shopPayload])
            .select()
            .single();

        if (shopError) throw shopError;

        await supabase
            .from('customers')
            .update({ shop_id: shop.id })
            .eq('id', user.id);

        res.status(201).json({ message: adminCreated ? 'Vendor added successfully' : 'Vendor request submitted', shop });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Admin Approve
router.put('/:id/approve', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    try {
        const { data, error } = await supabase.from('shops')
            .update({ status: 'APPROVED', approved_by: adminId, approved_at: new Date() })
            .eq('id', id).select().single();
        if (error) throw error;
        await supabase.from('customers').update({ role: 'vendor' }).eq('id', data.owner_id);
        res.json({ message: 'Shop approved successfully', shop: data });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Admin Reject
router.put('/:id/reject', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    try {
        const { data, error } = await supabase.from('shops')
            .update({ status: 'REJECTED', rejection_reason })
            .eq('id', id).select().single();
        if (error) throw error;
        res.json({ message: 'Shop rejected', shop: data });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Vendor Resubmit
router.post('/:id/resubmit', authenticateUser, verifyRole(['vendor', 'customer']), async (req, res) => {
    const { id } = req.params;
    const vendorId = req.user.id;
    try {
        const { data, error } = await supabase.from('shops')
            .update({ status: 'PENDING', rejection_reason: null })
            .eq('id', id).eq('owner_id', vendorId).select().single();
        if (error) throw error;
        res.json({ message: 'Shop resubmitted for approval', shop: data });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Update Shop
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, latitude, longitude, logo_url, images, status, whatsapp_number, is_recommended } = req.body;
    try {
        const updateData = { name, address, latitude, longitude, logo_url, images, status, whatsapp_number, is_recommended };
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
        const { data, error } = await supabase.from('shops').update(updateData).eq('id', id).select().single();
        if (error) throw error;
        if (status === 'active' || status === 'APPROVED') {
            await supabase.from('customers').update({ role: 'vendor' }).eq('id', data.owner_id);
        }
        res.json({ shop: data, message: 'Shop updated' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

export default router;
