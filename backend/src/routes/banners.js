import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';
import { logAdminAudit } from '../utils/auditLogger.js';

const router = express.Router();

const adminOnly = [authenticateUser, verifyRole(['super_admin', 'admin'])];

const DEFAULT_BANNERS = [
    {
        id: 'banner-top-hello025',
        type: 'top_banner',
        title_en: 'NEW',
        title_ar: 'جديد',
        badge: 'Special Offer',
        discount_code: 'HELLO025',
        link_url: '/shop',
        bg_color: '',
        text_color: '',
        is_active: true,
        display_order: 1,
        created_at: '2026-09-13T17:52:23.442Z',
        updated_at: new Date().toISOString()
    },
    {
        id: 'banner-hero-scent-genie',
        type: 'hero_banner',
        tagline_en: 'ROYAL AI FRAGRANCE CONCIERGE',
        tagline_ar: 'مستشارك العطري الذكي • AI CONCIERGE',
        title_en: 'Scent Genie AI Advisor',
        title_ar: 'جني العطور الذكي • Scent Genie',
        subtitle_en: 'Bespoke Olfactory Matching',
        subtitle_ar: 'خوارزمية ذكاء اصطناعي فاخرة',
        description_en: 'Unsure which fragrance fits your essence? Let our bespoke AI engine analyze your preferences and match you to rare niche perfumes in Qatar.',
        description_ar: 'لست متأكداً من اختيارك؟ دع خوارزمية الذكاء الاصطناعي تحلل ذوقك وترشح لك العطر النيش الأنسب لشخصيتك وأمسيات الدوحة.',
        button_text_en: 'LAUNCH SCENT GENIE AI',
        button_text_ar: 'اكتشف عطرك بالذكاء الاصطناعي',
        link_url: '/scent-genie',
        image_url: '/assets/ai_advisor_bg.webp',
        product_id: null,
        bg_color: '',
        text_color: '',
        is_active: true,
        display_order: 1,
        created_at: '2026-09-13T17:52:23.442Z',
        updated_at: new Date().toISOString()
    }
];

/**
 * Robust Dual-Layer Banner Storage:
 * Attempts querying public.banners table first.
 * If public.banners is missing or throws schema cache errors, smoothly reads
 * and writes to coupons table under row '__SITE_BANNERS__' in JSON format.
 */
const getBannersFromStorage = async () => {
    // 1. Try public.banners table
    try {
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
            return { data, source: 'banners_table' };
        }
    } catch (e) {
        // Table does not exist in schema cache
    }

    // 2. Fallback to coupons table __SITE_BANNERS__
    try {
        const { data: coupon, error: couponErr } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', '__SITE_BANNERS__')
            .maybeSingle();

        if (coupon && coupon.used_by) {
            let parsed = [];
            try {
                parsed = typeof coupon.used_by === 'string' ? JSON.parse(coupon.used_by) : coupon.used_by;
            } catch (err) {
                console.error('[Banners] JSON parse error:', err);
            }

            if (Array.isArray(parsed) && parsed.length > 0) {
                return { data: parsed, source: 'coupons_fallback' };
            }
        }

        // Initialize default seed into coupons table
        if (!couponErr) {
            if (coupon) {
                await supabase
                    .from('coupons')
                    .update({ used_by: JSON.stringify(DEFAULT_BANNERS), updated_at: new Date().toISOString() })
                    .eq('code', '__SITE_BANNERS__');
            } else {
                await supabase
                    .from('coupons')
                    .insert([{
                        code: '__SITE_BANNERS__',
                        discount_type: 'metadata',
                        discount_percentage: 0,
                        is_active: false,
                        usage_limit: 0,
                        usage_count: 0,
                        used_by: JSON.stringify(DEFAULT_BANNERS)
                    }]);
            }
        }
    } catch (err) {
        console.warn('[Banners] Fallback storage error:', err.message);
    }

    return { data: DEFAULT_BANNERS, source: 'defaults' };
};

const saveBannersToStorage = async (bannersList) => {
    // 1. Try writing to public.banners table
    try {
        // Test if table exists
        const { error: testErr } = await supabase.from('banners').select('id').limit(1);
        if (!testErr) {
            // Table exists - manage in table
            // However, to ensure consistency with rich fields (image_url, etc.), also sync fallback
        }
    } catch (e) {
        // Skip table
    }

    // 2. Persist to coupons table __SITE_BANNERS__
    const jsonStr = JSON.stringify(bannersList);
    const { data: existing } = await supabase
        .from('coupons')
        .select('id')
        .eq('code', '__SITE_BANNERS__')
        .maybeSingle();

    if (existing) {
        await supabase
            .from('coupons')
            .update({ used_by: jsonStr })
            .eq('code', '__SITE_BANNERS__');
    } else {
        await supabase
            .from('coupons')
            .insert([{
                code: '__SITE_BANNERS__',
                discount_type: 'metadata',
                discount_percentage: 0,
                is_active: false,
                usage_limit: 0,
                usage_count: 0,
                used_by: jsonStr
            }]);
    }
    return bannersList;
};

