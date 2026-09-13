import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

const adminOnly = [authenticateUser, verifyRole(['super_admin', 'admin'])];

// Get coupons (Sanitized for public/guest clients - Zero PII leakage)
router.get('/', async (req, res) => {
    try {
        const query = supabase
            .from('coupons')
            .select('id, code, discount_type, discount_value, discount_percentage, expiry_date, is_active, usage_limit, usage_count, deleted_at')
            .not('code', 'like', '__%')
            .is('deleted_at', null);
            
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

// Validate coupon endpoint (Zero-trust, never returns used_by/PII)
router.post('/validate', async (req, res) => {
    const { code, subtotal = 0, email, phone } = req.body;
    try {
        if (!code) {
            return res.status(400).json({ valid: false, error: 'Coupon code is required' });
        }

        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code.trim().toUpperCase())
            .is('deleted_at', null)
            .maybeSingle();

        if (error || !coupon) {
            return res.status(404).json({ valid: false, error: 'Coupon not found' });
        }

        if (!coupon.is_active) {
            return res.status(400).json({ valid: false, error: 'Coupon is inactive' });
        }

        const now = new Date();
        if (coupon.expiry_date && new Date(coupon.expiry_date) < now) {
            return res.status(400).json({ valid: false, error: 'Coupon has expired' });
        }

        if (coupon.usage_limit && (coupon.usage_count || 0) >= coupon.usage_limit) {
            return res.status(400).json({ valid: false, error: 'Coupon usage limit reached' });
        }

        // Single-use verification per customer email, phone, or client IP
        const clientIP = req.ip || req.headers['x-forwarded-for'] || null;
        const parseArray = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? JSON.parse(val || '[]') : []);
        
        const usedBy = parseArray(coupon.used_by);
        const usedByPhones = parseArray(coupon.used_by_phones);
        const usedByIPs = parseArray(coupon.used_by_ips);

        const customerEmail = email ? email.toLowerCase().trim() : null;
        const customerPhone = phone ? phone.trim() : null;

        if (customerEmail && usedBy.includes(customerEmail)) {
            return res.status(400).json({ valid: false, error: 'Coupon already used by this email' });
        }
        if (customerPhone && usedByPhones.includes(customerPhone)) {
            return res.status(400).json({ valid: false, error: 'Coupon already used by this phone number' });
        }
        if (clientIP && usedByIPs.includes(clientIP)) {
            return res.status(400).json({ valid: false, error: 'Coupon already used from this device' });
        }

        // Calculate discount
        const parsedSubtotal = parseFloat(subtotal) || 0;
        let calculatedDiscount = 0;
        const discountType = coupon.discount_type || 'percentage';
        const discountValue = Number(coupon.discount_value) || Number(coupon.discount_percentage) || 0;

        if (discountType === 'percentage') {
            calculatedDiscount = (parsedSubtotal * discountValue) / 100;
        } else {
            calculatedDiscount = Math.min(parsedSubtotal, discountValue);
        }

        // Return strictly the sanitized validation and calculation result
        return res.json({
            valid: true,
            code: coupon.code,
            discountType,
            discountValue,
            calculatedDiscount: Math.round(calculatedDiscount * 100) / 100
        });
    } catch (err) {
        console.error('Coupon validation error:', err);
        return res.status(500).json({ valid: false, error: 'Internal server error during validation' });
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

        const { error: deleteError } = await supabase
            .from('coupons')
            .update({ 
                is_active: false,
                deleted_at: new Date().toISOString() 
            })
            .eq('id', id);

        if (deleteError) throw deleteError;
        
        res.json({ message: 'Coupon archived and soft-deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
