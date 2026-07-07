import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Sparkles, Megaphone, Plus, Trash2, Search, Filter, CheckCircle, XCircle, Store, Calendar, TrendingUp } from 'lucide-react';
import api from '../../utils/api_v1_0_2';

const DiscoveryManager = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const [shops, setShops] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter] = useState('all'); // all, featured, regular

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        shop_id: '',
        placement_slot: 'homepage_featured',
        start_date: '',
        end_date: '',
        product_id: null
    });
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

    const deleteCampaign = async (id) => {
        setConfirmModal({
            isOpen: true,
            message: isRTL ? 'هل أنت متأكد من حذف هذه الحملة؟' : 'Are you sure you want to delete this campaign?',
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/discover-campaigns/${id}`);
                    setCampaigns(prev => prev.filter(c => c.id !== id));
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
            await api.post('/admin/discover-campaigns', newCampaign);
            setIsModalOpen(false);
            setNewCampaign({
                shop_id: '',
                placement_slot: 'homepage_featured',
                start_date: '',
                end_date: '',
                product_id: null
            });
            fetchData();
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

    const fetchData = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const [shopsRes, campaignsRes, productsRes] = await Promise.all([
                api.get('/admin/shops'),
                api.get('/admin/discover-campaigns'),
                api.get('/products')
            ]);
            
            setShops(shopsRes.data);
            setCampaigns(campaignsRes.data);
            setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
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

    const toggleFeatured = async (shopId, currentStatus) => {
        if (!user?.id) return;
        try {
            await api.patch(`/admin/shops/${shopId}/feature`, { is_featured: !currentStatus });
            setShops(prev => prev.map(s => s.id === shopId ? { ...s, is_featured: !currentStatus } : s));
        } catch (err) { 
            setAlertModal({ isOpen: true, message: 'Failed to update shop status', isError: true });
        }
    };

    const updateBoost = async (shopId, value) => {
        try {
            const multiplier = parseFloat(value);
            await api.patch(`/admin/shops/${shopId}/boost`, { manual_boost_multiplier: multiplier });
            setShops(prev => prev.map(s => s.id === shopId ? { ...s, manual_boost_multiplier: multiplier } : s));
        } catch (err) { 
            setAlertModal({ isOpen: true, message: 'Failed to update boost', isError: true });
        }
    };

    const filteredShops = shops.filter(s => {
        if (filter === 'featured' && !s.is_featured) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return s.name.toLowerCase().includes(q) || s.id.includes(q);
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
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        className="btn btn-outline" 
                        onClick={fetchData}
                        style={{ 
                            borderColor: 'rgba(255, 255, 255, 0.3)', 
                            color: '#ffffff',
                            background: 'transparent',
                            transition: 'all 0.2s ease',
                            padding: '8px 16px',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#c8a951';
                            e.currentTarget.style.color = '#c8a951';
                            e.currentTarget.style.background = 'rgba(200, 169, 81, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        {isRTL ? 'تحديث' : 'Refresh'}
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} /> {isRTL ? 'حملة جديدة' : 'New Campaign'}
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="admin-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ color: '#c8a951', marginBottom: '8px' }}><Sparkles size={24} /></div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>{shops.filter(s => s.is_featured).length}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isRTL ? 'المتاجر المميزة' : 'Featured Shops'}</div>
                </div>
                <div className="admin-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ color: '#34d399', marginBottom: '8px' }}><Megaphone size={24} /></div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>{campaigns.filter(c => c.active).length}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isRTL ? 'الحملات النشطة' : 'Active Campaigns'}</div>
                </div>
            </div>

            {/* Campaign Table (Coming soon placeholder in design) */}
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', color: '#f8fafc' }}>
                <Megaphone size={18} style={{ marginRight: '8px' }} />
                {isRTL ? 'الحملات الإعلانية' : 'Active Campaigns'}
            </h3>
            <div className="admin-table-container" style={{ marginBottom: '40px' }}>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{isRTL ? 'المتجر' : 'Shop'}</th>
                            <th>{isRTL ? 'المركز' : 'Placement'}</th>
                            <th>{isRTL ? 'الفترة' : 'Duration'}</th>
                            <th>{isRTL ? 'الحالة' : 'Status'}</th>
                            <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>{isRTL ? 'لا توجد حملات نشطة حالياً' : 'No active campaigns found'}</td></tr>
                        ) : campaigns.map(camp => (
                            <tr key={camp.id}>
                                <td>
                                    <div>{camp.shop_name}</div>
                                    {camp.product_name && (
                                        <div style={{ fontSize: '0.75rem', color: '#c8a951', marginTop: '2px' }}>
                                            📢 {isRTL ? `منتج: ${camp.product_name}` : `Product: ${camp.product_name}`}
                                        </div>
                                    )}
                                </td>
                                <td><span className="status-badge" style={{ background: '#334155' }}>{camp.placement_slot}</span></td>
                                <td>{new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}</td>
                                <td>{camp.active ? <span style={{ color: '#34d399' }}>Active</span> : <span>Ended</span>}</td>
                                <td><button className="admin-action-btn delete-btn" onClick={() => deleteCampaign(camp.id)}><Trash2 size={16} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Featured Shop Toggle List */}
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', color: '#f8fafc' }}>
                <Store size={18} style={{ marginRight: '8px' }} />
                {isRTL ? 'تحرير المتاجر المميزة' : 'Feature Shops & Boosts'}
            </h3>
            
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
                            <th>{isRTL ? 'الحالة المميزة' : 'Featured Status'}</th>
                            <th>{isRTL ? 'مضاعف التعزيز' : 'Manual Boost'}</th>
                            <th>{isRTL ? 'التقييم' : 'Current Rating'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredShops.map(shop => (
                            <tr key={shop.id}>
                                <td>
                                    <div style={{ fontWeight: '600' }}>{shop.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{shop.id}</div>
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
                                            step="0.1" min="0.1" max="5.0"
                                            className="form-control" 
                                            style={{ width: '80px', height: '36px', fontSize: '0.9rem' }}
                                            value={shop.manual_boost_multiplier}
                                            onChange={(e) => updateBoost(shop.id, e.target.value)}
                                        />
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>x</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontWeight: '700' }}>
                                        {shop.rating_avg} <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '400' }}>({shop.review_count})</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
                                    {shops.map(shop => (
                                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>
                                    {isRTL ? 'اختر المنتج (اختياري)' : 'Select Product (Optional)'}
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
                                    value={newCampaign.product_id || ''}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, product_id: e.target.value ? Number(e.target.value) : null })}
                                >
                                    <option value="">{isRTL ? '-- اختر منتجاً (للإعلان عن منتج معين) --' : '-- Select a Product (to advertise specific item) --'}</option>
                                    {products.map(prod => (
                                        <option key={prod.id} value={prod.id}>{prod.name} ({prod.brand})</option>
                                    ))}
                                </select>
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
                                    style={{ padding: '10px 20px', borderColor: '#334155', color: '#94a3b8', cursor: 'pointer' }}
                                >
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary"
                                    disabled={submitting}
                                    style={{ padding: '10px 20px', cursor: submitting ? 'not-allowed' : 'pointer' }}
                                >
                                    {submitting ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ الحملة' : 'Save Campaign')}
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
                                className="btn btn-primary"
                                style={{
                                    padding: '8px 24px',
                                    borderRadius: '8px'
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
                                className="btn btn-primary"
                                style={{
                                    padding: '8px 30px',
                                    borderRadius: '8px'
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
