import React, { useState, useContext } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ProductManager from '../../components/Admin/ProductManager';
import OrderManager from '../../components/Admin/OrderManager';
import { Store, Package, Target, Settings, Save } from 'lucide-react';

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
                <Store size={64} color="#ccc" style={{ marginBottom: '20px' }} />
                <h2>{isRTL ? 'إعداد متجرك قيد المعالجة' : 'Your Shop is Pending Setup'}</h2>
                <p>{isRTL ? 'تواصل مع الإدارة لتفعيل متجرك' : 'Contact admin to activate your shop.'}</p>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-header text-center">
                <div className="container">
                    <h1>{isRTL ? 'لوحة تحكم البائع' : 'Vendor Dashboard'}</h1>
                    <p className="admin-subtitle">
                        {isRTL
                            ? `مرحباً بك في متجرك، ${user.name}`
                            : `Welcome to your shop, ${user.name}`}
                    </p>
                </div>
            </div>

            <div className="container section admin-container">
                <div className="admin-sidebar text-center" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
                    <button
                        className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
                        onClick={() => setActiveTab('products')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Package size={16} />
                        {isRTL ? 'منتجاتي' : 'My Products'}
                    </button>
                    <button
                        className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                        onClick={() => setActiveTab('orders')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Target size={16} />
                        {isRTL ? 'طلبات المتجر' : 'Shop Orders'}
                    </button>
                    <button
                        className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Settings size={16} />
                        {isRTL ? 'إعدادات المتجر' : 'Shop Settings'}
                    </button>
                </div>

                <div className="admin-content">
                    {activeTab === 'products' && <ProductManager isRTL={isRTL} shopId={shopId} />}
                    {activeTab === 'orders' && <OrderManager isRTL={isRTL} shopId={shopId} />}
                    {activeTab === 'settings' && (
                        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #eee' }}>
                            <h3 style={{ marginBottom: '20px' }}><Settings size={20} style={{ verticalAlign: 'text-bottom', marginRight: '8px' }}/> {isRTL ? 'إعدادات متجرك' : 'Your Shop Settings'}</h3>
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
                                    <div style={{ marginBottom: '15px' }}>
                                        <label className="form-label">{isRTL ? 'رقم الواتساب (لتلقي الطلبات)' : 'WhatsApp Number (For Orders)'}</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="+974..."
                                            value={shopData.whatsapp_number || ''} 
                                            onChange={(e) => setShopData({...shopData, whatsapp_number: e.target.value})}
                                        />
                                        <small style={{ color: '#888' }}>{isRTL ? 'الرقم الذي سيتم توجيه العملاء إليه للحجز' : 'The number customers will be redirected to for reservations'}</small>
                                    </div>
                                    <div style={{ marginBottom: '25px' }}>
                                        <label className="form-label">{isRTL ? 'عنوان المتجر' : 'Shop Address'}</label>
                                        <textarea 
                                            className="form-control" 
                                            value={shopData.address || ''} 
                                            onChange={(e) => setShopData({...shopData, address: e.target.value})}
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-gold" disabled={savingSettings}>
                                        <Save size={16} style={{ display: 'inline', marginRight: '6px' }}/>
                                        {savingSettings ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التغييرات' : 'Save Changes')}
                                    </button>
                                </form>
                            ) : (
                                <p>{isRTL ? 'جاري تحميل البيانات...' : 'Loading...'}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VendorPanel;
