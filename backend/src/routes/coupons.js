import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

const adminOnly = [authenticateUser, verifyRole(['super_admin', 'admin'])];

// Get coupons
router.get('/', async (req, res) => {
    try {
        const query = supabase.from('coupons').select('*').not('code', 'like', '__%');
        const { data, error } = await withTimeout(query);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        if (error.message === 'Database query timed out') {
            return res.status(504).json({ error: 'Database timeout' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create coupon
router.post('/', adminOnly, async (req, res) => {
    const { code, discountType, discountValue, isActive, expiryDate, usageLimit, usageCount, usedBy } = req.body;
    try {
        const { data, error } = await supabase
            .from('coupons')
            .insert([{
                code: code.toUpperCase(),
                discount_percentage: discountType === 'percentage' ? discountValue : 0,
                is_active: isActive,
                discount_type: discountType || 'percentage',
                discount_value: discountValue,
                expiry_date: expiryDate,
                usage_limit: usageLimit || 1000,
                usage_count: usageCount || 0,
                used_by: usedBy || []
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ id: data[0].id, message: 'Coupon created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update coupon
router.put('/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { code, discountType, discountValue, isActive, expiryDate, usageLimit, usageCount, usedBy } = req.body;
    try {
        const { data, error } = await supabase
            .from('coupons')
            .update({
                code: code ? code.toUpperCase() : undefined,
                discount_percentage: discountType === 'percentage' ? discountValue : undefined,
                is_active: isActive,
                discount_type: discountType || undefined,
                discount_value: discountValue !== undefined ? discountValue : undefined,
                expiry_date: expiryDate || undefined,
                usage_limit: usageLimit !== undefined ? usageLimit : undefined,
                usage_count: usageCount !== undefined ? usageCount : undefined,
                used_by: usedBy || undefined
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ error: 'Coupon not found' });
        res.json({ message: 'Coupon updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete coupon (Soft Delete / Archive)
router.delete('/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        const { data: coupon, error: fetchError } = await supabase
            .from('coupons')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') return res.status(404).json({ error: 'Coupon not found' });
            throw fetchError;
        }

        const { error: backupError } = await supabase
            .from('backups')
            .insert([{
                table_name: 'coupons',
                record_id: id.toString(),
                data: coupon,
                deleted_at: new Date().toISOString()
            }]);

        if (backupError) console.error('Backup failed for coupon deletion:', backupError);

        const { error: deleteError, count } = await supabase
            .from('coupons')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (deleteError) throw deleteError;
        if (count === 0) return res.status(404).json({ error: 'Coupon not found' });
        
        res.json({ message: 'Coupon archived and deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
