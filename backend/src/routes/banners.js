import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { withTimeout } from '../utils/timeout.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';
import { logAdminAudit } from '../utils/auditLogger.js';

const router = express.Router();

const adminOnly = [authenticateUser, verifyRole(['super_admin', 'admin'])];

/**
 * One-time migration helper: automatically migrate banners out of coupons.__SITE_BANNERS__
 * if any legacy record remains in the database.
 */
let migrationAttempted = false;
const ensureLegacyBannersMigrated = async () => {
    if (migrationAttempted) return;
    migrationAttempted = true;

    try {
        const { data: legacyCoupon } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', '__SITE_BANNERS__')
            .maybeSingle();

        if (legacyCoupon && legacyCoupon.used_by) {
            let parsed = [];
            try {
                parsed = typeof legacyCoupon.used_by === 'string' 
                    ? JSON.parse(legacyCoupon.used_by) 
                    : legacyCoupon.used_by;
            } catch (e) {
                console.error('Failed to parse legacy __SITE_BANNERS__:', e);
            }

            if (Array.isArray(parsed) && parsed.length > 0) {
                const rows = parsed.map(b => ({
                    type: b.type || 'top_banner',
                    title_en: b.title_en || b.title_ar || 'Special Offer',
                    title_ar: b.title_ar || b.title_en || 'عرض خاص',
                    badge: b.badge || null,
                    discount_code: b.discount_code || null,
                    link_url: b.link_url || null,
                    bg_color: b.bg_color || null,
                    text_color: b.text_color || null,
                    display_order: parseInt(b.display_order) || 1,
                    is_active: b.is_active !== false,
                    countdown_end: b.countdown_end || null
                }));

                const { error: insertErr } = await supabase
                    .from('banners')
                    .insert(rows);

                if (!insertErr) {
                    console.log(`[Banners Migration] Successfully migrated ${rows.length} banner(s) to public.banners table.`);
                    await supabase.from('coupons').delete().eq('code', '__SITE_BANNERS__');
                }
            } else {
                await supabase.from('coupons').delete().eq('code', '__SITE_BANNERS__');
            }
        }
    } catch (err) {
        // Table may not be ready or already migrated
        console.warn('[Banners Migration] Check completed:', err.message);
    }
};

// 1. Get all banners (Public / Filterable, Edge CDN Cached)
router.get('/', async (req, res) => {
    // Multi-tier Edge CDN Caching: 60s browser, 300s edge, 24h stale-while-revalidate
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    const { type, active } = req.query;

    try {
        await ensureLegacyBannersMigrated();

        let query = supabase
            .from('banners')
            .select('*')
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (type) {
            query = query.eq('type', type);
        }
        if (active === 'true') {
            query = query.eq('is_active', true);
        }

        const { data, error } = await withTimeout(query);

        if (error) {
            // Fallback for environment before DDL creation
            console.warn('banners table query fallback:', error.message);
            return res.json([
                {
                    id: 'default-top-banner',
                    type: 'top_banner',
                    title_en: 'NEW',
                    title_ar: 'جديد',
                    badge: 'Special Offer',
                    discount_code: 'HELLO025',
                    link_url: '/shop',
                    is_active: true,
                    display_order: 1
                }
            ]);
        }

        res.json(data || []);
    } catch (err) {
        console.error('Error fetching banners:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Create new banner (Super Admin & Admin Only)
router.post('/', adminOnly, async (req, res) => {
    const {
        title_en,
        title_ar,
        type = 'top_banner',
        badge = '',
        discount_code = '',
        link_url = '',
        bg_color = '',
        text_color = '',
        is_active = true,
        display_order = 1,
        starts_at = null,
        expires_at = null,
        countdown_end = null
    } = req.body;

    if (!title_en && !title_ar) {
        return res.status(400).json({ error: 'Title in English or Arabic is required' });
    }

    try {
        const payload = {
            type,
            title_en: title_en || title_ar,
            title_ar: title_ar || title_en,
            badge: badge || null,
            discount_code: discount_code || null,
            link_url: link_url || null,
            bg_color: bg_color || null,
            text_color: text_color || null,
            is_active: is_active !== false,
            display_order: parseInt(display_order) || 1,
            starts_at: starts_at || null,
            expires_at: expires_at || null,
            countdown_end: countdown_end || null,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('banners')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        await logAdminAudit({
            req,
            action: 'CREATE_BANNER',
            target: 'banners',
            targetId: String(data.id),
            details: payload
        });

        res.status(201).json(data);
    } catch (err) {
        console.error('Error creating banner:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Update existing banner (Super Admin & Admin Only)
router.put('/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const {
        title_en,
        title_ar,
        type,
        badge,
        discount_code,
        link_url,
        bg_color,
        text_color,
        is_active,
        display_order,
        starts_at,
        expires_at,
        countdown_end
    } = req.body;

    try {
        const updatePayload = { updated_at: new Date().toISOString() };
        if (title_en !== undefined) updatePayload.title_en = title_en;
        if (title_ar !== undefined) updatePayload.title_ar = title_ar;
        if (type !== undefined) updatePayload.type = type;
        if (badge !== undefined) updatePayload.badge = badge || null;
        if (discount_code !== undefined) updatePayload.discount_code = discount_code || null;
        if (link_url !== undefined) updatePayload.link_url = link_url || null;
        if (bg_color !== undefined) updatePayload.bg_color = bg_color || null;
        if (text_color !== undefined) updatePayload.text_color = text_color || null;
        if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);
        if (display_order !== undefined) updatePayload.display_order = parseInt(display_order) || 1;
        if (starts_at !== undefined) updatePayload.starts_at = starts_at;
        if (expires_at !== undefined) updatePayload.expires_at = expires_at;
        if (countdown_end !== undefined) updatePayload.countdown_end = countdown_end;

        const { data, error } = await supabase
            .from('banners')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Banner not found' });

        await logAdminAudit({
            req,
            action: 'UPDATE_BANNER',
            target: 'banners',
            targetId: String(id),
            details: updatePayload
        });

        res.json(data);
    } catch (err) {
        console.error('Error updating banner:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Toggle active status (Super Admin & Admin Only)
router.patch('/:id/toggle', adminOnly, async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    try {
        const { data, error } = await supabase
            .from('banners')
            .update({ 
                is_active: Boolean(is_active), 
                updated_at: new Date().toISOString() 
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Banner not found' });

        await logAdminAudit({
            req,
            action: 'TOGGLE_BANNER',
            target: 'banners',
            targetId: String(id),
            details: { is_active: Boolean(is_active) }
        });

        res.json(data);
    } catch (err) {
        console.error('Error toggling banner status:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Delete banner (Super Admin & Admin Only)
router.delete('/:id', adminOnly, async (req, res) => {
    const { id } = req.params;

    try {
        const { error, count } = await supabase
            .from('banners')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) throw error;
        if (count === 0) return res.status(404).json({ error: 'Banner not found' });

        await logAdminAudit({
            req,
            action: 'DELETE_BANNER',
            target: 'banners',
            targetId: String(id),
            details: { deleted: true }
        });

        res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (err) {
        console.error('Error deleting banner:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
