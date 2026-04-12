import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Get all shops (public optionally supports status and admin filtering)
router.get('/', authenticateUser, async (req, res) => {
    try {
        let query = supabase.from('shops').select('*, customers!shops_owner_id_fkey(name, email)');
        
        if (req.query.status) query = query.eq('status', req.query.status);
        if (req.query.owner_id) query = query.eq('owner_id', req.query.owner_id);

        // Enforce Regional Scoping for Regional Admins
        if (req.user && req.user.role === 'regional_admin') {
            if (req.user.assignedRegionIds && req.user.assignedRegionIds.length > 0) {
                query = query.in('region_id', req.user.assignedRegionIds);
            } else {
                // Regional admin with no assigned regions has no access
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
    const { ownerName, ownerEmail, ownerPassword, shopName, address, latitude, longitude, images, adminCreated, whatsapp_number, is_recommended, region_id } = req.body;
    
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
        if (region_id !== undefined && region_id !== '') shopPayload.region_id = parseInt(region_id);

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
    const admin = req.user;
    try {
        // Find the shop first to check its region
        const { data: shop, error: fetchError } = await supabase
            .from('shops')
            .select('region_id, owner_id')
            .eq('id', id)
            .single();
        
        if (fetchError || !shop) return res.status(404).json({ error: 'Shop not found' });

        // Scoping check
        if (admin.role === 'regional_admin' && (!admin.assignedRegionIds || !admin.assignedRegionIds.includes(shop.region_id))) {
            return res.status(403).json({ error: 'Forbidden: You can only approve shops in your assigned regions.' });
        }

        const { data, error } = await supabase.from('shops')
            .update({ status: 'APPROVED', approved_by: admin.id, approved_at: new Date() })
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
    const admin = req.user;
    try {
        // Find the shop first to check its region
        const { data: shop, error: fetchError } = await supabase
            .from('shops')
            .select('region_id')
            .eq('id', id)
            .single();
        
        if (fetchError || !shop) return res.status(404).json({ error: 'Shop not found' });

        // Scoping check
        if (admin.role === 'regional_admin' && (!admin.assignedRegionIds || !admin.assignedRegionIds.includes(shop.region_id))) {
            return res.status(403).json({ error: 'Forbidden: You can only reject shops in your assigned regions.' });
        }

        const { data, error } = await supabase.from('shops')
            .update({ status: 'REJECTED', rejection_reason })
            .eq('id', id).select().single();
            
        if (error) throw error;
        res.json({ message: 'Shop rejected', shop: data });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Admin Update Status (Active/Suspended)
router.put('/:id/status', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const admin = req.user;

    try {
        // Find the shop first to check its region
        const { data: shop, error: fetchError } = await supabase
            .from('shops')
            .select('region_id, owner_id')
            .eq('id', id)
            .single();
        
        if (fetchError || !shop) return res.status(404).json({ error: 'Shop not found' });

        // Scoping check
        if (admin.role === 'regional_admin' && (!admin.assignedRegionIds || !admin.assignedRegionIds.includes(shop.region_id))) {
            return res.status(403).json({ error: 'Forbidden: You can only update shops in your assigned regions.' });
        }

        const { data, error } = await supabase.from('shops')
            .update({ status: status.toUpperCase() })
            .eq('id', id).select().single();
            
        if (error) throw error;

        // If activating, ensure they are a vendor role
        if (status.toUpperCase() === 'ACTIVE' || status.toUpperCase() === 'APPROVED') {
            await supabase.from('customers').update({ role: 'vendor' }).eq('id', data.owner_id);
        }

        res.json({ message: `Shop status updated to ${status}`, shop: data });
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
router.put('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { name, address, latitude, longitude, logo_url, images, status, whatsapp_number, is_recommended, region_id } = req.body;
    const admin = req.user;

    try {
        // Find the shop first to check its region
        const { data: shop, error: fetchError } = await supabase
            .from('shops')
            .select('region_id')
            .eq('id', id)
            .single();
        
        if (fetchError || !shop) return res.status(404).json({ error: 'Shop not found' });

        // Scoping check
        if (admin.role === 'regional_admin' && (!admin.assignedRegionIds || !admin.assignedRegionIds.includes(shop.region_id))) {
            return res.status(403).json({ error: 'Forbidden: You can only update shops in your assigned regions.' });
        }

        const updateData = { name, address, latitude, longitude, logo_url, images, status, whatsapp_number, is_recommended, region_id };
        if (updateData.region_id === '') updateData.region_id = null; // Convert empty string to null
        else if (updateData.region_id !== undefined && updateData.region_id !== null) updateData.region_id = parseInt(updateData.region_id);
        
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

// Delete Shop
router.delete('/:id', authenticateUser, verifyRole(['super_admin', 'regional_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const admin = req.user;

    try {
        // Find the shop first to check its region
        const { data: shop, error: fetchError } = await supabase
            .from('shops')
            .select('region_id')
            .eq('id', id)
            .single();
        
        if (fetchError || !shop) return res.status(404).json({ error: 'Shop not found' });

        // Scoping check
        if (admin.role === 'regional_admin' && (!admin.assignedRegionIds || !admin.assignedRegionIds.includes(shop.region_id))) {
            return res.status(403).json({ error: 'Forbidden: You can only delete shops in your assigned regions.' });
        }

        // 1. Clear shop_id reference in customers table first (Foreign Key Constraint)
        const { error: customerError } = await supabase.from('customers').update({ shop_id: null, role: 'customer' }).eq('shop_id', id);
        if (customerError) {
            console.error('Error clearing customer shop_id:', customerError);
            return res.status(500).json({ error: 'Failed to clear customer mapping', message: customerError.message });
        }

        // 2. Delete all products associated with the shop
        const { error: productError } = await supabase.from('products').delete().eq('shop_id', id);
        if (productError) {
            console.error('Error deleting shop products:', productError);
            return res.status(500).json({ error: 'Failed to delete shop products', message: productError.message });
        }

        // 3. Delete the shop itself
        const { error: deleteError } = await supabase.from('shops').delete().eq('id', id);
        
        if (deleteError) {
            console.error('Error deleting shop:', deleteError);
            return res.status(500).json({ error: 'Database error deleting shop', message: deleteError.message });
        }
        
        res.json({ message: 'Shop and its products deleted successfully' });
    } catch (error) {
        console.error('Delete Shop Exception:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

export default router;
