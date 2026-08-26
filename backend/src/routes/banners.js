import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Fallback in-memory / cache store in case table doesn't exist yet
let fallbackBanners = [
    {
        id: 'top-banner-1',
        type: 'top_banner',
        title_en: 'Special Offer: Code GOLDEN20 for an extra 20% discount',
        title_ar: 'عرض خاص: كود GOLDEN20 للحصول على خصم إضافي 20%',
        badge: 'Special Offer',
        discount_code: 'GOLDEN20',
        link_url: '/shop',
        is_active: true,
        display_order: 1,
        created_at: new Date().toISOString()
    },
    {
        id: 'top-banner-2',
        type: 'top_banner',
        title_en: 'Free Delivery on all orders above 100 QAR',
        title_ar: 'توصيل مجاني لجميع الطلبات فوق 100 ريال',
        badge: 'Free Delivery',
        discount_code: '',
        link_url: '/shop',
        is_active: true,
        display_order: 2,
        created_at: new Date().toISOString()
    },
    {
        id: 'top-banner-3',
        type: 'top_banner',
        title_en: 'Welcome to PerfumeHub - Luxury Arabian & French Scents',
        title_ar: 'مرحباً بكم في بيرفيوم هاب - أفخم العطور الشرقية والفرنسية',
        badge: 'Welcome',
        discount_code: '',
        link_url: '/shop',
        is_active: true,
        display_order: 3,
        created_at: new Date().toISOString()
    }
];

// 1. Get all banners (Public / Filterable)
router.get('/', async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const { type, active } = req.query;

    try {
        let query = supabase.from('site_banners').select('*');

        if (type) {
            query = query.eq('type', type);
        }
        if (active === 'true') {
            query = query.eq('is_active', true);
        }

        query = query.order('display_order', { ascending: true }).order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.warn('site_banners query error, falling back to local store:', error.message);
            // Fallback filtering
            let filtered = [...fallbackBanners];
            if (type) {
                filtered = filtered.filter(b => b.type === type);
            }
            if (active === 'true') {
                filtered = filtered.filter(b => b.is_active);
            }
            return res.json(filtered);
        }

        if (!data || data.length === 0) {
            // If table exists but is empty, return fallback top banners
            if (type === 'top_banner' || !type) {
                return res.json(fallbackBanners.filter(b => !type || b.type === type));
            }
            return res.json([]);
        }

        res.json(data);
    } catch (err) {
        console.error('Error fetching banners:', err);
        res.json(fallbackBanners.filter(b => !type || b.type === type));
    }
});

// 2. Create new banner (Super Admin Only)
router.post('/', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
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
        display_order = 1
    } = req.body;

    if (!title_en && !title_ar) {
        return res.status(400).json({ error: 'Title in English or Arabic is required' });
    }

    const newBanner = {
        title_en: title_en || title_ar,
        title_ar: title_ar || title_en,
        type,
        badge,
        discount_code,
        link_url,
        bg_color,
        text_color,
        is_active: is_active !== false,
        display_order: parseInt(display_order) || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabase
            .from('site_banners')
            .insert([newBanner])
            .select();

        if (error) {
            console.warn('DB insert error into site_banners, saving to fallback cache:', error.message);
            const fallbackItem = { ...newBanner, id: `banner-${Date.now()}` };
            fallbackBanners.unshift(fallbackItem);
            return res.status(201).json(fallbackItem);
        }

        res.status(201).json(data ? data[0] : newBanner);
    } catch (err) {
        console.error('Error creating banner:', err);
        const fallbackItem = { ...newBanner, id: `banner-${Date.now()}` };
        fallbackBanners.unshift(fallbackItem);
        res.status(201).json(fallbackItem);
    }
});

// 3. Update existing banner (Super Admin Only)
router.put('/:id', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    try {
        const { data, error } = await supabase
            .from('site_banners')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.warn('DB update error on site_banners, updating fallback cache:', error.message);
            const idx = fallbackBanners.findIndex(b => String(b.id) === String(id));
            if (idx !== -1) {
                fallbackBanners[idx] = { ...fallbackBanners[idx], ...updates };
                return res.json(fallbackBanners[idx]);
            }
            return res.status(404).json({ error: 'Banner not found' });
        }

        res.json(data ? data[0] : updates);
    } catch (err) {
        console.error('Error updating banner:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Toggle active status (Super Admin Only)
router.patch('/:id/toggle', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    try {
        const { data, error } = await supabase
            .from('site_banners')
            .update({ is_active, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select();

        if (error) {
            const idx = fallbackBanners.findIndex(b => String(b.id) === String(id));
            if (idx !== -1) {
                fallbackBanners[idx].is_active = is_active;
                return res.json(fallbackBanners[idx]);
            }
            return res.status(404).json({ error: 'Banner not found' });
        }

        res.json(data ? data[0] : { id, is_active });
    } catch (err) {
        console.error('Error toggling banner status:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Delete banner (Super Admin Only)
router.delete('/:id', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('site_banners')
            .delete()
            .eq('id', id);

        if (error) {
            fallbackBanners = fallbackBanners.filter(b => String(b.id) !== String(id));
            return res.json({ success: true, message: 'Banner deleted from cache' });
        }

        fallbackBanners = fallbackBanners.filter(b => String(b.id) !== String(id));
        res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (err) {
        console.error('Error deleting banner:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
