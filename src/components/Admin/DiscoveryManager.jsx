import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Sparkles, Megaphone, Plus, Trash2, Search, Filter, CheckCircle, XCircle, Store, Calendar, TrendingUp } from 'lucide-react';
import api from '../../utils/api_v1_0_2';

const DiscoveryManager = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const [shops, setShops] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter] = useState('all'); // all, featured, regular

    const fetchData = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const [shopsRes, campaignsRes] = await Promise.all([
                api.get('/admin/shops'),
                api.get('/admin/discover-campaigns')
            ]);
            
            setShops(shopsRes.data);
            setCampaigns(campaignsRes.data);
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
        } catch (err) { alert('Failed to update shop status'); }
    };

    const updateBoost = async (shopId, value) => {
        try {
            const multiplier = parseFloat(value);
            await api.patch(`/admin/shops/${shopId}/boost`, { manual_boost_multiplier: multiplier });
            setShops(prev => prev.map(s => s.id === shopId ? { ...s, manual_boost_multiplier: multiplier } : s));
        } catch (err) { alert('Failed to update boost'); }
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
                    <button className="btn btn-outline" onClick={fetchData}>
                        {isRTL ? 'تحديث' : 'Refresh'}
                    </button>
                    <button className="btn btn-primary">
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
                                <td>{camp.shop_name}</td>
                                <td><span className="status-badge" style={{ background: '#334155' }}>{camp.placement_slot}</span></td>
                                <td>{new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}</td>
                                <td>{camp.active ? <span style={{ color: '#34d399' }}>Active</span> : <span>Ended</span>}</td>
                                <td><button className="admin-action-btn delete-btn"><Trash2 size={16} /></button></td>
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
        </div>
    );
};

export default DiscoveryManager;
