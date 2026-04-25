import React, { useState, useContext } from 'react';
import { useOutletContext, Navigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ProductManager from '../../components/Admin/ProductManager';
import OrderManager from '../../components/Admin/OrderManager';
import ReservationManager from '../../components/Admin/ReservationManager';
import { Store, Package, Target, Settings, Save, Plus, X, Image as ImageIcon, Home, CalendarCheck } from 'lucide-react';
import '../Admin/Admin.css'; // Use the premium admin styles

const VendorPanel = () => {
    const { isRTL } = useOutletContext();
    const { user, isVendor } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('products');
    const [shopData, setShopData] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);

    // If somehow landed here without vendor role
    if (!isVendor && user?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    const shopId = user?.shop_id;

    React.useEffect(() => {
        if (shopId && activeTab === 'settings' && !shopData) {
            fetch('/api/shops', {
                headers: user ? { 'x-user-id': user.id } : {}
            })
                .then(res => res.json())
                .then(data => {
                    const shopsList = Array.isArray(data) ? data : (data.shops || []);
                    const myShop = shopsList.find(s => s.id === shopId);
                    setShopData(myShop || {});
                })
                .catch(err => {
                    console.error("Error fetching shop data:", err);
                    setShopData({});
                });
        }
    }, [shopId, activeTab, shopData]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    
                    const currentImages = Array.isArray(shopData.images) ? shopData.images : [];
                    setShopData({
                        ...shopData,
                        images: [...currentImages, compressedBase64]
                    });
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (index) => {
        const updatedImages = [...shopData.images];
        updatedImages.splice(index, 1);
        setShopData({ ...shopData, images: updatedImages });
    };

    if (!shopId) {
        return (
            <div className="container section text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Store size={64} color="#c8a951" style={{ marginBottom: '20px' }} />
                <h2 style={{ color: '#fff' }}>{isRTL ? 'إعداد متجرك قيد المعالجة' : 'Your Shop is Pending Setup'}</h2>
                <p style={{ color: '#94a3b8' }}>{isRTL ? 'تواصل مع الإدارة لتفعيل متجرك' : 'Contact admin to activate your shop.'}</p>
            </div>
        );
    }

    const tabs = [
        { id: 'products', label: isRTL ? 'منتجاتي' : 'My Products', icon: <Package size={20} /> },
        { id: 'orders', label: isRTL ? 'طلبات المتجر' : 'Shop Orders', icon: <Target size={20} /> },
        { id: 'reservations', label: isRTL ? 'الحجوزات' : 'Reservations', icon: <CalendarCheck size={20} /> },
        { id: 'settings', label: isRTL ? 'إعدادات المتجر' : 'Shop Settings', icon: <Settings size={20} /> }
    ];

    return (
        <div className={`admin-dashboard ${isRTL ? 'rtl' : 'ltr'}`}>
            {/* Sidebar Navigation */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <h2>{isRTL ? 'لوحة البائع' : 'Vendor Panel'}</h2>
                    <span className="role-badge">
                        {isRTL ? 'بائع معتمد' : 'Vendor'}
                    </span>
                </div>
                
                <nav className="sidebar-nav">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="nav-icon">{tab.icon}</span>
                            <span className="nav-label">{tab.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <Link to="/" className="nav-item" style={{ textDecoration: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }}>
                        <Home size={20} />
                        <span>{isRTL ? 'العودة للرئيسية' : 'Back to Home'}</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="admin-main">
                <header className="main-header">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h1>{tabs.find(t => t.id === activeTab)?.label}</h1>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
                            {isRTL
                                ? `مرحباً بك في متجرك، ${user?.name}`
                                : `Welcome to your shop, ${user?.name}`}
                        </p>
                    </div>
                </header>

                <div className="main-content-wrapper">
                    {activeTab === 'products' && <ProductManager isRTL={isRTL} shopId={shopId} />}
                    {activeTab === 'orders' && <OrderManager isRTL={isRTL} shopId={shopId} />}
                    {activeTab === 'reservations' && <ReservationManager isRTL={isRTL} shopId={shopId} />}
                    {activeTab === 'settings' && (
                        <div className="admin-section">
                            <div className="manager-header">
                                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Settings size={24} color="#c8a951" /> 
                                    {isRTL ? 'إعدادات متجرك' : 'Your Shop Settings'}
                                </h2>
                            </div>
                            
                            {shopData ? (
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    setSavingSettings(true);
                                    try {
                                        const res = await fetch(`/api/shops/${shopId}`, {
                                            method: 'PUT',
                                            headers: { 
                                                'Content-Type': 'application/json',
                                                ...(user ? { 'x-user-id': user.id } : {})
                                            },
                                            body: JSON.stringify({
                                                name: shopData.name,
                                                logo_url: shopData.logo_url,
                                                whatsapp_number: shopData.whatsapp_number,
                                                address: shopData.address,
                                                images: shopData.images
                                            })
                                        });
                                        if (res.ok) alert(isRTL ? 'تم الحفظ بنجاح' : 'Settings saved successfully');
                                        else {
                                            const data = await res.json();
                                            alert(`${isRTL ? 'فشل الحفظ' : 'Failed to save'}: ${data.error || data.message || 'Unknown error'}`);
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        alert(isRTL ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
                                    } finally {
                                        setSavingSettings(false);
                                    }
                                }}>
                                    <div className="form-group" style={{ marginBottom: '24px' }}>
                                        <label className="form-label">{isRTL ? 'اسم المتجر' : 'Shop Name'}</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={shopData.name || ''} 
                                            onChange={(e) => setShopData({...shopData, name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '24px' }}>
                                        <label className="form-label">{isRTL ? 'رابط الشعار (Logo URL)' : 'Logo URL'}</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="https://..."
                                            value={shopData.logo_url || ''} 
                                            onChange={(e) => setShopData({...shopData, logo_url: e.target.value})}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '24px' }}>
                                        <label className="form-label">{isRTL ? 'رقم الواتساب (لتلقي الطلبات)' : 'WhatsApp Number (For Orders)'}</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="+974..."
                                            value={shopData.whatsapp_number || ''} 
                                            onChange={(e) => setShopData({...shopData, whatsapp_number: e.target.value})}
                                        />
                                        <small style={{ color: '#64748b', display: 'block', marginTop: '6px' }}>
                                            {isRTL ? 'الرقم الذي سيتم توجيه العملاء إليه للحجز' : 'The number customers will be redirected to for reservations'}
                                        </small>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '32px' }}>
                                        <label className="form-label">{isRTL ? 'عنوان المتجر' : 'Shop Address'}</label>
                                        <textarea 
                                            className="form-control" 
                                            rows="4"
                                            value={shopData.address || ''} 
                                            onChange={(e) => setShopData({...shopData, address: e.target.value})}
                                        />
                                    </div>

                                    {/* Shop Photos */}
                                    <div className="form-group" style={{ marginBottom: '32px' }}>
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <ImageIcon size={18} /> {isRTL ? 'صور المتجر' : 'Shop Photos'}
                                        </label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px', marginTop: '12px' }}>
                                            {(shopData.images || []).map((img, idx) => (
                                                <div key={idx} style={{ position: 'relative', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
                                                    <img src={img} alt={`Shop ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeImage(idx)} 
                                                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(231, 76, 60, 0.9)', color: '#fff', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            <div 
                                                onClick={() => document.getElementById('vendor-photo-upload').click()}
                                                style={{ height: '120px', borderRadius: '12px', border: '2px dashed #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s ease' }}
                                                onMouseOver={(e) => e.currentTarget.style.borderColor = '#c8a951'}
                                                onMouseOut={(e) => e.currentTarget.style.borderColor = '#334155'}
                                            >
                                                <Plus size={28} />
                                                <span style={{ fontSize: '0.8rem', marginTop: '8px', fontWeight: '500' }}>{isRTL ? 'إضافة صورة' : 'Add Photo'}</span>
                                                <input type="file" id="vendor-photo-upload" hidden accept="image/*" onChange={handleImageUpload} />
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-gold" disabled={savingSettings}>
                                        <Save size={18} />
                                        {savingSettings ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التغييرات' : 'Save Changes')}
                                    </button>
                                </form>
                            ) : (
                                <p style={{ color: '#94a3b8' }}>{isRTL ? 'جاري تحميل البيانات...' : 'Loading...'}</p>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default VendorPanel;

