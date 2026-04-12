import React, { useState, useContext } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ProductManager from '../../components/Admin/ProductManager';
import OrderManager from '../../components/Admin/OrderManager';
import { Store, Package, Target, Settings, Save } from 'lucide-react';
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
            fetch('/api/shops?status=active')
                .then(res => res.json())
                .then(data => {
                    const myShop = data.find(s => s.id === shopId);
                    if (myShop) setShopData(myShop);
                })
                .catch(err => console.error("Error fetching shop data:", err));
        }
    }, [shopId, activeTab, shopData]);

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
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                whatsapp_number: shopData.whatsapp_number,
                                                address: shopData.address
                                            })
                                        });
                                        if (res.ok) alert(isRTL ? 'تم الحفظ بنجاح' : 'Settings saved successfully');
                                        else alert(isRTL ? 'حدث خطأ' : 'Error saving settings');
                                    } catch (e) {
                                        console.error(e);
                                    } finally {
                                        setSavingSettings(false);
                                    }
                                }}>
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

