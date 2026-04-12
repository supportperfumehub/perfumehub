import React, { useState, useEffect, useContext } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import { CheckCircle, XCircle, Store, MapPin, Clock, Plus, Trash2, Image, ChevronDown, ChevronUp, Package, ShoppingCart, DollarSign, Edit, Eye, BarChart3, X } from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';

const ShopsManager = ({ isRTL }) => {
    const { products, orders } = useContext(ShopContext);
    const { user } = useContext(AuthContext);
    const [shops, setShops] = useState([]);
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expandedShop, setExpandedShop] = useState(null);
    const [expandedTab, setExpandedTab] = useState('overview');
    const [editingShop, setEditingShop] = useState(null);
    const [editData, setEditData] = useState({});
    const [formData, setFormData] = useState({
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        shopName: '',
        address: '',
        whatsapp_number: '',
        region_id: ''
    });
    const [photoInputs, setPhotoInputs] = useState(['']);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showConfirm, setShowConfirm] = useState(false);
    const [shopToDelete, setShopToDelete] = useState(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchShopsAndRegions = async () => {
        try {
            setLoading(true);
            const headers = user ? { 'x-user-id': user.id } : {};
            const [shopsRes, regionsRes] = await Promise.all([
                fetch('/api/shops', { headers }),
                fetch('/api/regions', { headers })
            ]);
            
            if (shopsRes.ok) {
                const data = await shopsRes.json();
                setShops(data);
            }
            if (regionsRes.ok) {
                const regData = await regionsRes.json();
                setRegions(regData || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchShopsAndRegions(); }, []);

    const updateShopStatus = async (id, status) => {
        try {
            const response = await fetch(`/api/shops/${id}/approve`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(user ? { 'x-user-id': user.id } : {})
                }
            });
            if (response.ok) fetchShopsAndRegions();
            else alert(isRTL ? 'فشل تحديث حالة المتجر' : 'Failed to update shop status');
        } catch (error) {
            console.error('Error updating shop status:', error);
        }
    };

    const updateShopDetails = async (id) => {
        try {
            const response = await fetch(`/api/shops/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(user ? { 'x-user-id': user.id } : {})
                },
                body: JSON.stringify(editData)
            });
            if (response.ok) {
                setEditingShop(null);
                fetchShopsAndRegions();
                alert(isRTL ? 'تم تحديث بيانات المتجر' : 'Shop details updated');
            }
        } catch (error) {
            console.error('Error updating shop:', error);
        }
    };

    const deleteShop = async (id, shopName) => {
        setShopToDelete({ id, name: shopName });
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        if (!shopToDelete) return;
        try {
            const response = await fetch(`/api/shops/${shopToDelete.id}`, { 
                method: 'DELETE',
                headers: user ? { 'x-user-id': user.id } : {}
            });
            if (response.ok) {
                fetchShopsAndRegions();
                setShowConfirm(false);
                setShopToDelete(null);
            }
            else alert(isRTL ? 'فشل حذف المتجر' : 'Failed to delete shop');
        } catch (error) {
            console.error('Error deleting shop:', error);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { bg: '#f1c40f', label: isRTL ? 'قيد المراجعة' : 'Pending' },
            active: { bg: '#2ecc71', label: isRTL ? 'نشط' : 'Active' },
            rejected: { bg: '#e74c3c', label: isRTL ? 'مرفوض' : 'Rejected' },
            suspended: { bg: '#95a5a6', label: isRTL ? 'موقوف' : 'Suspended' }
        };
        const s = styles[status] || { bg: '#999', label: status };
        return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '600', backgroundColor: s.bg, color: '#fff' }}>{s.label}</span>;
    };

    // Get shop-specific analytics
    const getShopAnalytics = (shop) => {
        const shopId = shop.id;
        const shopProducts = products.filter(p => p.shop_id === shopId);
        const shopOrders = orders.filter(o => {
            if (o.shop_ids && Array.isArray(o.shop_ids) && o.shop_ids.includes(shopId)) return true;
            if (o.items && Array.isArray(o.items)) return o.items.some(item => item.shop_id === shopId);
            return false;
        });

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 2); // Rolling 3 months including current
        threeMonthsAgo.setDate(1); // From start of 3 months ago

        const monthlySales = shopOrders
            .filter(o => {
                const d = new Date(o.created_at || o.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

        const quarterlySales = shopOrders
            .filter(o => new Date(o.created_at || o.date) >= threeMonthsAgo)
            .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

        const totalSales = shopOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
        const pendingOrders = shopOrders.filter(o => o.status?.toLowerCase() === 'pending').length;
        const deliveredOrders = shopOrders.filter(o => o.status?.toLowerCase() === 'delivered').length;

        // Activity Calculation
        const recentOrdersCount = shopOrders.filter(o => new Date(o.created_at || o.date) >= threeMonthsAgo).length;
        const lastUpdate = shop.updated_at ? new Date(shop.updated_at) : null;
        const isRecentlyInvolved = lastUpdate && (now - lastUpdate < 14 * 24 * 60 * 60 * 1000); // 14 days engagement

        let activityStatus = 'not active';
        if (recentOrdersCount >= 10 && isRecentlyInvolved) activityStatus = 'very active';
        else if (recentOrdersCount > 0 || isRecentlyInvolved) activityStatus = 'active';

        return { 
            shopProducts, shopOrders, totalSales, monthlySales, 
            quarterlySales, pendingOrders, deliveredOrders, 
            activityStatus, lastUpdate 
        };
    };

    const addPhotoInput = () => setPhotoInputs([...photoInputs, '']);
    const removePhotoInput = (index) => setPhotoInputs(photoInputs.filter((_, i) => i !== index));
    const updatePhotoInput = (index, value) => {
        const updated = [...photoInputs];
        updated[index] = value;
        setPhotoInputs(updated);
    };

    const handleAddShop = async (e) => {
        e.preventDefault();
        const images = photoInputs.filter(url => url.trim() !== '');
        try {
            const response = await fetch('/api/shops/manual', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(user ? { 'x-user-id': user.id } : {})
                },
                body: JSON.stringify({ ...formData, images, adminCreated: true })
            });
            if (response.ok) {
                setShowForm(false);
                setFormData({ ownerName: '', ownerEmail: '', ownerPassword: '', shopName: '', address: '', whatsapp_number: '', region_id: '' });
                setPhotoInputs(['']);
                fetchShopsAndRegions();
                alert(isRTL ? 'تم إنشاء المتجر بنجاح' : 'Vendor created successfully');
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to create vendor');
            }
        } catch (error) {
            console.error('Error creating vendor:', error);
        }
    };

    if (loading) return <div className="text-center p-4">Loading shops...</div>;

    const cardStyle = { background: '#1e293b', borderRadius: '12px', padding: isMobile ? '16px' : '24px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' };
    const statCardStyle = (color) => ({ 
        background: '#0f172a', 
        borderRadius: '12px', 
        padding: isMobile ? '12px' : '16px', 
        border: `1px solid ${color}44`, 
        textAlign: 'center', 
        flex: '1', 
        minWidth: isMobile ? '100px' : '120px',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
        color: '#f8fafc' // Unified light text
    });

    return (
        <div className="manager-content">
            <div className="manager-header">
                <h2>{isRTL ? 'إدارة المتاجر' : 'Shops Management'}</h2>
                <div className="manager-header-actions">
                    <button className={`btn ${showForm ? 'btn-outline' : 'btn-gold'}`} onClick={() => { setShowForm(!showForm); setPhotoInputs(['']); }} style={{ height: '44px', padding: '0 20px' }}>
                        {showForm ? <X size={18} /> : <Plus size={18} />}
                        {showForm ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'إضافة متجر جديد' : 'Add New Vendor')}
                    </button>
                </div>
            </div>

            {/* Add New Vendor Form */}
            {showForm && (
                <div style={{ ...cardStyle, marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '20px' }}>{isRTL ? 'إضافة متجر وبائع جديد' : 'Add New Vendor & Shop'}</h3>
                    <form onSubmit={handleAddShop}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '10px' : '15px', marginBottom: '15px' }}>
                            <div>
                                <label className="form-label">{isRTL ? 'اسم المالك' : 'Owner Name'}</label>
                                <input type="text" className="form-control" required value={formData.ownerName} onChange={(e) => setFormData({...formData, ownerName: e.target.value})} />
                            </div>
                            <div>
                                <label className="form-label">{isRTL ? 'البريد الإلكتروني' : 'Owner Email'}</label>
                                <input type="email" className="form-control" required value={formData.ownerEmail} onChange={(e) => setFormData({...formData, ownerEmail: e.target.value})} />
                            </div>
                            <div>
                                <label className="form-label">{isRTL ? 'كلمة المرور' : 'Password'}</label>
                                <input type="text" className="form-control" required value={formData.ownerPassword} onChange={(e) => setFormData({...formData, ownerPassword: e.target.value})} />
                            </div>
                            <div>
                                <label className="form-label">{isRTL ? 'اسم المتجر' : 'Shop Name'}</label>
                                <input type="text" className="form-control" required value={formData.shopName} onChange={(e) => setFormData({...formData, shopName: e.target.value})} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">{isRTL ? 'المنطقة' : 'Region (Optional)'}</label>
                                <select className="form-control" value={formData.region_id} onChange={(e) => setFormData({...formData, region_id: e.target.value})}>
                                    <option value="">{isRTL ? '-- لا يوجد منطقة محددة --' : '-- No Region Assigned --'}</option>
                                    {regions
                                        .filter(r => user?.role === 'super_admin' || user?.role === 'admin' || user?.assignedRegionIds?.includes(r.id))
                                        .map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)
                                    }
                                </select>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">{isRTL ? 'العنوان' : 'Shop Address'}</label>
                                <input type="text" className="form-control" required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">{isRTL ? 'رقم الواتساب (مع رمز الدولة)' : 'WhatsApp Number (with country code)'}</label>
                                <input type="text" className="form-control" placeholder="+974..." value={formData.whatsapp_number} onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})} />
                            </div>
                        </div>

                        {/* Photos */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Image size={16} /> {isRTL ? 'صور المتجر' : 'Shop Photos'}
                                </label>
                                <button type="button" onClick={addPhotoInput} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px dashed #999', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', color: '#555', fontSize: '0.85rem' }}>
                                    <Plus size={14} /> {isRTL ? 'إضافة صورة' : 'Add Photo'}
                                </button>
                            </div>
                            {photoInputs.map((url, index) => (
                                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                    {url && <img src={url} alt="preview" onError={(e) => e.target.style.display='none'} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd' }} />}
                                    <input type="url" className="form-control" placeholder={`Photo URL ${index + 1}`} value={url} onChange={(e) => updatePhotoInput(index, e.target.value)} style={{ flex: 1 }} />
                                    {photoInputs.length > 1 && (
                                        <button type="button" onClick={() => removePhotoInput(index)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#e74c3c' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="submit" className="btn btn-dark">{isRTL ? 'حفظ' : 'Save Vendor'}</button>
                    </form>
                </div>
            )}

            {/* Shops List */}
            {shops.map(shop => {
                const isExpanded = expandedShop === shop.id;
                const analytics = isExpanded ? getShopAnalytics(shop) : null;
                const isEditing = editingShop === shop.id;

                return (
                    <div key={shop.id} style={{ marginBottom: '16px', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', background: '#1e293b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        {/* Shop Row Header */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: isMobile ? '12px 15px' : '16px 20px', gap: isMobile ? '10px' : '16px', flexWrap: 'wrap', cursor: 'pointer', background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent', position: 'relative' }}
                            onClick={() => { setExpandedShop(isExpanded ? null : shop.id); setExpandedTab('overview'); setEditingShop(null); }}
                        >
                            <div style={{ width: isMobile ? '35px' : '45px', height: isMobile ? '35px' : '45px', borderRadius: '8px', background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0, border: '1px solid #334155' }}>
                                {(shop.images && shop.images.length > 0)
                                    ? <img src={shop.images[0]} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <Store size={22} color="#94a3b8" />
                                }
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#f8fafc' }}>{shop.name}</div>
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{shop.customers?.name || 'Unknown'} · {shop.customers?.email || ''}</div>
                            </div>
                            {!isMobile && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                    <MapPin size={14} /> {shop.address?.substring(0, 30)}{shop.address?.length > 30 ? '...' : ''}
                                </div>
                            )}
                            <div style={{ marginLeft: isRTL ? '0' : 'auto', marginRight: isRTL ? 'auto' : '0' }}>{getStatusBadge(shop.status)}</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {shop.status !== 'active' && (
                                    <button onClick={(e) => { e.stopPropagation(); updateShopStatus(shop.id, 'active'); }} style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        {isRTL ? 'تفعيل' : 'Approve'}
                                    </button>
                                )}
                                {shop.status === 'active' && (
                                    <button onClick={(e) => { e.stopPropagation(); updateShopStatus(shop.id, 'suspended'); }} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        {isRTL ? 'إيقاف' : 'Suspend'}
                                    </button>
                                )}
                                {shop.status === 'pending' && (
                                    <button onClick={(e) => { e.stopPropagation(); updateShopStatus(shop.id, 'rejected'); }} style={{ background: '#95a5a6', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        {isRTL ? 'رفض' : 'Reject'}
                                    </button>
                                )}
                                {isExpanded ? <ChevronUp size={18} color="#888" /> : <ChevronDown size={18} color="#888" />}
                            </div>
                        </div>

                        {/* Mobile Address Info (shown only when expanded and on mobile) */}
                        {isExpanded && isMobile && (
                            <div style={{ padding: '0 20px 10px', fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <MapPin size={12} /> {shop.address}
                            </div>
                        )}

                        {/* Expanded Detail Panel */}
                        {isExpanded && analytics && (
                            <div style={{ borderTop: '1px solid #334155', padding: isMobile ? '15px' : '20px' }}>
                                {/* Tab Navigation */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                                    {[
                                        { key: 'overview', icon: <BarChart3 size={14} />, label: isRTL ? 'نظرة عامة' : 'Overview' },
                                        { key: 'reports', icon: <BarChart3 size={14} />, label: isRTL ? 'التقارير' : 'Reports' },
                                        { key: 'products', icon: <Package size={14} />, label: isRTL ? 'المنتجات' : 'Products' },
                                        { key: 'orders', icon: <ShoppingCart size={14} />, label: isRTL ? 'الطلبات' : 'Orders' },
                                        { key: 'edit', icon: <Edit size={14} />, label: isRTL ? 'تعديل' : 'Edit Shop' }
                                    ].map(tab => (
                                        <button key={tab.key}
                                            onClick={() => { 
                                                setExpandedTab(tab.key); 
                                                if (tab.key === 'edit') { 
                                                    setEditingShop(shop.id); 
                                                    setEditData({ 
                                                        name: shop.name, 
                                                        address: shop.address, 
                                                        whatsapp_number: shop.whatsapp_number || '', 
                                                        is_recommended: shop.is_recommended || false,
                                                        region_id: shop.region_id || ''
                                                    }); 
                                                } 
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: isMobile ? '10px 12px' : '8px 14px', border: expandedTab === tab.key ? '1px solid var(--color-gold)' : '1px solid #334155', borderRadius: '8px', background: expandedTab === tab.key ? 'var(--color-gold)' : '#2d3748', color: expandedTab === tab.key ? '#000' : '#cbd5e1', cursor: 'pointer', fontSize: isMobile ? '0.75rem' : '0.82rem', fontWeight: '600', flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', minWidth: isMobile ? '110px' : 'auto' }}
                                        >
                                            {tab.icon} {tab.label}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => deleteShop(shop.id, shop.name)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: isMobile ? '10px 12px' : '8px 14px', border: '1px solid #e74c3c33', borderRadius: '8px', background: '#fff5f5', color: '#e74c3c', cursor: 'pointer', fontSize: isMobile ? '0.75rem' : '0.82rem', fontWeight: '600', flex: isMobile ? '1 1 100%' : 'none', marginTop: isMobile ? '4px' : '0', marginLeft: isMobile ? '0' : 'auto' }}
                                    >
                                        <Trash2 size={14} /> {isRTL ? 'حذف' : 'Delete'}
                                    </button>
                                </div>

                                {/* Overview Tab */}
                                {expandedTab === 'overview' && (
                                    <div>
                                        {/* Stats Cards */}
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: isMobile ? '8px' : '12px', marginBottom: '20px' }}>
                                            <div style={statCardStyle('#3498db')}>
                                                <Package size={isMobile ? 18 : 22} color="#3498db" style={{ marginBottom: '6px' }} />
                                                <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', color: '#111827' }}>{analytics.shopProducts.length}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{isRTL ? 'المنتجات' : 'Products'}</div>
                                            </div>
                                            <div style={statCardStyle('#2ecc71')}>
                                                <ShoppingCart size={isMobile ? 18 : 22} color="#2ecc71" style={{ marginBottom: '6px' }} />
                                                <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', color: '#111827' }}>{analytics.shopOrders.length}</div>
                                                <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', color: '#f8fafc' }}>{analytics.shopOrders.length}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{isRTL ? 'الطلبات' : 'Orders'}</div>
                                            </div>
                                            <div style={statCardStyle('#d4af37')}>
                                                <DollarSign size={isMobile ? 18 : 22} color="#d4af37" style={{ marginBottom: '6px' }} />
                                                <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', color: '#f8fafc' }}>{analytics.totalSales.toFixed(0)}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{isRTL ? 'المبيعات' : 'Sales'}</div>
                                            </div>
                                            <div style={statCardStyle('#f1c40f')}>
                                                <Clock size={isMobile ? 18 : 22} color="#f1c40f" style={{ marginBottom: '6px' }} />
                                                <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', color: '#f8fafc' }}>{analytics.pendingOrders}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{isRTL ? 'معلقة' : 'Pending'}</div>
                                            </div>
                                        </div>

                                        {/* Shop Info */}
                                        <div style={cardStyle}>
                                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '12px' : '15px', fontSize: '0.88rem' }}>
                                                <div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'المالك:' : 'Owner:'}</strong> <span style={{ color: '#f8fafc' }}>{shop.customers?.name || 'N/A'}</span></div>
                                                <div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'البريد:' : 'Email:'}</strong> <span style={{ color: '#f8fafc' }}>{shop.customers?.email || 'N/A'}</span></div>
                                                <div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'العنوان:' : 'Address:'}</strong> <span style={{ color: '#f8fafc' }}>{shop.address}</span></div>
                                                <div><strong style={{ color: '#94a3b8', marginRight: '5px' }}>{isRTL ? 'تاريخ الانضمام:' : 'Joined:'}</strong> <span style={{ color: '#f8fafc' }}>{new Date(shop.created_at).toLocaleDateString()}</span></div>
                                            </div>
                                            {shop.images && shop.images.length > 0 && (
                                                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {shop.images.map((img, i) => (
                                                        <img key={i} src={img} alt={`${shop.name} ${i+1}`} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155' }} onError={(e) => e.target.style.display='none'} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Reports Tab */}
                                {expandedTab === 'reports' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '15px' : '20px' }}>
                                        {/* Sales Performance Card */}
                                        <div style={cardStyle}>
                                            <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                                                <DollarSign size={18} color="var(--color-gold)" /> 
                                                {isRTL ? 'الأداء المالي' : 'Sales Performance'}
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>{isRTL ? 'مبيعات الشهر الحالي' : 'Current Month Sales'}</div>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f8fafc' }}>{analytics.monthlySales.toFixed(2)} QAR</div>
                                                </div>
                                                <div style={{ height: '1px', background: '#334155' }}></div>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>{isRTL ? 'إجمالي آخر 3 أشهر' : 'Last 3 Months Total'}</div>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f8fafc' }}>{analytics.quarterlySales.toFixed(2)} QAR</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={cardStyle}>
                                            <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                                                <CheckCircle size={18} color="#2ecc71" /> 
                                                {isRTL ? 'الحالة والمشاركة' : 'Activity & Engagement'}
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                                    <span style={{ fontSize: '0.92rem', color: '#cbd5e1', fontWeight: '600' }}>{isRTL ? 'حالة المتجر:' : 'Shop Status:'}</span>
                                                    <span style={{ 
                                                        padding: '4px 12px', 
                                                        borderRadius: '20px', 
                                                        fontSize: '0.75rem', 
                                                        fontWeight: '700', 
                                                        textTransform: 'uppercase',
                                                        backgroundColor: analytics.activityStatus === 'very active' ? '#2ecc71' : (analytics.activityStatus === 'active' ? '#3498db' : '#95a5a6'),
                                                        color: '#fff'
                                                    }}>
                                                        {isRTL ? (
                                                            analytics.activityStatus === 'very active' ? 'نشط جداً' : (analytics.activityStatus === 'active' ? 'نشط' : 'غير نشط')
                                                        ) : analytics.activityStatus}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div>
                                                        {isRTL ? 'آخر تفاعل (تعديل):' : 'Last Involvement (Update):'} 
                                                        <span style={{ fontWeight: '700', color: '#f8fafc', marginLeft: '5px' }}>
                                                            {analytics.lastUpdate ? analytics.lastUpdate.toLocaleDateString() : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid #334155' }}>
                                                        <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>{isRTL ? 'تحليل النشاط:' : 'Activity Insight:'}</strong>
                                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', lineHeight: '1.4' }}>
                                                            {analytics.activityStatus === 'very active' 
                                                                ? (isRTL ? 'أداء استثنائي وتفاعل مستمر.' : 'Exceptional performance and high engagement.')
                                                                : (analytics.activityStatus === 'active' 
                                                                    ? (isRTL ? 'نشط جيد ومنتظم.' : 'Healthy and regular activity.')
                                                                    : (isRTL ? 'يحتاج إلى مزيد من التفاعل والمنتجات.' : 'Requires more engagement and fresh products.'))}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Products Tab */}
                                {expandedTab === 'products' && (
                                    <div>
                                        {analytics.shopProducts.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                                                <Package size={40} style={{ marginBottom: '10px' }} />
                                                <div>{isRTL ? 'لا توجد منتجات بعد' : 'No products yet'}</div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                {analytics.shopProducts.map(product => (
                                                    <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#334155', borderRadius: '10px', border: '1px solid #475569' }}>
                                                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: '#0f172a', flexShrink: 0 }}>
                                                            {product.image?.[0]
                                                                ? <img src={product.image[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                : <Package size={20} color="#ccc" style={{ margin: '14px' }} />
                                                            }
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '600', fontSize: '0.92rem', color: '#f8fafc' }}>{product.name}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{product.brand} · {product.sku || 'No SKU'}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: '700', color: '#f8fafc' }}>{product.price} QAR</div>
                                                            <div style={{ fontSize: '0.78rem', color: product.stock > 0 ? '#34d399' : '#f87171' }}>
                                                                {product.stock > 0 ? `${isRTL ? 'متوفر' : 'In Stock'}: ${product.stock}` : (isRTL ? 'نفد المخزون' : 'Out of Stock')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Orders Tab */}
                                {expandedTab === 'orders' && (
                                    <div>
                                        {analytics.shopOrders.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                                                <ShoppingCart size={40} style={{ marginBottom: '10px' }} />
                                                <div>{isRTL ? 'لا توجد طلبات بعد' : 'No orders yet'}</div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                {analytics.shopOrders.map(order => (
                                                    <div key={order.id} style={{ padding: '16px 20px', background: '#334155', borderRadius: '10px', border: '1px solid #475569', marginBottom: '10px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                            <span style={{ fontWeight: '700', color: '#f8fafc' }}>{order.id}</span>
                                                            <div>
                                                                <strong>#{order.id}</strong>
                                                                <span style={{ marginLeft: '10px', fontSize: '0.82rem', color: '#888' }}>{order.date || new Date(order.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                {getStatusBadge(order.status?.toLowerCase())}
                                                                <strong>{order.total} QAR</strong>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                                            {isRTL ? 'العميل:' : 'Customer:'} {order.customerName || 'Guest'} · {order.items?.length || 0} {isRTL ? 'منتجات' : 'items'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Edit Tab */}
                                {expandedTab === 'edit' && (
                                    <div style={cardStyle}>
                                        <h4 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700' }}>{isRTL ? 'تعديل بيانات المتجر' : 'Edit Shop Details'}</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '15px' : '20px' }}>
                                            <div>
                                                <label className="form-label">{isRTL ? 'اسم المتجر' : 'Shop Name'}</label>
                                                <input type="text" className="form-control" value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'الحالة' : 'Status'}</label>
                                                <select className="form-control" value={editData.status || shop.status} onChange={(e) => setEditData({...editData, status: e.target.value})}>
                                                    <option value="active">{isRTL ? 'نشط' : 'Active'}</option>
                                                    <option value="pending">{isRTL ? 'قيد المراجعة' : 'Pending'}</option>
                                                    <option value="suspended">{isRTL ? 'موقوف' : 'Suspended'}</option>
                                                    <option value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'حالة التوصية' : 'Recommendation'}</label>
                                                <select className="form-control" value={editData.is_recommended ? 'true' : 'false'} onChange={(e) => setEditData({...editData, is_recommended: e.target.value === 'true'})}>
                                                    <option value="true">{isRTL ? 'متجر موصى به' : 'Recommended Shop'}</option>
                                                    <option value="false">{isRTL ? 'عادي' : 'Normal'}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">{isRTL ? 'رقم الواتساب' : 'WhatsApp Number'}</label>
                                                <input type="text" className="form-control" placeholder="+974..." value={editData.whatsapp_number || ''} onChange={(e) => setEditData({...editData, whatsapp_number: e.target.value})} />
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label className="form-label">{isRTL ? 'المنطقة' : 'Region'}</label>
                                                <select className="form-control" value={editData.region_id || ''} onChange={(e) => setEditData({...editData, region_id: e.target.value})}>
                                                    <option value="">{isRTL ? '-- غير محدد --' : '-- Unassigned --'}</option>
                                                    {regions.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                                                </select>
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label className="form-label">{isRTL ? 'العنوان' : 'Address'}</label>
                                                <input type="text" className="form-control" value={editData.address || ''} onChange={(e) => setEditData({...editData, address: e.target.value})} />
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                                            <button className="btn btn-gold" style={{ height: '48px', flex: 1 }} onClick={() => updateShopDetails(shop.id)}>{isRTL ? 'حفظ التغييرات' : 'SAVE CHANGES'}</button>
                                            <button className="btn btn-slate" style={{ height: '48px', flex: 1 }} onClick={() => { setEditingShop(null); setExpandedTab('overview'); }}>{isRTL ? 'إلغاء' : 'CANCEL'}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Custom Confirm Modal */}
            <ConfirmModal 
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmDelete}
                title={isRTL ? 'حذف المتجر' : 'Delete Shop'}
                message={isRTL 
                    ? `هل أنت متأكد أنك تريد حذف المتجر "${shopToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.` 
                    : `Are you sure you want to delete the shop "${shopToDelete?.name}"? This action cannot be undone.`
                }
                confirmText={isRTL ? 'حذف نهائي' : 'Delete Permanently'}
                cancelText={isRTL ? 'تراجع' : 'Cancel'}
                isRTL={isRTL}
                variant="danger"
                iconType="trash"
            />

            {shops.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                    <Store size={48} style={{ marginBottom: '10px' }} />
                    <div>{isRTL ? 'لا يوجد متاجر مسجلة' : 'No shops registered'}</div>
                </div>
            )}
        </div>
    );
};

export default ShopsManager;
