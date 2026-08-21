import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Sparkles, Megaphone, Plus, Trash2, Search, Filter, CheckCircle, XCircle, Store, Calendar, TrendingUp, Pencil, RefreshCw, Check, ChevronDown, Globe } from 'lucide-react';
import api from '../../utils/api_v1_0_2';

const SearchableProductSelect = ({ products, value, onChange, isRTL, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedProduct = products.find(p => String(p.id) === String(value));

    const filteredProducts = products.filter(p => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const sku = (p.sku || `PH-${p.id}-24`).toLowerCase();
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const idStr = String(p.id);
        return name.includes(term) || brand.includes(term) || sku.includes(term) || idStr.includes(term);
    });

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getProductCode = (prod) => prod.sku || (prod.id ? `PH-${prod.id}-24` : '');

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
                        <span style={{ color: '#64748b' }}>{placeholder || (isRTL ? '-- اختر منتجاً (اختياري) --' : '-- Select a Product (Optional) --')}</span>
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
                            🚫 {isRTL ? 'بدون منتج (حملة متجر فقط)' : 'None (Shop Banner Only)'}
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
                                        onClick={() => { onChange(prod.id); setIsOpen(false); setSearchTerm(''); }}
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
                                                {prod.brand} {prod.type ? `• ${prod.type}` : ''}
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
                                            {isSelected && <CheckCircle size={14} color="#c8a951" />}
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

const DiscoveryManager = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const [shops, setShops] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [products, setProducts] = useState([]);
    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all'); // all, featured, regular

    // Local inputs for shop boost multiplier (prevents API call on every single keystroke)
    const [boostInputs, setBoostInputs] = useState({});
    const [savingBoostId, setSavingBoostId] = useState(null);

    // Create Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        shop_id: '',
        placement_slot: 'homepage_featured',
        start_date: '',
        end_date: '',
        product_id: null
    });

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editCampaignData, setEditCampaignData] = useState(null);

    const [submitting, setSubmitting] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        message: '',
        onConfirm: null
    });

    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        message: '',
        isError: false
    });

    const getRegionBadge = (regionId) => {
        const reg = regions.find(r => Number(r.id) === Number(regionId));
        if (!reg) return { name: isRTL ? 'عام (كل المناطق)' : 'Global', flag: '🌐', code: 'ALL' };
        const flagMap = { 'QA': '🇶🇦', 'AE': '🇦🇪', 'GB': '🇬🇧', 'SA': '🇸🇦', 'KW': '🇰🇼', 'OM': '🇴🇲', 'BH': '🇧🇭' };
        return {
            name: reg.name,
            code: reg.code,
            flag: flagMap[reg.code?.toUpperCase()] || '📍'
        };
    };

    const fetchData = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const [shopsRes, campaignsRes, productsRes, regionsRes] = await Promise.all([
                api.get('/admin/shops'),
                api.get('/admin/discover-campaigns'),
                api.get('/products'),
                api.get('/regions').catch(() => ({ data: [] }))
            ]);
            
            const shopsData = Array.isArray(shopsRes.data) ? shopsRes.data : [];
            setShops(shopsData);
            
            // Populate boost inputs
            const initialBoosts = {};
            shopsData.forEach(s => {
                initialBoosts[s.id] = s.manual_boost_multiplier !== undefined ? s.manual_boost_multiplier : 1.0;
            });
            setBoostInputs(initialBoosts);

            setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : []);
            setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);

            const regionsData = Array.isArray(regionsRes.data) ? regionsRes.data : [];
            setRegions(regionsData);

            if (user?.role === 'regional_admin' && user?.region_id) {
                setSelectedRegion(String(user.region_id));
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchData();
        }
    }, [user?.id]);

    const deleteCampaign = async (id) => {
        setConfirmModal({
            isOpen: true,
            message: isRTL ? 'هل أنت متأكد من حذف هذه الحملة؟' : 'Are you sure you want to delete this campaign?',
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/discover-campaigns/${id}`);
                    setCampaigns(prev => prev.filter(c => c.id !== id));
                    window.dispatchEvent(new Event('discover-campaigns-updated'));
                } catch (err) {
                    setAlertModal({
                        isOpen: true,
                        message: err.response?.data?.error || err.message,
                        isError: true
                    });
                }
            }
        });
    };

    const createCampaign = async (e) => {
        e.preventDefault();
        if (!newCampaign.shop_id || !newCampaign.placement_slot || !newCampaign.end_date) {
            setAlertModal({
                isOpen: true,
                message: isRTL ? 'الرجاء تعبئة الحقول المطلوبة' : 'Please fill in the required fields',
                isError: true
            });
            return;
        }
        try {
            setSubmitting(true);
            const res = await api.post('/admin/discover-campaigns', newCampaign);
            setIsModalOpen(false);
            setNewCampaign({
                shop_id: '',
                placement_slot: 'homepage_featured',
                start_date: '',
                end_date: '',
                product_id: null
            });

            if (res.data && res.data.campaign) {
                setCampaigns(prev => [res.data.campaign, ...prev]);
            } else {
                fetchData();
            }
            window.dispatchEvent(new Event('discover-campaigns-updated'));
        } catch (err) {
            setAlertModal({
                isOpen: true,
                message: err.response?.data?.error || err.message,
                isError: true
            });
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (camp) => {
        setEditCampaignData({
            id: camp.id,
            shop_id: camp.shop_id || '',
            placement_slot: camp.placement_slot || 'homepage_featured',
            start_date: camp.start_date ? camp.start_date.split('T')[0] : '',
            end_date: camp.end_date ? camp.end_date.split('T')[0] : '',
            product_id: camp.product_id || null,
            active: camp.active !== undefined ? camp.active : true
        });
        setIsEditModalOpen(true);
    };

    const updateCampaign = async (e) => {
        e.preventDefault();
        if (!editCampaignData) return;

        try {
            setSubmitting(true);
            const res = await api.put(`/admin/discover-campaigns/${editCampaignData.id}`, editCampaignData);
            setIsEditModalOpen(false);
            
            if (res.data && res.data.campaign) {
                setCampaigns(prev => prev.map(c => c.id === editCampaignData.id ? res.data.campaign : c));
            } else {
                fetchData();
            }
            window.dispatchEvent(new Event('discover-campaigns-updated'));
        } catch (err) {
            setAlertModal({
                isOpen: true,
                message: err.response?.data?.error || err.message,
                isError: true
            });
        } finally {
            setSubmitting(false);
        }
    };

    const toggleCampaignActive = async (camp) => {
        try {
            const newActive = !camp.active;
            const res = await api.put(`/admin/discover-campaigns/${camp.id}`, { active: newActive });
            setCampaigns(prev => prev.map(c => c.id === camp.id ? { ...c, active: newActive } : c));
            window.dispatchEvent(new Event('discover-campaigns-updated'));
        } catch (err) {
            setAlertModal({
                isOpen: true,
                message: err.response?.data?.error || err.message,
                isError: true
            });
        }
    };

    const toggleFeatured = async (shopId, currentStatus) => {
        if (!user?.id) return;
        try {
            await api.patch(`/admin/shops/${shopId}/feature`, { is_featured: !currentStatus });
            setShops(prev => prev.map(s => s.id === shopId ? { ...s, is_featured: !currentStatus } : s));
        } catch (err) { 
            setAlertModal({ isOpen: true, message: 'Failed to update shop status', isError: true });
        }
    };

    const handleBoostChange = (shopId, val) => {
        setBoostInputs(prev => ({ ...prev, [shopId]: val }));
    };

    const saveBoost = async (shopId) => {
        const value = boostInputs[shopId];
        const multiplier = parseFloat(value);
        if (isNaN(multiplier) || multiplier < 0.1 || multiplier > 10.0) return;

        const currentShop = shops.find(s => s.id === shopId);
        if (currentShop && currentShop.manual_boost_multiplier === multiplier) return;

        try {
            setSavingBoostId(shopId);
            await api.patch(`/admin/shops/${shopId}/boost`, { manual_boost_multiplier: multiplier });
            setShops(prev => prev.map(s => s.id === shopId ? { ...s, manual_boost_multiplier: multiplier } : s));
        } catch (err) {
            setAlertModal({ isOpen: true, message: 'Failed to update boost', isError: true });
        } finally {
            setSavingBoostId(null);
        }
    };

    const clearAllCampaigns = async () => {
        setConfirmModal({
            isOpen: true,
            message: isRTL ? 'هل أنت متأكد من مسح جميع حملات الاكتشاف؟' : 'Are you sure you want to clear ALL discover campaigns?',
            onConfirm: async () => {
                try {
                    await api.delete('/admin/discover-campaigns/clear-all');
                    setCampaigns([]);
                    window.dispatchEvent(new Event('discover-campaigns-updated'));
                } catch (err) {
                    setAlertModal({
                        isOpen: true,
                        message: err.response?.data?.error || err.message,
                        isError: true
                    });
                }
            }
        });
    };

    const filteredCampaigns = campaigns.filter(c => {
        if (selectedRegion === 'all') return true;
        return Number(c.shop_region_id) === Number(selectedRegion) || Number(c.region_id) === Number(selectedRegion);
    });

    const filteredShops = shops.filter(s => {
        if (selectedRegion !== 'all' && Number(s.region_id) !== Number(selectedRegion)) return false;
        if (filter === 'featured' && !s.is_featured) return false;
        if (filter === 'regular' && s.is_featured) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (s.name && s.name.toLowerCase().includes(q)) || (s.id && s.id.toLowerCase().includes(q));
        }
        return true;
    });

    if (loading) return <div className="admin-section center-content"><TrendingUp size={32} className="spin gold-icon" /></div>;
    if (error) return <div className="admin-section center-content" style={{ color: '#e74c3c' }}>Error: {error}</div>;

    return (
        <div className="admin-section animate-fade-in">
            <div className="manager-header">
                <h2>
                    <Sparkles size={24} color="#c8a951" />
                    {isRTL ? 'إدارة الاكتشاف' : 'Discovery Manager'}
                </h2>
                <div className="manager-header-actions">
                    <button 
                        className="btn btn-outline" 
                        onClick={fetchData}
                        style={{ 
                            borderColor: 'rgba(255, 255, 255, 0.3)', 
                            color: '#ffffff',
                            background: 'transparent',
                            padding: '8px 16px',
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshCw size={14} style={{ marginRight: '6px' }} />
                        {isRTL ? 'تحديث' : 'Refresh'}
                    </button>
                    {campaigns.length > 0 && (
                        <button 
                            className="btn btn-outline"
                            onClick={clearAllCampaigns}
                            style={{
                                borderColor: '#ef4444',
                                color: '#ef4444',
                                background: 'transparent',
                                padding: '8px 16px',
                                cursor: 'pointer'
                            }}
                        >
                            <Trash2 size={14} style={{ marginRight: '6px' }} />
                            {isRTL ? 'مسح الكل' : 'Clear All'}
                        </button>
                    )}
                    <button className="btn btn-gold" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} /> {isRTL ? 'حملة جديدة' : 'New Campaign'}
                    </button>
                </div>
            </div>

            {/* Region Filter Selector */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px',
                padding: '12px 16px',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(51, 65, 85, 0.6)',
                borderRadius: '12px',
                flexWrap: 'wrap'
            }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe size={16} color="#c8a951" />
                    {isRTL ? 'تصفية حسب المنطقة:' : 'Target Region:'}
                </span>
                <button
                    type="button"
                    onClick={() => setSelectedRegion('all')}
                    style={{
                        background: selectedRegion === 'all' ? '#c8a951' : 'rgba(15, 23, 42, 0.7)',
                        color: selectedRegion === 'all' ? '#000' : '#cbd5e1',
                        border: selectedRegion === 'all' ? '1px solid #c8a951' : '1px solid #334155',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '0.82rem',
                        fontWeight: selectedRegion === 'all' ? '700' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                    }}
                >
                    🌐 {isRTL ? 'جميع المناطق' : 'All Regions'}
                </button>
                {regions.map(r => {
                    const badge = getRegionBadge(r.id);
                    const isSelected = String(selectedRegion) === String(r.id);
                    return (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedRegion(String(r.id))}
                            style={{
                                background: isSelected ? '#c8a951' : 'rgba(15, 23, 42, 0.7)',
                                color: isSelected ? '#000' : '#cbd5e1',
                                border: isSelected ? '1px solid #c8a951' : '1px solid #334155',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '0.82rem',
                                fontWeight: isSelected ? '700' : '500',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                        >
                            {badge.flag} {r.name} ({r.code})
                        </button>
                    );
                })}
            </div>

            {/* Stats Summary */}
            <div className="admin-stats-grid">
                <div className="admin-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ color: '#c8a951', marginBottom: '8px' }}><Sparkles size={24} /></div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>{filteredShops.filter(s => s.is_featured).length}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {isRTL ? 'المتاجر المميزة' : 'Featured Shops'} {selectedRegion !== 'all' ? `(${getRegionBadge(selectedRegion).code})` : ''}
                    </div>
                </div>
                <div className="admin-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ color: '#34d399', marginBottom: '8px' }}><Megaphone size={24} /></div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>{filteredCampaigns.filter(c => c.active).length}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {isRTL ? 'الحملات النشطة' : 'Active Campaigns'} {selectedRegion !== 'all' ? `(${getRegionBadge(selectedRegion).code})` : ''}
                    </div>
                </div>
            </div>

            {/* Campaign Table */}
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={18} />
                {isRTL ? 'الحملات الإعلانية' : 'Active Campaigns'}
                {selectedRegion !== 'all' && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(200, 169, 81, 0.2)', color: '#c8a951', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                        {getRegionBadge(selectedRegion).flag} {getRegionBadge(selectedRegion).name}
                    </span>
                )}
            </h3>
            <div className="admin-table-container" style={{ marginBottom: '40px' }}>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{isRTL ? 'المتجر' : 'Shop'}</th>
                            <th>{isRTL ? 'المنطقة' : 'Region'}</th>
                            <th>{isRTL ? 'المركز' : 'Placement'}</th>
                            <th>{isRTL ? 'الفترة' : 'Duration'}</th>
                            <th>{isRTL ? 'الحالة' : 'Status'}</th>
                            <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCampaigns.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>{isRTL ? 'لا توجد حملات نشطة لهذه المنطقة' : 'No active campaigns found for this region'}</td></tr>
                        ) : filteredCampaigns.map(camp => {
                            const badge = getRegionBadge(camp.shop_region_id || camp.region_id);
                            return (
                                <tr key={camp.id}>
                                    <td>
                                        <div style={{ fontWeight: '600', color: '#f8fafc' }}>{camp.shop_name}</div>
                                        {camp.product_name && (
                                            <div style={{ fontSize: '0.75rem', color: '#c8a951', marginTop: '2px' }}>
                                                📢 {isRTL ? `منتج: ${camp.product_name}` : `Product: ${camp.product_name}`}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className="status-badge" style={{ background: 'rgba(200, 169, 81, 0.15)', color: '#c8a951', border: '1px solid rgba(200, 169, 81, 0.3)', whiteSpace: 'nowrap' }}>
                                            {badge.flag} {badge.name}
                                        </span>
                                    </td>
                                    <td><span className="status-badge" style={{ background: '#334155', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{camp.placement_slot.replace('_', ' ')}</span></td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{camp.start_date ? new Date(camp.start_date).toLocaleDateString() : 'N/A'} - {camp.end_date ? new Date(camp.end_date).toLocaleDateString() : 'N/A'}</td>
                                    <td>
                                        <button
                                            onClick={() => toggleCampaignActive(camp)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                whiteSpace: 'nowrap',
                                                color: camp.active ? '#34d399' : '#94a3b8'
                                            }}
                                        >
                                            {camp.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                            {camp.active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'منتهي' : 'Inactive')}
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="admin-action-btn edit-btn" onClick={() => openEditModal(camp)} title={isRTL ? 'تعديل' : 'Edit'}>
                                                <Pencil size={16} />
                                            </button>
                                            <button className="admin-action-btn delete-btn" onClick={() => deleteCampaign(camp.id)} title={isRTL ? 'حذف' : 'Delete'}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Featured Shop Toggle List */}
            <div className="discovery-section-header">
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                    <Store size={18} style={{ marginRight: '8px' }} />
                    {isRTL ? 'تحرير المتاجر المميزة' : 'Feature Shops & Boosts'}
                </h3>
                
                {/* Filter Tabs */}
                <div className="filter-tabs-container">
                    <button
                        onClick={() => setFilter('all')}
                        style={{
                            background: filter === 'all' ? '#334155' : 'transparent',
                            color: filter === 'all' ? '#f8fafc' : '#94a3b8',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 12px',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        {isRTL ? 'الكل' : 'All'}
                    </button>
                    <button
                        onClick={() => setFilter('featured')}
                        style={{
                            background: filter === 'featured' ? '#c8a951' : 'transparent',
                            color: filter === 'featured' ? '#000' : '#94a3b8',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 12px',
                            fontSize: '0.8rem',
                            fontWeight: filter === 'featured' ? '600' : '400',
                            cursor: 'pointer'
                        }}
                    >
                        {isRTL ? 'المميزة فقط' : 'Featured Only'}
                    </button>
                    <button
                        onClick={() => setFilter('regular')}
                        style={{
                            background: filter === 'regular' ? '#334155' : 'transparent',
                            color: filter === 'regular' ? '#f8fafc' : '#94a3b8',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 12px',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        {isRTL ? 'العادية فقط' : 'Regular Only'}
                    </button>
                </div>
            </div>
            
            <div className="admin-search-container" style={{ marginBottom: '20px' }}>
                <span className="admin-search-icon"><Search size={16} /></span>
                <input 
                    type="text" 
                    className="form-control admin-search-input" 
                    placeholder={isRTL ? 'ابحث عن متجر...' : 'Search for a shop...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{isRTL ? 'المتجر' : 'Shop'}</th>
                            <th>{isRTL ? 'المنطقة' : 'Region'}</th>
                            <th>{isRTL ? 'الحالة المميزة' : 'Featured Status'}</th>
                            <th>{isRTL ? 'مضاعف التعزيز' : 'Manual Boost'}</th>
                            <th>{isRTL ? 'التقييم' : 'Current Rating'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredShops.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>{isRTL ? 'لا توجد متاجر تطابق البحث' : 'No matching shops found'}</td></tr>
                        ) : filteredShops.map(shop => {
                            const badge = getRegionBadge(shop.region_id);
                            return (
                                <tr key={shop.id}>
                                    <td>
                                        <div style={{ fontWeight: '600' }}>{shop.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{shop.id}</div>
                                    </td>
                                    <td>
                                        <span className="status-badge" style={{ background: '#334155', whiteSpace: 'nowrap' }}>
                                            {badge.flag} {badge.name}
                                        </span>
                                    </td>
                                    <td>
                                        <button 
                                            className={`admin-action-btn ${shop.is_featured ? 'edit-btn' : ''}`}
                                            onClick={() => toggleFeatured(shop.id, shop.is_featured)}
                                            style={{ width: 'auto', padding: '6px 12px', gap: '8px', borderColor: shop.is_featured ? '#c8a951' : '#334155', color: shop.is_featured ? '#c8a951' : '#94a3b8' }}
                                        >
                                            {shop.is_featured ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                            {shop.is_featured ? (isRTL ? 'مميز' : 'Featured') : (isRTL ? 'عادي' : 'Regular')}
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input 
                                                type="number" 
                                                step="0.1" min="0.1" max="10.0"
                                                className="form-control" 
                                                style={{ width: '80px', height: '36px', fontSize: '0.9rem' }}
                                                value={boostInputs[shop.id] !== undefined ? boostInputs[shop.id] : shop.manual_boost_multiplier}
                                                onChange={(e) => handleBoostChange(shop.id, e.target.value)}
                                                onBlur={() => saveBoost(shop.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.target.blur();
                                                    }
                                                }}
                                            />
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>x</span>
                                            {savingBoostId === shop.id && <RefreshCw size={14} className="spin" style={{ color: '#c8a951' }} />}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontWeight: '700' }}>
                                            {shop.rating_avg} <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '400' }}>({shop.review_count})</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Create Campaign Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '500px',
                        padding: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#f8fafc' }}>
                                {isRTL ? 'إنشاء حملة اكتشاف جديدة' : 'Create New Discover Campaign'}
                            </h3>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={createCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                    {isRTL ? 'اختر المتجر *' : 'Select Shop *'}
                                </label>
                                <select 
                                    className="form-control"
                                    style={{
                                        background: '#0f172a',
                                        border: '1px solid #334155',
                                        color: '#f8fafc',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        width: '100%'
                                    }}
                                    value={newCampaign.shop_id}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, shop_id: e.target.value })}
                                    required
                                >
                                    <option value="">{isRTL ? '-- اختر متجراً --' : '-- Select a Shop --'}</option>
                                    {shops.map(shop => {
                                        const badge = getRegionBadge(shop.region_id);
                                        return (
                                            <option key={shop.id} value={shop.id}>
                                                {shop.name} {shop.region_id ? `(${badge.flag} ${badge.name})` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                    {isRTL ? 'اختر المنتج (اختياري)' : 'Select Product (Optional)'}
                                </label>
                                <SearchableProductSelect
                                    products={products}
                                    value={newCampaign.product_id}
                                    onChange={(prodId) => setNewCampaign({ ...newCampaign, product_id: prodId })}
                                    isRTL={isRTL}
                                    placeholder={isRTL ? '-- اختر منتجاً (للإعلان عن منتج معين) --' : '-- Select a Product (Optional) --'}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                    {isRTL ? 'مكان العرض *' : 'Placement Slot *'}
                                </label>
                                <select 
                                    className="form-control"
                                    style={{
                                        background: '#0f172a',
                                        border: '1px solid #334155',
                                        color: '#f8fafc',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        width: '100%'
                                    }}
                                    value={newCampaign.placement_slot}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, placement_slot: e.target.value })}
                                    required
                                >
                                    <option value="homepage_featured">{isRTL ? 'الرئيسية - مميز' : 'Homepage Featured'}</option>
                                    <option value="search_top">{isRTL ? 'البحث - في الأعلى' : 'Search Top'}</option>
                                    <option value="category_header">{isRTL ? 'ترويسة الفئة' : 'Category Header'}</option>
                                </select>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                        {isRTL ? 'تاريخ البدء' : 'Start Date'}
                                    </label>
                                    <input 
                                        type="date"
                                        className="form-control"
                                        style={{
                                            background: '#0f172a',
                                            border: '1px solid #334155',
                                            color: '#f8fafc',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            width: '100%'
                                        }}
                                        value={newCampaign.start_date}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                        {isRTL ? 'تاريخ الانتهاء *' : 'End Date *'}
                                    </label>
                                    <input 
                                        type="date"
                                        className="form-control"
                                        style={{
                                            background: '#0f172a',
                                            border: '1px solid #334155',
                                            color: '#f8fafc',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            width: '100%'
                                        }}
                                        value={newCampaign.end_date}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                                <button 
                                    type="button" 
                                    className="btn btn-outline"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ padding: '10px 24px', borderColor: '#334155', color: '#f8fafc', background: 'transparent', cursor: 'pointer' }}
                                >
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-gold"
                                    disabled={submitting}
                                    style={{ padding: '10px 24px', cursor: submitting ? 'not-allowed' : 'pointer' }}
                                >
                                    {submitting ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ الحملة' : 'Save Campaign')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Campaign Modal */}
            {isEditModalOpen && editCampaignData && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '500px',
                        padding: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#f8fafc' }}>
                                {isRTL ? 'تعديل حملة الاكتشاف' : 'Edit Discover Campaign'}
                            </h3>
                            <button 
                                onClick={() => { setIsEditModalOpen(false); setEditCampaignData(null); }} 
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={updateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                    {isRTL ? 'اختر المتجر *' : 'Select Shop *'}
                                </label>
                                <select 
                                    className="form-control"
                                    style={{
                                        background: '#0f172a',
                                        border: '1px solid #334155',
                                        color: '#f8fafc',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        width: '100%'
                                    }}
                                    value={editCampaignData.shop_id}
                                    onChange={(e) => setEditCampaignData({ ...editCampaignData, shop_id: e.target.value })}
                                    required
                                >
                                    <option value="">{isRTL ? '-- اختر متجراً --' : '-- Select a Shop --'}</option>
                                    {shops.map(shop => {
                                        const badge = getRegionBadge(shop.region_id);
                                        return (
                                            <option key={shop.id} value={shop.id}>
                                                {shop.name} {shop.region_id ? `(${badge.flag} ${badge.name})` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                    {isRTL ? 'اختر المنتج (اختياري)' : 'Select Product (Optional)'}
                                </label>
                                <SearchableProductSelect
                                    products={products}
                                    value={editCampaignData.product_id}
                                    onChange={(prodId) => setEditCampaignData({ ...editCampaignData, product_id: prodId })}
                                    isRTL={isRTL}
                                    placeholder={isRTL ? '-- اختر منتجاً --' : '-- Select a Product (Optional) --'}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                    {isRTL ? 'مكان العرض *' : 'Placement Slot *'}
                                </label>
                                <select 
                                    className="form-control"
                                    style={{
                                        background: '#0f172a',
                                        border: '1px solid #334155',
                                        color: '#f8fafc',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        width: '100%'
                                    }}
                                    value={editCampaignData.placement_slot}
                                    onChange={(e) => setEditCampaignData({ ...editCampaignData, placement_slot: e.target.value })}
                                    required
                                >
                                    <option value="homepage_featured">{isRTL ? 'الرئيسية - مميز' : 'Homepage Featured'}</option>
                                    <option value="search_top">{isRTL ? 'البحث - في الأعلى' : 'Search Top'}</option>
                                    <option value="category_header">{isRTL ? 'ترويسة الفئة' : 'Category Header'}</option>
                                </select>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                        {isRTL ? 'تاريخ البدء' : 'Start Date'}
                                    </label>
                                    <input 
                                        type="date"
                                        className="form-control"
                                        style={{
                                            background: '#0f172a',
                                            border: '1px solid #334155',
                                            color: '#f8fafc',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            width: '100%'
                                        }}
                                        value={editCampaignData.start_date}
                                        onChange={(e) => setEditCampaignData({ ...editCampaignData, start_date: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                        {isRTL ? 'تاريخ الانتهاء *' : 'End Date *'}
                                    </label>
                                    <input 
                                        type="date"
                                        className="form-control"
                                        style={{
                                            background: '#0f172a',
                                            border: '1px solid #334155',
                                            color: '#f8fafc',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            width: '100%'
                                        }}
                                        value={editCampaignData.end_date}
                                        onChange={(e) => setEditCampaignData({ ...editCampaignData, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                <input 
                                    type="checkbox"
                                    id="edit_campaign_active"
                                    checked={editCampaignData.active}
                                    onChange={(e) => setEditCampaignData({ ...editCampaignData, active: e.target.checked })}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <label htmlFor="edit_campaign_active" style={{ color: '#f8fafc', fontSize: '14px', cursor: 'pointer' }}>
                                    {isRTL ? 'حملة نشطة' : 'Active Campaign'}
                                </label>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                                <button 
                                    type="button" 
                                    className="btn btn-outline"
                                    onClick={() => { setIsEditModalOpen(false); setEditCampaignData(null); }}
                                    style={{ padding: '10px 24px', borderColor: '#334155', color: '#f8fafc', background: 'transparent', cursor: 'pointer' }}
                                >
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-gold"
                                    disabled={submitting}
                                    style={{ padding: '10px 24px', cursor: submitting ? 'not-allowed' : 'pointer' }}
                                >
                                    {submitting ? (isRTL ? 'جاري التحديث...' : 'Updating...') : (isRTL ? 'حفظ التغييرات' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Premium Custom Confirmation Modal */}
            {confirmModal.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="admin-card" style={{
                        width: '90%',
                        maxWidth: '400px',
                        padding: '24px',
                        textAlign: 'center',
                        border: '1px solid var(--color-gold)',
                        borderRadius: '16px',
                        background: '#0f172a',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{ color: '#e2e8f0', fontSize: '1.1rem', marginBottom: '24px', fontWeight: '500', lineHeight: '1.5' }}>
                            {confirmModal.message}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                className="btn btn-outline"
                                style={{
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                    color: '#fff',
                                    padding: '8px 20px',
                                    borderRadius: '8px'
                                }}
                                onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })}
                            >
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button 
                                className="btn btn-gold"
                                style={{
                                    padding: '8px 24px',
                                    borderRadius: '8px',
                                    color: '#000'
                                }}
                                onClick={() => {
                                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                                    setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                                }}
                            >
                                {isRTL ? 'موافق' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Custom Alert Modal */}
            {alertModal.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="admin-card" style={{
                        width: '90%',
                        maxWidth: '400px',
                        padding: '24px',
                        textAlign: 'center',
                        border: `1px solid ${alertModal.isError ? '#ef4444' : 'var(--color-gold)'}`,
                        borderRadius: '16px',
                        background: '#0f172a',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{ color: '#f8fafc', fontSize: '1.1rem', marginBottom: '24px', fontWeight: '500', lineHeight: '1.5' }}>
                            {alertModal.message}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button 
                                className="btn btn-gold"
                                style={{
                                    padding: '8px 30px',
                                    borderRadius: '8px',
                                    color: '#000'
                                }}
                                onClick={() => setAlertModal({ isOpen: false, message: '', isError: false })}
                            >
                                {isRTL ? 'موافق' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiscoveryManager;
