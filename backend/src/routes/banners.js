import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

const INITIAL_DEFAULT_BANNERS = [
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

let inMemoryBanners = null;

// Helper to fetch persistent banners from system_settings
const getBannersFromDB = async () => {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('key', 'site_banners')
            .maybeSingle();

        if (data && Array.isArray(data.value)) {
            inMemoryBanners = data.value;
            return data.value;
        }

        // If key not found yet in system_settings, initialize it with default banners
        if (!data) {
            inMemoryBanners = [...INITIAL_DEFAULT_BANNERS];
            await supabase
                .from('system_settings')
                .upsert({
                    key: 'site_banners',
                    value: inMemoryBanners,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            return inMemoryBanners;
        }

        return inMemoryBanners || INITIAL_DEFAULT_BANNERS;
    } catch (err) {
        console.warn('Error reading site_banners from system_settings:', err.message);
        return inMemoryBanners || INITIAL_DEFAULT_BANNERS;
    }
};

// Helper to save banners to system_settings
const saveBannersToDB = async (bannersList) => {
    inMemoryBanners = bannersList;
    try {
        await supabase
            .from('system_settings')
            .upsert({
                key: 'site_banners',
                value: bannersList,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
    } catch (err) {
        console.warn('Error saving site_banners to system_settings:', err.message);
    }
};

// 1. Get all banners (Public / Filterable)
router.get('/', async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const { type, active } = req.query;

    try {
        const allBanners = await getBannersFromDB();
        let filtered = [...allBanners];

        if (type) {
            filtered = filtered.filter(b => (b.type || 'top_banner') === type);
        }
        if (active === 'true') {
            filtered = filtered.filter(b => b.is_active);
        }

        filtered.sort((a, b) => (a.display_order || 1) - (b.display_order || 1));

        res.json(filtered);
    } catch (err) {
        console.error('Error fetching banners:', err);
        res.status(500).json({ error: err.message });
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
        id: `banner-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
        const currentList = await getBannersFromDB();
        const updatedList = [newBanner, ...currentList];
        await saveBannersToDB(updatedList);

        res.status(201).json(newBanner);
    } catch (err) {
        console.error('Error creating banner:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Update existing banner (Super Admin Only)
router.put('/:id', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};

    try {
        const currentList = await getBannersFromDB();
        const idx = currentList.findIndex(b => String(b.id) === String(id));

        if (idx === -1) {
            return res.status(404).json({ error: 'Banner not found' });
        }

        currentList[idx] = {
            ...currentList[idx],
            ...updates,
            updated_at: new Date().toISOString()
        };

        await saveBannersToDB(currentList);
        res.json(currentList[idx]);
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
        const currentList = await getBannersFromDB();
        const idx = currentList.findIndex(b => String(b.id) === String(id));

        if (idx === -1) {
            return res.status(404).json({ error: 'Banner not found' });
        }

        currentList[idx].is_active = is_active;
        currentList[idx].updated_at = new Date().toISOString();

        await saveBannersToDB(currentList);
        res.json(currentList[idx]);
    } catch (err) {
        console.error('Error toggling banner status:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Delete banner (Super Admin Only)
router.delete('/:id', authenticateUser, verifyRole(['super_admin', 'admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const currentList = await getBannersFromDB();
        const filteredList = currentList.filter(b => String(b.id) !== String(id));

        await saveBannersToDB(filteredList);
        res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (err) {
        console.error('Error deleting banner:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
