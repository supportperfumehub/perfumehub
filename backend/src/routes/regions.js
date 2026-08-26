import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/tokenUtils.js';

const router = express.Router();

// Get all regions
router.get('/', async (req, res) => {
    res.setHeader('Cache-Control', 'private, max-age=60');
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
        const targetAdminId = parseInt(admin_id) || admin_id;
        const targetRegionId = parseInt(region_id) || region_id;
        const assignedById = req.user?.id || (parseInt(assigned_by) || assigned_by);

        if (!targetAdminId || !targetRegionId) {
            return res.status(400).json({ error: 'admin_id and region_id are required' });
        }

        // 1. Check if mapping already exists
        const { data: existing } = await supabase
            .from('admin_region_mapping')
            .select('*')
            .eq('admin_id', targetAdminId)
            .eq('region_id', targetRegionId);

        let mappingData = null;
        if (!existing || existing.length === 0) {
            const { data, error } = await supabase
                .from('admin_region_mapping')
                .insert([{ 
                    admin_id: targetAdminId, 
                    region_id: targetRegionId, 
                    assigned_by: assignedById 
                }])
                .select();
                
            if (error) {
                console.error('Error inserting into admin_region_mapping with assigned_by:', error);
                // Fallback without assigned_by in case column/FK constraint fails
                const { data: retryData, error: retryError } = await supabase
                    .from('admin_region_mapping')
                    .insert([{ 
                        admin_id: targetAdminId, 
                        region_id: targetRegionId 
                    }])
                    .select();
                    
                if (retryError) {
                    console.error('Retry insert failed:', retryError);
                } else {
                    mappingData = retryData;
                }
            } else {
                mappingData = data;
            }
        } else {
            mappingData = existing;
        }

        // 2. Ensure user is promoted to regional_admin
        const { error: roleError } = await supabase
            .from('customers')
            .update({ role: 'regional_admin' })
            .eq('id', targetAdminId);
            
        if (roleError) {
            console.error('Error updating customer role to regional_admin:', roleError);
        }

        res.status(200).json({ 
            mapping: mappingData ? mappingData[0] : { admin_id: targetAdminId, region_id: targetRegionId }, 
            message: 'Regional admin assigned successfully' 
        });
    } catch (error) {
        console.error('Assign admin error:', error);
        res.status(500).json({ error: error.message || 'Internal server error', details: error });
    }
});

// Get all assigned regional admins with region details and live vendor counts
router.get('/assigned-admins', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    try {
        const { data: mappings, error: mapError } = await supabase
            .from('admin_region_mapping')
            .select('admin_id, region_id, assigned_by, created_at')
            .order('created_at', { ascending: false });

        if (mapError) throw mapError;

        if (!mappings || mappings.length === 0) {
            return res.json([]);
        }

        // Fetch users, regions, and shops
        const adminIds = [...new Set(mappings.map(m => m.admin_id))];
        const regionIds = [...new Set(mappings.map(m => m.region_id))];

        const [usersRes, regionsRes, shopsRes] = await Promise.all([
            supabase.from('customers').select('id, name, email, role').in('id', adminIds),
            supabase.from('regions').select('id, name, code, currency_code').in('id', regionIds),
            supabase.from('shops').select('id, name, region_id')
        ]);

        const usersMap = new Map((usersRes.data || []).map(u => [u.id, u]));
        const regionsMap = new Map((regionsRes.data || []).map(r => [r.id, r]));

        // Calculate vendor counts per region
        const regionVendorCount = {};
        (shopsRes.data || []).forEach(shop => {
            if (shop.region_id) {
                regionVendorCount[shop.region_id] = (regionVendorCount[shop.region_id] || 0) + 1;
            }
        });

        const result = mappings.map(m => {
            const user = usersMap.get(m.admin_id) || { name: 'Unknown User', email: '' };
            const region = regionsMap.get(m.region_id) || { name: 'Unknown Region', code: '', currency_code: '' };
            return {
                id: `${m.admin_id}-${m.region_id}`,
                admin_id: m.admin_id,
                name: user.name,
                email: user.email,
                role: user.role,
                region_id: m.region_id,
                region_name: region.name,
                region_code: region.code,
                currency_code: region.currency_code,
                vendor_count: regionVendorCount[m.region_id] || 0,
                assigned_at: m.created_at
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching assigned regional admins:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Unassign a regional admin from a region
router.post('/unassign-admin', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { admin_id, region_id } = req.body;
    try {
        const targetAdminId = parseInt(admin_id) || admin_id;
        const targetRegionId = parseInt(region_id) || region_id;

        if (!targetAdminId || !targetRegionId) {
            return res.status(400).json({ error: 'admin_id and region_id are required' });
        }

        // Delete from mapping
        const { error: delError } = await supabase
            .from('admin_region_mapping')
            .delete()
            .eq('admin_id', targetAdminId)
            .eq('region_id', targetRegionId);

        if (delError) throw delError;

        // Check if user still has other assigned regions
        const { data: remaining } = await supabase
            .from('admin_region_mapping')
            .select('region_id')
            .eq('admin_id', targetAdminId);

        // If no remaining regions, revert role from regional_admin to vendor (if has shop) or customer
        if (!remaining || remaining.length === 0) {
            const { data: userData } = await supabase
                .from('customers')
                .select('shop_id')
                .eq('id', targetAdminId)
                .single();

            const fallbackRole = userData?.shop_id ? 'vendor' : 'customer';
            await supabase
                .from('customers')
                .update({ role: fallbackRole })
                .eq('id', targetAdminId);
        }

        res.json({ success: true, message: 'Regional admin unassigned successfully' });
    } catch (error) {
        console.error('Error unassigning regional admin:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export default router;
