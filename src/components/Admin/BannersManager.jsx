import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
    Megaphone, Plus, Edit, Trash2, Check, X, Eye, EyeOff, 
    Sparkles, Tag, ExternalLink, RefreshCw, Layers, ShieldCheck, 
    Sliders, ArrowUpRight, Copy, CheckCircle2 
} from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api_v1_0_2';
import './BannersManager.css';

const BannersManager = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [activeTab, setActiveTab] = useState('top_banner'); // 'top_banner' | 'hero_banner' | 'category_banner'

    // Form Modal State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBannerId, setEditingBannerId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);

    // Form Fields
    const [formData, setFormData] = useState({
        title_en: '',
        title_ar: '',
        type: 'top_banner',
        badge: 'Special Offer',
        discount_code: '',
        link_url: '',
        is_active: true,
        display_order: 1
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
            setLoading(true);
            const res = await api.get('/banners');
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
        return banners.filter(b => (b.type || 'top_banner') === activeTab);
    }, [banners, activeTab]);

    // Active banners for live preview
    const activeTopBanners = useMemo(() => {
        return banners.filter(b => (b.type || 'top_banner') === 'top_banner' && b.is_active);
    }, [banners]);

    // Live preview rotation index
    const [previewIndex, setPreviewIndex] = useState(0);
    useEffect(() => {
        if (activeTopBanners.length <= 1) return;
        const interval = setInterval(() => {
            setPreviewIndex(prev => (prev + 1) % activeTopBanners.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [activeTopBanners.length]);

    const handleOpenCreateModal = () => {
        setEditingBannerId(null);
        setFormData({
            title_en: '',
            title_ar: '',
            type: activeTab,
            badge: 'Special Offer',
            discount_code: '',
            link_url: '',
            is_active: true,
            display_order: filteredBanners.length + 1
        });
        setIsFormOpen(true);
        setError(null);
        setSuccessMessage('');
    };

    const handleOpenEditModal = (banner) => {
        setEditingBannerId(banner.id);
        setFormData({
            title_en: banner.title_en || '',
            title_ar: banner.title_ar || '',
            type: banner.type || 'top_banner',
            badge: banner.badge || '',
            discount_code: banner.discount_code || '',
            link_url: banner.link_url || '',
            is_active: banner.is_active !== false,
            display_order: banner.display_order || 1
        });
        setIsFormOpen(true);
        setError(null);
        setSuccessMessage('');
    };

    const handleSaveBanner = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');
        setSaving(true);

        try {
            if (editingBannerId) {
                await api.put(`/banners/${editingBannerId}`, formData, {
                    headers: { 'x-user-id': user?.id }
                });
                setSuccessMessage(isRTL ? 'تم تحديث الإعلان بنجاح' : 'Banner updated successfully');
            } else {
                await api.post('/banners', formData, {
                    headers: { 'x-user-id': user?.id }
                });
                setSuccessMessage(isRTL ? 'تم إنشاء الإعلان بنجاح' : 'New banner created successfully');
            }

            setIsFormOpen(false);
            fetchBanners();
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (banner) => {
        try {
            const nextActive = !banner.is_active;
            await api.patch(`/banners/${banner.id}/toggle`, { is_active: nextActive }, {
                headers: { 'x-user-id': user?.id }
            });
            // Update live state
            setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: nextActive } : b));
            setSuccessMessage(isRTL 
                ? (nextActive ? 'تم تفعيل الإعلان' : 'تم تعطيل الإعلان') 
                : (nextActive ? 'Banner activated' : 'Banner deactivated')
            );
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        }
    };

    const handleDeleteClick = (banner) => {
        setConfirmModal({
            isOpen: true,
            bannerId: banner.id,
            bannerTitle: isRTL ? (banner.title_ar || banner.title_en) : (banner.title_en || banner.title_ar)
        });
    };

    const confirmDelete = async () => {
        if (!confirmModal.bannerId) return;
        setError(null);
        setSuccessMessage('');

        try {
            await api.delete(`/banners/${confirmModal.bannerId}`, {
                headers: { 'x-user-id': user?.id }
            });
            setSuccessMessage(isRTL ? 'تم حذف الإعلان بنجاح' : 'Banner deleted successfully');
            setBanners(prev => prev.filter(b => b.id !== confirmModal.bannerId));
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setConfirmModal({ isOpen: false, bannerId: null, bannerTitle: '' });
        }
    };

    const handleCopyCode = (code) => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    if (loading && banners.length === 0) {
        return <div className="loading-spinner" style={{ textAlign: 'center', padding: '40px', color: '#c8a951' }}>Loading Banners...</div>;
    }

    const currentLivePreviewBanner = activeTopBanners[previewIndex] || activeTopBanners[0];

    return (
        <div className={`manager-content banners-manager ${isRTL ? 'rtl' : 'ltr'}`}>
            {/* Manager Header */}
            <div className="manager-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Megaphone size={isMobile ? 22 : 26} color="#c8a951" />
                        {isRTL ? 'إدارة البانرات والإعلانات' : 'Banner & Promotion Manager'}
                    </h2>
                    <span style={{ 
                        background: 'rgba(200, 169, 81, 0.15)', 
                        border: '1px solid rgba(200, 169, 81, 0.3)', 
                        color: '#c8a951', 
                        padding: '3px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: '700' 
                    }}>
                        {banners.length} {isRTL ? 'إعلانات' : 'Banners'}
                    </span>
                </div>

                <button 
                    type="button" 
                    onClick={handleOpenCreateModal}
                    className="btn btn-gold"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                >
                    <Plus size={16} />
                    <span>{isRTL ? '+ إضافة إعلان جديد' : '+ Add New Banner'}</span>
                </button>
            </div>

            {error && <div className="error-banner" style={{ marginBottom: '16px' }}>{error}</div>}
            {successMessage && <div className="success-banner" style={{ marginBottom: '16px' }}>{successMessage}</div>}

            {/* Classification Tabs */}
            <div className="banner-category-tabs">
                <button 
                    type="button"
                    className={`banner-tab-btn ${activeTab === 'top_banner' ? 'active' : ''}`}
                    onClick={() => setActiveTab('top_banner')}
                >
                    <Megaphone size={16} />
                    <span>{isRTL ? 'شريط الإعلانات العلوي (Top Banner)' : 'Top Announcement Banner'}</span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: '10px' }}>
                        {banners.filter(b => (b.type || 'top_banner') === 'top_banner').length}
                    </span>
                </button>
                <button 
                    type="button"
                    className={`banner-tab-btn ${activeTab === 'hero_banner' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hero_banner')}
                >
                    <Sparkles size={16} />
                    <span>{isRTL ? 'بانرات الواجهة الرئيسية (Hero)' : 'Hero & Slider Banners'}</span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: '10px' }}>
                        {banners.filter(b => b.type === 'hero_banner').length}
                    </span>
                </button>
                <button 
                    type="button"
                    className={`banner-tab-btn ${activeTab === 'category_banner' ? 'active' : ''}`}
                    onClick={() => setActiveTab('category_banner')}
                >
                    <Layers size={16} />
                    <span>{isRTL ? 'بانرات الأقسام (Category)' : 'Category Banners'}</span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: '10px' }}>
                        {banners.filter(b => b.type === 'category_banner').length}
                    </span>
                </button>
            </div>

            {/* Top Banner Live Preview Box */}
            {activeTab === 'top_banner' && (
                <div className="banner-live-preview-box">
                    <div className="banner-live-preview-header">
                        <div className="banner-live-preview-title">
                            <Eye size={14} />
                            <span>{isRTL ? 'المعاينة المباشرة لشريط الإعلانات في الموقع' : 'LIVE TOP BANNER PREVIEW ON SITE'}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {activeTopBanners.length} {isRTL ? 'إعلانات نشطة بالتناوب' : 'active announcements in rotation'}
                        </span>
                    </div>

                    <div className="banner-preview-bar">
                        {currentLivePreviewBanner ? (
                            <>
                                {currentLivePreviewBanner.badge && (
                                    <span style={{ background: 'rgba(200, 169, 81, 0.25)', border: '1px solid #c8a951', color: '#facc15', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800' }}>
                                        {currentLivePreviewBanner.badge}
                                    </span>
                                )}
                                <span>{isRTL ? (currentLivePreviewBanner.title_ar || currentLivePreviewBanner.title_en) : (currentLivePreviewBanner.title_en || currentLivePreviewBanner.title_ar)}</span>
                                {currentLivePreviewBanner.discount_code && (
                                    <span style={{ background: '#1e293b', border: '1px dashed #c8a951', padding: '2px 8px', borderRadius: '4px', color: '#fcd34d', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                                        {currentLivePreviewBanner.discount_code}
                                    </span>
                                )}
                            </>
                        ) : (
                            <span style={{ color: '#64748b' }}>
                                {isRTL ? 'لا توجد إعلانات نشطة حالياً (الشريط مخفي في الموقع)' : 'No active announcements (Bar is hidden)'}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Banners List Section */}
            <div className="card full-width" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: isMobile ? '16px' : '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sliders size={18} color="#c8a951" />
                        {activeTab === 'top_banner' && (isRTL ? 'قائمة إعلانات الشريط العلوي' : 'Top Announcement Messages')}
                        {activeTab === 'hero_banner' && (isRTL ? 'قائمة بانرات الواجهة الرئيسية' : 'Hero Banners List')}
                        {activeTab === 'category_banner' && (isRTL ? 'قائمة بانرات الأقسام' : 'Category Banners List')}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {filteredBanners.length} {isRTL ? 'عناصر مسجلة' : 'items'}
                    </span>
                </div>

                {filteredBanners.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#0f172a', borderRadius: '12px', border: '1px dashed #334155', color: '#94a3b8' }}>
                        <Megaphone size={36} color="#64748b" style={{ margin: '0 auto 10px', display: 'block' }} />
                        <p style={{ margin: 0, fontWeight: '700', color: '#cbd5e1' }}>
                            {isRTL ? 'لا توجد إعلانات في هذا القسم حالياً' : 'No banners created in this category yet.'}
                        </p>
                        <button 
                            type="button" 
                            onClick={handleOpenCreateModal}
                            className="btn btn-gold"
                            style={{ marginTop: '14px', padding: '8px 18px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                            <Plus size={15} />
                            <span>{isRTL ? 'إضافة أول إعلان الآن' : 'Create First Banner'}</span>
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filteredBanners.map((banner, index) => (
                            <div key={banner.id} className={`banner-card ${!banner.is_active ? 'inactive' : ''}`}>
                                {/* Left Content */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: 0 }}>
                                    <div style={{ 
                                        width: '32px', 
                                        height: '32px', 
                                        borderRadius: '8px', 
                                        background: banner.is_active ? 'rgba(200, 169, 81, 0.15)' : 'rgba(100, 116, 139, 0.15)', 
                                        border: `1px solid ${banner.is_active ? 'rgba(200, 169, 81, 0.35)' : 'rgba(100, 116, 139, 0.3)'}`,
                                        color: banner.is_active ? '#facc15' : '#94a3b8',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        fontSize: '0.8rem', 
                                        fontWeight: '800',
                                        flexShrink: 0
                                    }}>
                                        #{banner.display_order || index + 1}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                            {banner.badge && (
                                                <span className="banner-badge-tag">{banner.badge}</span>
                                            )}
                                            {banner.discount_code && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleCopyCode(banner.discount_code)}
                                                    className="banner-code-tag"
                                                    title={isRTL ? 'انقر للنسخ' : 'Click to copy'}
                                                    style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    {copiedCode === banner.discount_code ? <CheckCircle2 size={12} color="#4ade80" /> : <Copy size={12} />}
                                                    <span>{banner.discount_code}</span>
                                                </button>
                                            )}
                                            {banner.link_url && (
                                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                    <ArrowUpRight size={12} /> {banner.link_url}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.95rem', marginBottom: '2px' }}>
                                            {banner.title_en}
                                        </div>
                                        {banner.title_ar && (
                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', direction: 'rtl' }}>
                                                {banner.title_ar}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Controls */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    {/* Active Toggle Switch */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleActive(banner)}
                                        title={banner.is_active ? (isRTL ? 'إلغاء التفعيل' : 'Deactivate') : (isRTL ? 'تفعيل' : 'Activate')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: `1px solid ${banner.is_active ? 'rgba(34, 197, 94, 0.4)' : 'rgba(100, 116, 139, 0.4)'}`,
                                            background: banner.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                            color: banner.is_active ? '#4ade80' : '#94a3b8',
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {banner.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                                        <span>{banner.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}</span>
                                    </button>

                                    {/* Edit Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(banner)}
                                        title={isRTL ? 'تعديل الإعلان' : 'Edit Banner'}
                                        style={{
                                            width: '34px',
                                            height: '34px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(59, 130, 246, 0.4)',
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            color: '#93c5fd',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Edit size={15} />
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteClick(banner)}
                                        title={isRTL ? 'حذف الإعلان' : 'Delete Banner'}
                                        style={{
                                            width: '34px',
                                            height: '34px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            color: '#fca5a5',
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
                        ))}
                    </div>
                )}
            </div>

            {/* Create / Edit Banner Modal */}
            {isFormOpen && (
                <div className="banner-modal-overlay animate-fade-in" onClick={() => setIsFormOpen(false)}>
                    <div className="banner-modal-content animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Megaphone size={20} color="#c8a951" />
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', fontWeight: '800' }}>
                                    {editingBannerId 
                                        ? (isRTL ? 'تعديل الإعلان' : 'Edit Banner') 
                                        : (isRTL ? 'إضافة إعلان جديد' : 'Add New Banner')}
                                </h3>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsFormOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveBanner} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Classification Type */}
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '700' }}>
                                    {isRTL ? 'تصنيف الإعلان' : 'Banner Placement / Classification'}
                                </label>
                                <select 
                                    className="form-control"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', outline: 'none' }}
                                >
                                    <option value="top_banner">{isRTL ? 'شريط الإعلانات العلوي (Top Banner)' : 'Top Announcement Banner'}</option>
                                    <option value="hero_banner">{isRTL ? 'بانرات الواجهة الرئيسية (Hero)' : 'Hero & Slider Banner'}</option>
                                    <option value="category_banner">{isRTL ? 'بانرات الأقسام (Category)' : 'Category Banner'}</option>
                                </select>
                            </div>

                            {/* English Title */}
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '700' }}>
                                    {isRTL ? 'نص الإعلان (الإنجليزية)' : 'Banner Text (English)'} *
                                </label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="e.g. Special Offer: Code GOLDEN20 for an extra 20% discount"
                                    value={formData.title_en}
                                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                                    style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', outline: 'none' }}
                                />
                            </div>

                            {/* Arabic Title */}
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '700' }}>
                                    {isRTL ? 'نص الإعلان (العربية)' : 'Banner Text (Arabic)'}
                                </label>
                                <input 
                                    type="text"
                                    placeholder="مثال: عرض خاص: كود GOLDEN20 للحصول على خصم إضافي 20%"
                                    dir="rtl"
                                    value={formData.title_ar}
                                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                                    style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', outline: 'none' }}
                                />
                            </div>

                            {/* Badge and Discount Code */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '700' }}>
                                        {isRTL ? 'الشارة الترويجية' : 'Badge / Tag'}
                                    </label>
                                    <input 
                                        type="text"
                                        placeholder="Special Offer, Free Delivery, etc."
                                        value={formData.badge}
                                        onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                                        style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', outline: 'none' }}
                                    />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '700' }}>
                                        {isRTL ? 'كود الخصم (اختياري)' : 'Promo Code (Optional)'}
                                    </label>
                                    <input 
                                        type="text"
                                        placeholder="GOLDEN20"
                                        value={formData.discount_code}
                                        onChange={(e) => setFormData({ ...formData, discount_code: e.target.value.toUpperCase() })}
                                        style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', outline: 'none', fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>

                            {/* Link Target URL and Display Order */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '700' }}>
                                        {isRTL ? 'رابط الوجهة (اختياري)' : 'Destination URL (Optional)'}
                                    </label>
                                    <input 
                                        type="text"
                                        placeholder="/shop or /category/arabic"
                                        value={formData.link_url}
                                        onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                                        style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', outline: 'none' }}
                                    />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '700' }}>
                                        {isRTL ? 'ترتيب الظهور' : 'Order'}
                                    </label>
                                    <input 
                                        type="number"
                                        min={1}
                                        value={formData.display_order}
                                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })}
                                        style={{ background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            {/* Active Checkbox */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <input 
                                    type="checkbox"
                                    id="banner_is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    style={{ width: '18px', height: '18px', accentColor: '#c8a951', cursor: 'pointer' }}
                                />
                                <label htmlFor="banner_is_active" style={{ fontSize: '0.88rem', color: '#f8fafc', cursor: 'pointer', fontWeight: '600' }}>
                                    {isRTL ? 'تفعيل الإعلان فوراً في الموقع' : 'Activate this banner immediately on the live site'}
                                </label>
                            </div>

                            {/* Modal Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid #334155', paddingTop: '14px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-gold"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}
                                >
                                    <Check size={16} />
                                    {saving 
                                        ? (isRTL ? 'جاري الحفظ...' : 'Saving...') 
                                        : (isRTL ? 'حفظ الإعلان' : 'Save Banner')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmDelete}
                title={isRTL ? 'حذف الإعلان' : 'DELETE BANNER'}
                message={isRTL 
                    ? `هل أنت متأكد من حذف هذا الإعلان: "${confirmModal.bannerTitle}"؟` 
                    : `Are you sure you want to permanently delete the banner: "${confirmModal.bannerTitle}"?`
                }
                confirmText={isRTL ? 'حذف نهائياً' : 'PERMANENTLY DELETE'}
                cancelText={isRTL ? 'إلغاء' : 'CANCEL'}
                isRTL={isRTL}
                variant="danger"
                isPremium={true}
                iconType="trash"
            />
        </div>
    );
};

export default BannersManager;
