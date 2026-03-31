import React, { useState, useEffect, useContext } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { CheckCircle, XCircle, Store, MapPin, Clock, Plus, Trash2, Image, ChevronDown, ChevronUp, Package, ShoppingCart, DollarSign, Edit, Eye, BarChart3 } from 'lucide-react';

const ShopsManager = ({ isRTL }) => {
    const { products, orders } = useContext(ShopContext);
    const [shops, setShops] = useState([]);
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
        address: ''
    });
    const [photoInputs, setPhotoInputs] = useState(['']);

    const fetchShops = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/shops');
            if (response.ok) {
                const data = await response.json();
                setShops(data);
            }
        } catch (error) {
            console.error('Error fetching shops:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchShops(); }, []);

    const updateShopStatus = async (id, status) => {
        try {
            const response = await fetch(`/api/shops/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (response.ok) fetchShops();
            else alert(isRTL ? 'فشل تحديث حالة المتجر' : 'Failed to update shop status');
        } catch (error) {
            console.error('Error updating shop status:', error);
        }
    };

    const updateShopDetails = async (id) => {
        try {
            const response = await fetch(`/api/shops/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData)
            });
            if (response.ok) {
                setEditingShop(null);
                fetchShops();
                alert(isRTL ? 'تم تحديث بيانات المتجر' : 'Shop details updated');
            }
        } catch (error) {
            console.error('Error updating shop:', error);
        }
    };

    const deleteShop = async (id, shopName) => {
        if (!window.confirm(isRTL ? `هل تريد حذف المتجر "${shopName}"؟` : `Delete shop "${shopName}"? This cannot be undone.`)) return;
        try {
            const response = await fetch(`/api/shops/${id}`, { method: 'DELETE' });
            if (response.ok) fetchShops();
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
    const getShopAnalytics = (shopId) => {
        const shopProducts = products.filter(p => p.shop_id === shopId);
        const shopOrders = orders.filter(o => {
            if (o.shop_ids && Array.isArray(o.shop_ids) && o.shop_ids.includes(shopId)) return true;
            if (o.items && Array.isArray(o.items)) return o.items.some(item => item.shop_id === shopId);
            return false;
        });
        const totalSales = shopOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
        const pendingOrders = shopOrders.filter(o => o.status?.toLowerCase() === 'pending').length;
        const deliveredOrders = shopOrders.filter(o => o.status?.toLowerCase() === 'delivered').length;

        return { shopProducts, shopOrders, totalSales, pendingOrders, deliveredOrders };
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, images, adminCreated: true })
            });
            if (response.ok) {
                setShowForm(false);
                setFormData({ ownerName: '', ownerEmail: '', ownerPassword: '', shopName: '', address: '' });
                setPhotoInputs(['']);
                fetchShops();
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

    const cardStyle = { background: '#f8f9fa', borderRadius: '10px', padding: '16px', border: '1px solid #eee' };
    const statCardStyle = (color) => ({ background: '#fff', borderRadius: '10px', padding: '16px', border: `1px solid ${color}22`, textAlign: 'center', flex: '1', minWidth: '120px' });

    return (
        <div className="manager-content">
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{isRTL ? 'إدارة المتاجر (Vendors)' : 'Shops Management (Vendors)'}</h2>
                <button className="btn btn-gold" onClick={() => { setShowForm(!showForm); setPhotoInputs(['']); }}>
                    {showForm ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'إضافة متجر جديد' : 'Add New Vendor')}
                </button>
            </div>

            {/* Add New Vendor Form */}
            {showForm && (
                <div style={{ ...cardStyle, marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '20px' }}>{isRTL ? 'إضافة متجر وبائع جديد' : 'Add New Vendor & Shop'}</h3>
                    <form onSubmit={handleAddShop}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
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
                                <label className="form-label">{isRTL ? 'العنوان' : 'Shop Address'}</label>
                                <input type="text" className="form-control" required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
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
                const analytics = isExpanded ? getShopAnalytics(shop.id) : null;
                const isEditing = editingShop === shop.id;

                return (
                    <div key={shop.id} style={{ marginBottom: '16px', border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                        {/* Shop Row Header */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '16px', flexWrap: 'wrap', cursor: 'pointer', background: isExpanded ? '#fafafa' : 'transparent' }}
                            onClick={() => { setExpandedShop(isExpanded ? null : shop.id); setExpandedTab('overview'); setEditingShop(null); }}
                        >
                            <div style={{ width: '45px', height: '45px', borderRadius: '8px', background: '#eee', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                {(shop.images && shop.images.length > 0)
                                    ? <img src={shop.images[0]} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <Store size={22} color="#999" />
                                }
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <div style={{ fontWeight: '700', fontSize: '1rem' }}>{shop.name}</div>
                                <div style={{ fontSize: '0.82rem', color: '#888' }}>{shop.customers?.name || 'Unknown'} · {shop.customers?.email || ''}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '0.85rem' }}>
                                <MapPin size={14} /> {shop.address?.substring(0, 30)}{shop.address?.length > 30 ? '...' : ''}
                            </div>
                            <div>{getStatusBadge(shop.status)}</div>
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

                        {/* Expanded Detail Panel */}
                        {isExpanded && analytics && (
                            <div style={{ borderTop: '1px solid #eee', padding: '20px' }}>
                                {/* Tab Navigation */}
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                    {[
                                        { key: 'overview', icon: <BarChart3 size={14} />, label: isRTL ? 'نظرة عامة' : 'Overview' },
                                        { key: 'products', icon: <Package size={14} />, label: isRTL ? 'المنتجات' : 'Products' },
                                        { key: 'orders', icon: <ShoppingCart size={14} />, label: isRTL ? 'الطلبات' : 'Orders' },
                                        { key: 'edit', icon: <Edit size={14} />, label: isRTL ? 'تعديل' : 'Edit Shop' }
                                    ].map(tab => (
                                        <button key={tab.key}
                                            onClick={() => { setExpandedTab(tab.key); if (tab.key === 'edit') { setEditingShop(shop.id); setEditData({ name: shop.name, address: shop.address }); } }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', border: expandedTab === tab.key ? '1px solid var(--color-gold)' : '1px solid #ddd', borderRadius: '8px', background: expandedTab === tab.key ? 'var(--color-gold)' : '#fff', color: expandedTab === tab.key ? '#000' : '#555', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
                                        >
                                            {tab.icon} {tab.label}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => deleteShop(shop.id, shop.name)}
                                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', border: '1px solid #e74c3c33', borderRadius: '8px', background: '#fff5f5', color: '#e74c3c', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
                                    >
                                        <Trash2 size={14} /> {isRTL ? 'حذف' : 'Delete'}
                                    </button>
                                </div>

                                {/* Overview Tab */}
                                {expandedTab === 'overview' && (
                                    <div>
                                        {/* Stats Cards */}
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                            <div style={statCardStyle('#3498db')}>
                                                <Package size={22} color="#3498db" style={{ marginBottom: '6px' }} />
                                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#333' }}>{analytics.shopProducts.length}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#888' }}>{isRTL ? 'المنتجات' : 'Products'}</div>
                                            </div>
                                            <div style={statCardStyle('#2ecc71')}>
                                                <ShoppingCart size={22} color="#2ecc71" style={{ marginBottom: '6px' }} />
                                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#333' }}>{analytics.shopOrders.length}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#888' }}>{isRTL ? 'الطلبات' : 'Orders'}</div>
                                            </div>
                                            <div style={statCardStyle('#d4af37')}>
                                                <DollarSign size={22} color="#d4af37" style={{ marginBottom: '6px' }} />
                                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#333' }}>{analytics.totalSales.toFixed(0)}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#888' }}>{isRTL ? 'إجمالي المبيعات (ر.ق)' : 'Total Sales (QAR)'}</div>
                                            </div>
                                            <div style={statCardStyle('#f39c12')}>
                                                <Clock size={22} color="#f39c12" style={{ marginBottom: '6px' }} />
                                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#333' }}>{analytics.pendingOrders}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#888' }}>{isRTL ? 'طلبات معلقة' : 'Pending Orders'}</div>
                                            </div>
                                        </div>

                                        {/* Shop Info */}
                                        <div style={cardStyle}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                                                <div><strong>{isRTL ? 'المالك:' : 'Owner:'}</strong> {shop.customers?.name || 'N/A'}</div>
                                                <div><strong>{isRTL ? 'البريد:' : 'Email:'}</strong> {shop.customers?.email || 'N/A'}</div>
                                                <div><strong>{isRTL ? 'العنوان:' : 'Address:'}</strong> {shop.address}</div>
                                                <div><strong>{isRTL ? 'تاريخ الانضمام:' : 'Joined:'}</strong> {new Date(shop.created_at).toLocaleDateString()}</div>
                                            </div>
                                            {shop.images && shop.images.length > 0 && (
                                                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {shop.images.map((img, i) => (
                                                        <img key={i} src={img} alt={`${shop.name} ${i+1}`} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }} onError={(e) => e.target.style.display='none'} />
                                                    ))}
                                                </div>
                                            )}
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
                                                    <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                                                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: '#eee', flexShrink: 0 }}>
                                                            {product.images?.[0]
                                                                ? <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                : <Package size={20} color="#ccc" style={{ margin: '14px' }} />
                                                            }
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>{product.name}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#888' }}>{product.brand} · {product.sku || 'No SKU'}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: '700', color: '#333' }}>{product.price} QAR</div>
                                                            <div style={{ fontSize: '0.78rem', color: product.stock > 0 ? '#2ecc71' : '#e74c3c' }}>
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
                                                    <div key={order.id} style={{ padding: '14px 16px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
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
                                        <h4 style={{ marginBottom: '16px' }}>{isRTL ? 'تعديل بيانات المتجر' : 'Edit Shop Details'}</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label className="form-label">{isRTL ? 'العنوان' : 'Address'}</label>
                                                <input type="text" className="form-control" value={editData.address || ''} onChange={(e) => setEditData({...editData, address: e.target.value})} />
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                                            <button className="btn btn-gold" onClick={() => updateShopDetails(shop.id)}>{isRTL ? 'حفظ التغييرات' : 'Save Changes'}</button>
                                            <button className="btn btn-outline" onClick={() => { setEditingShop(null); setExpandedTab('overview'); }}>{isRTL ? 'إلغاء' : 'Cancel'}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

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
