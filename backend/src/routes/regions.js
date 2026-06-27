import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/tokenUtils.js';

const router = express.Router();

// Get all regions
router.get('/', async (req, res) => {
    try {
        let query = supabase.from('regions').select('*').order('name');
        
        let reqUser = null;
        const token = extractTokenFromHeader(req);
        if (token) {
            const decoded = verifyAccessToken(token);
            if (decoded) {
                const { data: user } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('id', decoded.id)
                    .single();
                if (user) {
                    if (user.role === 'regional_admin') {
                        const { data: mappings } = await supabase
                            .from('admin_region_mapping')
                            .select('region_id')
                            .eq('admin_id', user.id);
                        user.assignedRegionIds = mappings ? mappings.map(m => m.region_id) : [];
                    }
                    reqUser = user;
                }
            }
        }

        // Scoping for regional admins
        if (reqUser && reqUser.role === 'regional_admin') {
            if (reqUser.assignedRegionIds && reqUser.assignedRegionIds.length > 0) {
                query = query.in('id', reqUser.assignedRegionIds);
            } else {
                return res.json([]);
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a region
router.post('/', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { name, code, currencyCode } = req.body;
    try {
        const { data, error } = await supabase
            .from('regions')
            .insert([{ name, code, currency_code: currencyCode }])
            .select();
        if (error) throw error;
        res.status(201).json({ region: data[0], message: 'Region created successfully' });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Region already exists' });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a region
router.put('/:id', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { name, code, currencyCode } = req.body;
    try {
        const { data, error } = await supabase
            .from('regions')
            .update({ name, code, currency_code: currencyCode })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        if (data && data.length === 0) return res.status(404).json({ error: 'Region not found' });
        
        res.json({ region: data[0], message: 'Region updated successfully' });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Region with this code already exists' });
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Delete a region
router.delete('/:id', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Clear region_id from shops assigned to this region
        const { error: shopError } = await supabase
            .from('shops')
            .update({ region_id: null })
            .eq('region_id', id);
        
        if (shopError) {
            console.error('Error unassigning shops from region:', shopError);
            return res.status(500).json({ error: 'Failed to unassign shops from region', message: shopError.message });
        }

        // 2. Delete admin-region mappings for this region
        const { error: mappingError } = await supabase
            .from('admin_region_mapping')
            .delete()
            .eq('region_id', id);
        
        if (mappingError) {
            console.error('Error clearing admin mappings for region:', mappingError);
            return res.status(500).json({ error: 'Failed to clear admin mappings', message: mappingError.message });
        }

        // 3. Finally delete the region itself
        const { data, error: deleteError } = await supabase
            .from('regions')
            .delete()
            .eq('id', id)
            .select();
            
        if (deleteError) {
            console.error('Error deleting region:', deleteError);
            return res.status(500).json({ error: 'Database error deleting region', message: deleteError.message });
        }
        
        if (data && data.length === 0) return res.status(404).json({ error: 'Region not found' });
        
        res.json({ message: 'Region deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Assign Admin to a Region
router.post('/assign-admin', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { admin_id, region_id, assigned_by } = req.body;
    try {
        const { data, error } = await supabase
            .from('admin_region_mapping')
            .insert([{ admin_id, region_id, assigned_by }])
            .select();
        if (error) throw error;

        // Ensure user is promoted to regional_admin
        await supabase.from('customers').update({ role: 'regional_admin' }).eq('id', admin_id);
        
        res.status(201).json({ mapping: data[0], message: 'Admin assigned to region' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
