import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { 
    Megaphone, Plus, Edit, Trash2, Check, X, Eye, EyeOff, 
    Sparkles, Tag, ExternalLink, RefreshCw, Layers, ShieldCheck, 
    Sliders, ArrowUpRight, Copy, CheckCircle2, Clock, Search, ChevronDown,
    ChevronLeft, ChevronRight, Image as ImageIcon, ShoppingBag, Palette
} from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';
import { AuthContext } from '../../context/AuthContext';
import { ShopContext } from '../../context/ShopContext';
import api from '../../utils/api_v1_0_2';
import './BannersManager.css';

/* ─── Searchable Product Selector for Hero Product Promotions ─── */
const SearchableProductSelect = ({ products = [], value, onChange, isRTL, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedProduct = products.find(p => String(p.id) === String(value));

    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return products.slice(0, 30);
        const term = searchTerm.toLowerCase();
        return products.filter(p => {
            const name = (p.name || '').toLowerCase();
            const brand = (p.brand || '').toLowerCase();
            const sku = (p.sku || `PH-${p.id}`).toLowerCase();
            const idStr = String(p.id);
            return name.includes(term) || brand.includes(term) || sku.includes(term) || idStr.includes(term);
        }).slice(0, 30);
    }, [products, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getProductCode = (prod) => prod.sku || `PH-${prod.id}-24`;

    return (
        <div ref={dropdownRef} className="searchable-select-container" style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    width: '100%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '44px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedProduct ? (
                        <>
                            <span style={{ fontWeight: '600', color: '#f8fafc' }}>{selectedProduct.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({selectedProduct.brand})</span>
                            <span style={{ fontSize: '0.72rem', background: 'rgba(200, 169, 81, 0.15)', color: '#c8a951', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(200, 169, 81, 0.3)', fontWeight: '600', fontFamily: 'monospace' }}>
                                Code: {getProductCode(selectedProduct)}
                            </span>
                        </>
                    ) : (
                        <span style={{ color: '#64748b' }}>{placeholder || (isRTL ? '-- اختر منتجاً للترويج (اختياري) --' : '-- Select a Product to Promote (Optional) --')}</span>
                    )}
                </div>
                <ChevronDown size={16} color="#94a3b8" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    padding: '8px',
                    maxHeight: '280px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder={isRTL ? 'ابحث باسم المنتج، الماركة، أو الكود...' : 'Search product name, brand, or code...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            style={{
                                width: '100%',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                color: '#f8fafc',
                                padding: '8px 12px 8px 32px',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div
                            onClick={() => { onChange(null); setIsOpen(false); setSearchTerm(''); }}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                color: '#94a3b8',
                                background: !value ? 'rgba(200, 169, 81, 0.1)' : 'transparent',
                                borderBottom: '1px dashed #334155'
                            }}
                        >
                            🚫 {isRTL ? 'بدون منتج محدد (إعلان عام / خدمة)' : 'Custom Banner (No specific product)'}
                        </div>

                        {filteredProducts.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                                {isRTL ? 'لم يتم العثور على منتجات مطابقة' : 'No matching products found'}
                            </div>
                        ) : (
                            filteredProducts.map(prod => {
                                const isSelected = String(prod.id) === String(value);
                                const code = getProductCode(prod);
                                return (
                                    <div
                                        key={prod.id}
                                        onClick={() => { onChange(prod); setIsOpen(false); setSearchTerm(''); }}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: isSelected ? 'rgba(200, 169, 81, 0.2)' : 'transparent',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '500', color: isSelected ? '#c8a951' : '#f8fafc' }}>
                                                {prod.name}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {prod.brand} {prod.type ? `• ${prod.type}` : ''} • {prod.price} QAR
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{
                                                fontSize: '0.72rem',
                                                background: '#0f172a',
                                                color: '#c8a951',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid #334155',
                                                fontFamily: 'monospace'
                                            }}>
                                                {code}
                                            </span>
                                            {isSelected && <CheckCircle2 size={14} color="#c8a951" />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── Master Ads & Banners Manager ─── */
const BannersManager = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const { products = [] } = useContext(ShopContext) || {};
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    
    // Exactly 2 Clean Tabs: 'top_banner' (Alphanumeric/Codes) & 'hero_banner' (Visual Image/Product Promote)
    const [activeTab, setActiveTab] = useState('top_banner');

    // Form Modal State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBannerId, setEditingBannerId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);

    // Form Fields
    const [formData, setFormData] = useState({
        type: 'top_banner',
        title_en: '',
        title_ar: '',
        badge: 'Special Offer',
        discount_code: '',
        link_url: '',
        is_active: true,
        display_order: 1,
        // Hero fields
        image_url: '/assets/ai_advisor_bg.webp',
        tagline_en: 'ROYAL AI FRAGRANCE CONCIERGE',
        tagline_ar: 'مستشارك العطري الذكي • AI CONCIERGE',
        subtitle_en: 'Bespoke Olfactory Matching',
        subtitle_ar: 'خوارزمية ذكاء اصطناعي فاخرة',
        description_en: '',
        description_ar: '',
        button_text_en: 'DISCOVER NOW',
        button_text_ar: 'اكتشف الآن',
        product_id: null
    });

    // Delete Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        bannerId: null,
        bannerTitle: ''
    });

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchBanners = async () => {
        try {
            const res = await api.get(`/banners?_t=${Date.now()}`);
            setBanners(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching banners:', err);
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchBanners();
        }
    }, [user]);

    // Filter banners by current active classification
    const filteredBanners = useMemo(() => {
        return banners
            .filter(b => (b.type || 'top_banner') === activeTab)
            .sort((a, b) => (parseInt(a.display_order) || 1) - (parseInt(b.display_order) || 1));
    }, [banners, activeTab]);

    // Active banners for live previews
    const activeTopBanners = useMemo(() => {
        return banners.filter(b => (b.type || 'top_banner') === 'top_banner' && b.is_active);
    }, [banners]);

    const activeHeroBanners = useMemo(() => {
        return banners.filter(b => b.type === 'hero_banner' && b.is_active);
    }, [banners]);

    // Live preview rotation index for Top Banners
    const [topPreviewIdx, setTopPreviewIdx] = useState(0);
    useEffect(() => {
        if (activeTopBanners.length <= 1) return;
        const interval = setInterval(() => {
            setTopPreviewIdx(prev => (prev + 1) % activeTopBanners.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [activeTopBanners.length]);

    // Live preview index for Hero Banners
    const [heroPreviewIdx, setHeroPreviewIdx] = useState(0);
    useEffect(() => {
        if (activeHeroBanners.length <= 1) return;
        const interval = setInterval(() => {
            setHeroPreviewIdx(prev => (prev + 1) % activeHeroBanners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [activeHeroBanners.length]);

    const handleOpenCreateModal = () => {
        setEditingBannerId(null);
        if (activeTab === 'top_banner') {
            setFormData({
                type: 'top_banner',
                title_en: 'NEW',
                title_ar: 'جديد',
                badge: 'Special Offer',
                discount_code: 'HELLO025',
                link_url: '/shop',
                is_active: true,
                display_order: filteredBanners.length + 1,
                image_url: '',
                tagline_en: '',
                tagline_ar: '',
                subtitle_en: '',
                subtitle_ar: '',
                description_en: '',
                description_ar: '',
                button_text_en: '',
                button_text_ar: '',
                product_id: null
            });
        } else {
            setFormData({
                type: 'hero_banner',
                title_en: 'Scent Genie AI Advisor',
                title_ar: 'جني العطور الذكي • Scent Genie',
                badge: 'ROYAL AI CONCIERGE',
                discount_code: '',
                link_url: '/scent-genie',
                is_active: true,
                display_order: filteredBanners.length + 1,
                image_url: '/assets/ai_advisor_bg.webp',
                tagline_en: 'ROYAL AI FRAGRANCE CONCIERGE',
                tagline_ar: 'مستشارك العطري الذكي • AI CONCIERGE',
                subtitle_en: 'Bespoke Olfactory Matching',
                subtitle_ar: 'خوارزمية ذكاء اصطناعي فاخرة',
                description_en: 'Unsure which fragrance fits your essence? Let our bespoke AI engine analyze your preferences and match you to rare niche perfumes in Qatar.',
                description_ar: 'لست متأكداً من اختيارك؟ دع خوارزمية الذكاء الاصطناعي تحلل ذوقك وترشح لك العطر النيش الأنسب لشخصيتك وأمسيات الدوحة.',
                button_text_en: 'LAUNCH SCENT GENIE AI',
                button_text_ar: 'اكتشف عطرك بالذكاء الاصطناعي',
                product_id: null
            });
        }
        setIsFormOpen(true);
        setError(null);
        setSuccessMessage('');
    };

    const handleOpenEditModal = (banner) => {
        setEditingBannerId(banner.id);
        setFormData({
            type: banner.type || 'top_banner',
            title_en: banner.title_en || '',
            title_ar: banner.title_ar || '',
            badge: banner.badge || '',
            discount_code: banner.discount_code || '',
            link_url: banner.link_url || '',
            is_active: banner.is_active !== false,
            display_order: banner.display_order || 1,
            // Hero fields
            image_url: banner.image_url || '/assets/ai_advisor_bg.webp',
            tagline_en: banner.tagline_en || banner.badge || '',
            tagline_ar: banner.tagline_ar || '',
            subtitle_en: banner.subtitle_en || '',
            subtitle_ar: banner.subtitle_ar || '',
            description_en: banner.description_en || '',
            description_ar: banner.description_ar || '',
            button_text_en: banner.button_text_en || 'DISCOVER NOW',
            button_text_ar: banner.button_text_ar || 'اكتشف الآن',
            product_id: banner.product_id || null
        });
        setIsFormOpen(true);
        setError(null);
        setSuccessMessage('');
    };

    const handleProductSelect = (product) => {
        if (!product) {
            setFormData(prev => ({
                ...prev,
                product_id: null
            }));
            return;
        }

        const rawImg = Array.isArray(product.image) ? product.image[0] : product.image;
        setFormData(prev => ({
            ...prev,
            product_id: product.id,
            title_en: product.name,
            title_ar: product.name,
            tagline_en: `👑 ${product.brand.toUpperCase()}`,
            tagline_ar: `👑 ${product.brand}`,
            subtitle_en: `${product.type || 'Eau de Parfum'} • ${product.price} QAR`,
            subtitle_ar: `${product.type || 'عطر فاخر'} • ${product.price} ر.ق`,
            description_en: product.description || `Experience the captivating essence of ${product.name} by ${product.brand}. Available for immediate delivery in Qatar.`,
            description_ar: product.description || `استمتع بعبير عطر ${product.name} الفريد من دار ${product.brand}. متاح للتوصيل الفوري والاستلام داخل قطر.`,
            button_text_en: 'SHOP THIS FRAGRANCE',
            button_text_ar: 'تسوق هذا العطر الآن',
            link_url: `/product/${product.id}`,
            image_url: rawImg || prev.image_url
        }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            if (editingBannerId) {
                await api.put(`/banners/${editingBannerId}`, formData);
                setSuccessMessage(isRTL ? 'تم تحديث الإعلان بنجاح' : 'Banner updated successfully');
            } else {
                await api.post('/banners', formData);
                setSuccessMessage(isRTL ? 'تم إنشاء الإعلان بنجاح' : 'New banner created successfully');
            }
            try {
                localStorage.removeItem('perfumehub_top_banners');
                localStorage.removeItem('perfumehub_hero_banners');
            } catch (e) {}
            await fetchBanners();
            setIsFormOpen(false);
        } catch (err) {
            console.error('Error saving banner:', err);
            setError(err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (banner) => {
        const nextActive = !banner.is_active;
        try {
            await api.patch(`/banners/${banner.id}/toggle`, { is_active: nextActive });
            setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: nextActive } : b));
            try {
                localStorage.removeItem('perfumehub_top_banners');
                localStorage.removeItem('perfumehub_hero_banners');
            } catch (e) {}
        } catch (err) {
            console.error('Error toggling banner status:', err);
            setError(err.response?.data?.error || err.message);
        }
    };

    const handleDeleteClick = (banner) => {
        setConfirmModal({
            isOpen: true,
            bannerId: banner.id,
            bannerTitle: banner.title_en || banner.title_ar || 'Untitled Banner'
        });
    };

    const handleConfirmDelete = async () => {
        if (!confirmModal.bannerId) return;
        const targetId = confirmModal.bannerId;
        try {
            await api.delete(`/banners/${targetId}`);
            setBanners(prev => prev.filter(b => String(b.id) !== String(targetId)));
            try {
                localStorage.removeItem('perfumehub_top_banners');
                localStorage.removeItem('perfumehub_hero_banners');
            } catch (e) {}
            setSuccessMessage(isRTL ? 'تم حذف الإعلان بنجاح' : 'Banner deleted successfully');
            await fetchBanners();
        } catch (err) {
            console.error('Error deleting banner:', err);
            setError(err.response?.data?.error || err.message);
        } finally {
            setConfirmModal({ isOpen: false, bannerId: null, bannerTitle: '' });
        }
    };

    const handleCopyCode = (code) => {
        if (!code) return;
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(code);
        }
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    // Current top banner for live preview
    const curTopBanner = activeTopBanners[topPreviewIdx] || activeTopBanners[0];
    const curHeroBanner = activeHeroBanners[heroPreviewIdx] || activeHeroBanners[0];

    return (
        <div className={`banners-manager ${isRTL ? 'rtl' : 'ltr'}`}>
            {/* Header / Title Bar */}
            <div className="banners-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <Megaphone size={24} color="#d4af37" />
                        <span>{isRTL ? 'إدارة الإعلانات والبانرات' : 'Ads & Banners Manager'}</span>
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                        {isRTL 
                            ? 'تحكم كامل وبسيط في نوعين من الإعلانات: شريط العروض العلوي وبانرات الواجهة الرئيسية مع ترويج المنتجات.' 
                            : 'Easily control both live ad formats: Top Alphanumeric Promo Bar & Homepage Hero Product Sliders.'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={fetchBanners}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', fontSize: '0.85rem' }}
                        title={isRTL ? 'تحديث' : 'Refresh'}
                    >
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                        <span>{isRTL ? 'تحديث' : 'Refresh'}</span>
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleOpenCreateModal}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700' }}
                    >
                        <Plus size={16} />
                        <span>{activeTab === 'top_banner' ? (isRTL ? 'إضافة إعلان علوي' : 'Add Top Announcement') : (isRTL ? 'إضافة بانر رئيسي' : 'Add Hero Banner')}</span>
                    </button>
                </div>
            </div>

            {/* Notification messages */}
            {successMessage && (
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                </div>
            )}
            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                    <X size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* The 2 Core Tabs */}
            <div className="banner-category-tabs">
                <button
                    type="button"
                    className={`banner-tab-btn ${activeTab === 'top_banner' ? 'active' : ''}`}
                    onClick={() => setActiveTab('top_banner')}
                >
                    <Tag size={16} />
                    <span>{isRTL ? '1. شريط الإعلانات العلوي (أرقام وكوبونات)' : '1. Top Announcement Bar (Alphanumeric & Promo Codes)'}</span>
                    <span className="banner-tab-count">
                        {activeTopBanners.length} / {banners.filter(b => (b.type || 'top_banner') === 'top_banner').length}
                    </span>
                </button>

                <button
                    type="button"
                    className={`banner-tab-btn ${activeTab === 'hero_banner' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hero_banner')}
                >
                    <Sparkles size={16} />
                    <span>{isRTL ? '2. بانرات الواجهة الرئيسية وترويج المنتجات' : '2. Hero Slider & Product Promotions'}</span>
                    <span className="banner-tab-count">
                        {activeHeroBanners.length} / {banners.filter(b => b.type === 'hero_banner').length}
                    </span>
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════
               LIVE STOREFRONT PREVIEWS (Matches Screenshots)
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'top_banner' && (
                <div className="banner-live-preview-box">
                    <div className="banner-live-preview-header">
                        <span className="banner-live-preview-title">
                            <Eye size={14} color="#d4af37" />
                            {isRTL ? 'معاينة حية للمتجر: شريط الإعلانات العلوي' : 'Live Storefront Preview: Top Announcement Ticker'}
                        </span>
                        {activeTopBanners.length > 1 && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {isRTL ? `يعرض الإعلان ${topPreviewIdx + 1} من ${activeTopBanners.length}` : `Displaying ${topPreviewIdx + 1} of ${activeTopBanners.length}`}
                            </span>
                        )}
                    </div>

                    {curTopBanner ? (
                        <div className="banner-preview-bar">
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {curTopBanner.badge && (
                                    <span style={{
                                        background: 'transparent',
                                        color: '#d4af37',
                                        border: '1px solid #d4af37',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.72rem',
                                        fontWeight: '700',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {curTopBanner.badge}
                                    </span>
                                )}
                                <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '0.85rem' }}>
                                    {isRTL ? (curTopBanner.title_ar || curTopBanner.title_en) : (curTopBanner.title_en || curTopBanner.title_ar)}
                                </span>
                                {curTopBanner.discount_code && (
                                    <button
                                        type="button"
                                        onClick={() => handleCopyCode(curTopBanner.discount_code)}
                                        style={{
                                            background: 'rgba(212, 175, 55, 0.1)',
                                            border: '1px dashed #d4af37',
                                            color: '#d4af37',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            fontFamily: 'monospace',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                        title={isRTL ? 'انقر للنسخ' : 'Click to copy'}
                                    >
                                        {copiedCode === curTopBanner.discount_code ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                                        <span>{curTopBanner.discount_code}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', background: '#000', borderRadius: '8px' }}>
                            {isRTL ? 'لا توجد إعلانات علوية نشطة حالياً (الشريط العلوي مخفي في المتجر)' : 'No active top announcements (top bar is currently hidden on storefront)'}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'hero_banner' && (
                <div className="banner-live-preview-box">
                    <div className="banner-live-preview-header">
                        <span className="banner-live-preview-title">
                            <Sparkles size={14} color="#d4af37" />
                            {isRTL ? 'معاينة حية للواجهة الرئيسية: سلايدر العروض الفاخرة' : 'Live Storefront Preview: Homepage Luxury Hero Slider'}
                        </span>
                        {activeHeroBanners.length > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => setHeroPreviewIdx(prev => (prev === 0 ? activeHeroBanners.length - 1 : prev - 1))}
                                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    {heroPreviewIdx + 1} / {activeHeroBanners.length}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setHeroPreviewIdx(prev => (prev + 1) % activeHeroBanners.length)}
                                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {curHeroBanner ? (
                        <div className="hero-preview-card" style={{
                            background: 'radial-gradient(ellipse at 80% 50%, rgba(200, 169, 81, 0.15) 0%, #0a0a0a 70%)',
                            border: '1px solid rgba(200, 169, 81, 0.35)',
                            borderRadius: '16px',
                            padding: '24px',
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '260px 1fr',
                            gap: '24px',
                            alignItems: 'center',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#111' }}>
                                <img
                                    src={curHeroBanner.image_url || '/assets/ai_advisor_bg.webp'}
                                    alt="Hero Preview"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.src = '/assets/ai_advisor_bg.webp'; }}
                                />
                                {curHeroBanner.product_id && (
                                    <span style={{ position: 'absolute', top: '10px', left: isRTL ? 'auto' : '10px', right: isRTL ? '10px' : 'auto', background: 'rgba(212, 175, 55, 0.9)', color: '#000', fontSize: '0.68rem', fontWeight: '800', padding: '3px 8px', borderRadius: '4px' }}>
                                        {isRTL ? 'منتج مميز' : 'FEATURED PRODUCT'}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d4af37', fontSize: '0.78rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                    <Sparkles size={14} />
                                    <span>{isRTL ? (curHeroBanner.tagline_ar || curHeroBanner.tagline_en || 'عرض حصري') : (curHeroBanner.tagline_en || curHeroBanner.tagline_ar || 'EXCLUSIVE OFFER')}</span>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: "var(--font-heading, 'Playfair Display', serif)" }}>
                                    {isRTL ? (curHeroBanner.title_ar || curHeroBanner.title_en) : (curHeroBanner.title_en || curHeroBanner.title_ar)}
                                </h3>
                                {(curHeroBanner.subtitle_en || curHeroBanner.subtitle_ar) && (
                                    <span style={{ color: '#d4af37', fontSize: '0.9rem', fontWeight: '600' }}>
                                        {isRTL ? (curHeroBanner.subtitle_ar || curHeroBanner.subtitle_en) : (curHeroBanner.subtitle_en || curHeroBanner.subtitle_ar)}
                                    </span>
                                )}
                                {(curHeroBanner.description_en || curHeroBanner.description_ar) && (
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', maxWidth: '600px' }}>
                                        {isRTL ? (curHeroBanner.description_ar || curHeroBanner.description_en) : (curHeroBanner.description_en || curHeroBanner.description_ar)}
                                    </p>
                                )}
                                <div style={{ marginTop: '8px' }}>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)',
                                        color: '#000',
                                        padding: '10px 22px',
                                        borderRadius: '8px',
                                        fontWeight: '800',
                                        fontSize: '0.85rem',
                                        boxShadow: '0 4px 12px rgba(200, 169, 81, 0.3)'
                                    }}>
                                        <Sparkles size={14} />
                                        <span>{isRTL ? (curHeroBanner.button_text_ar || 'اكتشف الآن') : (curHeroBanner.button_text_en || 'DISCOVER NOW')}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', background: '#0a0a0a', borderRadius: '12px', border: '1px solid #222' }}>
                            {isRTL ? 'لا توجد بانرات رئيسية مخصصة (يتم عرض جني العطور الذكي الافتراضي في الواجهة)' : 'No custom hero slides configured (homepage displays default Scent Genie AI Advisor slide)'}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
               BANNER CARDS LIST
            ══════════════════════════════════════════════════════════════ */}
            <div className="banners-list-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#cbd5e1' }}>
                        {activeTab === 'top_banner' 
                            ? (isRTL ? `قائمة إعلانات الشريط العلوي (${filteredBanners.length})` : `Top Announcement Banners (${filteredBanners.length})`)
                            : (isRTL ? `قائمة بانرات الواجهة الرئيسية (${filteredBanners.length})` : `Hero Slider & Product Promotion Banners (${filteredBanners.length})`)}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {isRTL ? 'مرتبة حسب أولوية العرض (#1 يظهر أولاً)' : 'Ordered by display priority (#1 appears first)'}
                    </span>
                </div>

                {filteredBanners.length === 0 ? (
                    <div style={{ background: '#1e293b', border: '1px dashed #334155', borderRadius: '12px', padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        <Megaphone size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                        <h4 style={{ color: '#f8fafc', margin: '0 0 6px 0' }}>
                            {activeTab === 'top_banner' ? (isRTL ? 'لا توجد إعلانات شريط علوي' : 'No top announcements') : (isRTL ? 'لا توجد بانرات رئيسية' : 'No hero banners')}
                        </h4>
                        <p style={{ fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                            {isRTL ? 'ابدأ بإضافة أول إعلان للتحكم في ظهور العروض للزوار فوراً.' : 'Create your first banner to control promotional visibility on the live storefront.'}
                        </p>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleOpenCreateModal}
                            style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '0.85rem' }}
                        >
                            <Plus size={14} />
                            <span>{isRTL ? 'إضافة إعلان الآن' : 'Create Banner Now'}</span>
                        </button>
                    </div>
                ) : (
                    filteredBanners.map((banner, index) => (
                        <div key={banner.id} className={`banner-card ${!banner.is_active ? 'inactive' : ''}`}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                                {/* Order Pill */}
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: banner.is_active ? 'rgba(200, 169, 81, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                    border: `1px solid ${banner.is_active ? 'rgba(200, 169, 81, 0.35)' : 'rgba(100, 116, 139, 0.3)'}`,
                                    color: banner.is_active ? '#facc15' : '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '800',
                                    fontSize: '0.85rem',
                                    flexShrink: 0
                                }}>
                                    #{banner.display_order || index + 1}
                                </div>

                                {/* Thumbnail for Hero Banners */}
                                {banner.type === 'hero_banner' && (
                                    <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155', flexShrink: 0, background: '#0f172a' }}>
                                        <img 
                                            src={banner.image_url || '/assets/ai_advisor_bg.webp'} 
                                            alt={banner.title_en}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.target.src = '/assets/ai_advisor_bg.webp'; }}
                                        />
                                    </div>
                                )}

                                {/* Content Details */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        {banner.badge && (
                                            <span className="banner-badge-tag">{banner.badge}</span>
                                        )}
                                        {banner.type === 'top_banner' && banner.discount_code && (
                                            <span 
                                                onClick={() => handleCopyCode(banner.discount_code)}
                                                className="banner-code-tag"
                                                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                title={isRTL ? 'انقر للنسخ' : 'Click to copy code'}
                                            >
                                                {copiedCode === banner.discount_code ? <CheckCircle2 size={12} color="#4ade80" /> : <Copy size={12} />}
                                                <span>{banner.discount_code}</span>
                                            </span>
                                        )}
                                        {banner.type === 'hero_banner' && banner.product_id && (
                                            <span style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700' }}>
                                                {isRTL ? 'مرتبط بمنتج في المتجر' : 'Product Promotion'}
                                            </span>
                                        )}
                                        {banner.link_url && (
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                <ArrowUpRight size={12} /> {banner.link_url}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {banner.title_en}
                                        {banner.title_ar && banner.title_ar !== banner.title_en && (
                                            <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '8px', fontWeight: '500' }}>
                                                ({banner.title_ar})
                                            </span>
                                        )}
                                    </div>

                                    {banner.type === 'hero_banner' && (banner.subtitle_en || banner.description_en) && (
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {banner.subtitle_en ? `${banner.subtitle_en} • ` : ''}
                                            {banner.description_en || banner.description_ar}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <button
                                    type="button"
                                    onClick={() => handleToggleActive(banner)}
                                    title={banner.is_active ? (isRTL ? 'إلغاء التفعيل' : 'Deactivate') : (isRTL ? 'تفعيل' : 'Activate')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '7px 12px',
                                        borderRadius: '8px',
                                        border: `1px solid ${banner.is_active ? 'rgba(34, 197, 94, 0.4)' : 'rgba(100, 116, 139, 0.4)'}`,
                                        background: banner.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                        color: banner.is_active ? '#4ade80' : '#94a3b8',
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                        fontWeight: '700',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {banner.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                                    <span>{banner.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(banner)}
                                    title={isRTL ? 'تعديل' : 'Edit'}
                                    style={{
                                        background: '#334155',
                                        border: '1px solid #475569',
                                        color: '#f8fafc',
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Edit size={15} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleDeleteClick(banner)}
                                    title={isRTL ? 'حذف' : 'Delete'}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#f87171',
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
               CREATE / EDIT MODAL
            ══════════════════════════════════════════════════════════════ */}
            {isFormOpen && (
                <div className="banner-modal-overlay animate-fade-in" onClick={() => setIsFormOpen(false)}>
                    <div className="banner-modal-content animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {activeTab === 'top_banner' ? <Tag size={20} color="#d4af37" /> : <Sparkles size={20} color="#d4af37" />}
                                <span>
                                    {editingBannerId 
                                        ? (isRTL ? 'تعديل الإعلان' : 'Edit Banner') 
                                        : (activeTab === 'top_banner' ? (isRTL ? 'إنشاء إعلان علوي جديد' : 'New Top Announcement') : (isRTL ? 'إنشاء بانر واجهة رئيسية' : 'New Hero Banner'))}
                                </span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Type 2: Product Promotion Quick Picker */}
                            {activeTab === 'hero_banner' && (
                                <div style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px dashed rgba(212, 175, 55, 0.35)', borderRadius: '10px', padding: '14px' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#d4af37', marginBottom: '6px' }}>
                                        🛍️ {isRTL ? 'ترويج عطر من كتالوج المتجر (اختياري - يملأ البيانات تلقائياً):' : 'Promote a Perfume from Catalog (Optional - Auto-fills details):'}
                                    </label>
                                    <SearchableProductSelect
                                        products={products}
                                        value={formData.product_id}
                                        onChange={handleProductSelect}
                                        isRTL={isRTL}
                                    />
                                </div>
                            )}

                            {/* Titles EN & AR */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                        {isRTL ? 'العنوان الرئيسي (إنجليزي) *' : 'Main Title (English) *'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title_en}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title_en: e.target.value }))}
                                        placeholder={activeTab === 'top_banner' ? 'e.g. NEW' : 'e.g. Scent Genie AI Advisor'}
                                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                        {isRTL ? 'العنوان الرئيسي (عربي) *' : 'Main Title (Arabic) *'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        dir="rtl"
                                        value={formData.title_ar}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title_ar: e.target.value }))}
                                        placeholder={activeTab === 'top_banner' ? 'مثال: جديد' : 'مثال: جني العطور الذكي'}
                                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                    />
                                </div>
                            </div>

                            {/* Type 1: Badge & Alphanumeric Promo Code */}
                            {activeTab === 'top_banner' && (
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                            {isRTL ? 'شارة التمييز (Badge)' : 'Badge Label'}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.badge}
                                            onChange={(e) => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                                            placeholder="Special Offer, VIP, Limited"
                                            style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                            {isRTL ? 'كود الخصم الأبجدي / الرقمي (مع زر نسخ سريع)' : 'Alphanumeric Promo Code (Click-to-Copy)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.discount_code}
                                            onChange={(e) => setFormData(prev => ({ ...prev, discount_code: e.target.value.toUpperCase() }))}
                                            placeholder="e.g. HELLO025, LUXURY15"
                                            style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#facc15', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'monospace', fontWeight: '700' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Type 2: Hero Visual Elements (Image, Tagline, Subtitle, Description, CTA) */}
                            {activeTab === 'hero_banner' && (
                                <>
                                    {/* Image URL with Preview */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                            {isRTL ? 'رابط صورة البانر (Image URL) *' : 'Banner Hero Image URL *'}
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                required
                                                value={formData.image_url}
                                                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                                                placeholder="/assets/ai_advisor_bg.webp or https://..."
                                                style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, image_url: '/assets/ai_advisor_bg.webp' }))}
                                                style={{ background: '#334155', border: 'none', color: '#cbd5e1', padding: '0 12px', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                            >
                                                {isRTL ? 'صورة افتراضية' : 'Use AI Bg'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tagline EN & AR */}
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                                {isRTL ? 'الشعار الصغير (Tagline EN)' : 'Top Tagline (English)'}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.tagline_en}
                                                onChange={(e) => setFormData(prev => ({ ...prev, tagline_en: e.target.value }))}
                                                placeholder="e.g. ROYAL AI FRAGRANCE CONCIERGE"
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                                {isRTL ? 'الشعار الصغير (Tagline AR)' : 'Top Tagline (Arabic)'}
                                            </label>
                                            <input
                                                type="text"
                                                dir="rtl"
                                                value={formData.tagline_ar}
                                                onChange={(e) => setFormData(prev => ({ ...prev, tagline_ar: e.target.value }))}
                                                placeholder="مثال: مستشارك العطري الذكي"
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Subtitle EN & AR */}
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                                {isRTL ? 'العنوان الفرعي (Subtitle EN)' : 'Subtitle (English)'}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.subtitle_en}
                                                onChange={(e) => setFormData(prev => ({ ...prev, subtitle_en: e.target.value }))}
                                                placeholder="e.g. Bespoke Olfactory Matching"
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                                {isRTL ? 'العنوان الفرعي (Subtitle AR)' : 'Subtitle (Arabic)'}
                                            </label>
                                            <input
                                                type="text"
                                                dir="rtl"
                                                value={formData.subtitle_ar}
                                                onChange={(e) => setFormData(prev => ({ ...prev, subtitle_ar: e.target.value }))}
                                                placeholder="مثال: خوارزمية ذكاء اصطناعي فاخرة"
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Descriptions EN & AR */}
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                                {isRTL ? 'الوصف الترويجي (EN)' : 'Promo Description (English)'}
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={formData.description_en}
                                                onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                                                placeholder="Tell customers why they should explore this collection or fragrance..."
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem', resize: 'vertical' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                                {isRTL ? 'الوصف الترويجي (AR)' : 'Promo Description (Arabic)'}
                                            </label>
                                            <textarea
                                                rows={2}
                                                dir="rtl"
                                                value={formData.description_ar}
                                                onChange={(e) => setFormData(prev => ({ ...prev, description_ar: e.target.value }))}
                                                placeholder="اكتب نبذة ترويجية جذابة تشجع الزائر على الشراء..."
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem', resize: 'vertical' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Button / CTA Text EN & AR */}
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                                {isRTL ? 'نص الزر (Button CTA EN)' : 'Button CTA Text (English)'}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.button_text_en}
                                                onChange={(e) => setFormData(prev => ({ ...prev, button_text_en: e.target.value }))}
                                                placeholder="e.g. LAUNCH SCENT GENIE AI, SHOP NOW"
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                                {isRTL ? 'نص الزر (Button CTA AR)' : 'Button CTA Text (Arabic)'}
                                            </label>
                                            <input
                                                type="text"
                                                dir="rtl"
                                                value={formData.button_text_ar}
                                                onChange={(e) => setFormData(prev => ({ ...prev, button_text_ar: e.target.value }))}
                                                placeholder="مثال: اكتشف عطرك بالذكاء الاصطناعي"
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Destination Link URL & Display Order */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                        {isRTL ? 'الرابط الموجه (Link URL)' : 'Destination Link URL'}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.link_url}
                                        onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                                        placeholder={activeTab === 'top_banner' ? '/shop or /product/123' : '/scent-genie or /product/45'}
                                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                                        {isRTL ? 'ترتيب الظهور (#)' : 'Display Order (#)'}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={formData.display_order}
                                        onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 1 }))}
                                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '9px 12px', borderRadius: '8px', fontSize: '0.88rem' }}
                                    />
                                </div>
                            </div>

                            {/* Active Switch */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                                <input
                                    type="checkbox"
                                    id="banner_is_active_toggle"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                    style={{ width: '18px', height: '18px', accentColor: '#d4af37', cursor: 'pointer' }}
                                />
                                <label htmlFor="banner_is_active_toggle" style={{ fontSize: '0.88rem', color: '#f8fafc', cursor: 'pointer', fontWeight: '600' }}>
                                    {isRTL ? 'تفعيل الإعلان فوراً وعرضه للزوار' : 'Activate this banner immediately on live storefront'}
                                </label>
                            </div>

                            {/* Modal Footer */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    style={{ background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '9px 18px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer' }}
                                >
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-primary"
                                    style={{ padding: '9px 24px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', minWidth: '110px' }}
                                >
                                    {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (editingBannerId ? (isRTL ? 'تحديث الإعلان' : 'Update Banner') : (isRTL ? 'حفظ ونشر' : 'Save & Publish'))}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={isRTL ? 'تأكيد حذف الإعلان' : 'Confirm Delete Banner'}
                message={isRTL 
                    ? `هل أنت متأكد من حذف هذا الإعلان: "${confirmModal.bannerTitle}"؟` 
                    : `Are you sure you want to permanently delete the banner: "${confirmModal.bannerTitle}"?`}
                confirmText={isRTL ? 'نعم، احذف' : 'Yes, Delete'}
                cancelText={isRTL ? 'إلغاء' : 'Cancel'}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmModal({ isOpen: false, bannerId: null, bannerTitle: '' })}
            />
        </div>
    );
};

export default BannersManager;