// 1. Get all banners (Public / Filterable, Edge CDN Cached)
router.get('/', async (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=86400');
    const { type, active } = req.query;

    try {
        const { data: allBanners } = await getBannersFromStorage();
        let result = [...allBanners];

        if (type) {
            result = result.filter(b => (b.type || 'top_banner') === type);
        }
        if (active === 'true') {
            result = result.filter(b => b.is_active !== false);
        }

        result.sort((a, b) => (parseInt(a.display_order) || 1) - (parseInt(b.display_order) || 1));
        res.json(result);
    } catch (err) {
        console.error('Error fetching banners:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Create new banner (Super Admin & Admin Only)
router.post('/', adminOnly, async (req, res) => {
    const {
        type = 'top_banner',
        title_en,
        title_ar,
        badge = '',
        discount_code = '',
        link_url = '',
        bg_color = '',
        text_color = '',
        is_active = true,
        display_order = 1,
        countdown_end = null,
        // Type 2 (Hero Slider) specific fields
        image_url = '',
        tagline_en = '',
        tagline_ar = '',
        subtitle_en = '',
        subtitle_ar = '',
        description_en = '',
        description_ar = '',
        button_text_en = '',
        button_text_ar = '',
        product_id = null
    } = req.body;

    if (!title_en && !title_ar) {
        return res.status(400).json({ error: 'Title in English or Arabic is required' });
    }

    try {
        const newBanner = {
            id: `banner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: type === 'hero_banner' ? 'hero_banner' : 'top_banner',
            title_en: title_en || title_ar,
            title_ar: title_ar || title_en,
            badge: badge || null,
            discount_code: discount_code ? discount_code.trim().toUpperCase() : null,
            link_url: link_url || (type === 'hero_banner' ? '/scent-genie' : '/shop'),
            bg_color: bg_color || null,
            text_color: text_color || null,
            is_active: is_active !== false,
            display_order: parseInt(display_order) || 1,
            countdown_end: countdown_end || null,
            // Hero fields
            image_url: image_url || (type === 'hero_banner' ? '/assets/ai_advisor_bg.webp' : null),
            tagline_en: tagline_en || null,
            tagline_ar: tagline_ar || null,
            subtitle_en: subtitle_en || null,
            subtitle_ar: subtitle_ar || null,
            description_en: description_en || null,
            description_ar: description_ar || null,
            button_text_en: button_text_en || (type === 'hero_banner' ? 'DISCOVER NOW' : null),
            button_text_ar: button_text_ar || (type === 'hero_banner' ? 'اكتشف الآن' : null),
            product_id: product_id ? String(product_id) : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: currentList } = await getBannersFromStorage();
        const updatedList = [...currentList, newBanner];
        await saveBannersToStorage(updatedList);

        await logAdminAudit({
            req,
            action: 'CREATE_BANNER',
            target: 'banners',
            targetId: newBanner.id,
            details: newBanner
        });

        res.status(201).json(newBanner);
    } catch (err) {
        console.error('Error creating banner:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Update existing banner (Super Admin & Admin Only)
router.put('/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const { data: currentList } = await getBannersFromStorage();
        const index = currentList.findIndex(b => String(b.id) === String(id));

        if (index === -1) {
            return res.status(404).json({ error: 'Banner not found' });
        }

        const existing = currentList[index];
        const updatedBanner = {
            ...existing,
            ...updates,
            id: existing.id, // preserve id
            type: updates.type !== undefined ? updates.type : existing.type,
            title_en: updates.title_en !== undefined ? updates.title_en : existing.title_en,
            title_ar: updates.title_ar !== undefined ? updates.title_ar : existing.title_ar,
            discount_code: updates.discount_code !== undefined ? (updates.discount_code ? updates.discount_code.trim().toUpperCase() : null) : existing.discount_code,
            display_order: updates.display_order !== undefined ? parseInt(updates.display_order) || 1 : existing.display_order,
            is_active: updates.is_active !== undefined ? Boolean(updates.is_active) : existing.is_active,
            updated_at: new Date().toISOString()
        };

        currentList[index] = updatedBanner;
        await saveBannersToStorage(currentList);

        await logAdminAudit({
            req,
            action: 'UPDATE_BANNER',
            target: 'banners',
            targetId: String(id),
            details: updatedBanner
        });

        res.json(updatedBanner);
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
        const { data: currentList } = await getBannersFromStorage();
        const index = currentList.findIndex(b => String(b.id) === String(id));

        if (index === -1) {
            return res.status(404).json({ error: 'Banner not found' });
        }

        currentList[index].is_active = is_active !== undefined ? Boolean(is_active) : !currentList[index].is_active;
        currentList[index].updated_at = new Date().toISOString();

        await saveBannersToStorage(currentList);

        await logAdminAudit({
            req,
            action: 'TOGGLE_BANNER',
            target: 'banners',
            targetId: String(id),
            details: { is_active: currentList[index].is_active }
        });

        res.json(currentList[index]);
    } catch (err) {
        console.error('Error toggling banner status:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Delete banner (Super Admin & Admin Only)
router.delete('/:id', adminOnly, async (req, res) => {
    const { id } = req.params;

    try {
        const { data: currentList } = await getBannersFromStorage();
        const filteredList = currentList.filter(b => String(b.id) !== String(id));

        if (filteredList.length === currentList.length) {
            return res.status(404).json({ error: 'Banner not found' });
        }

        await saveBannersToStorage(filteredList);

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
