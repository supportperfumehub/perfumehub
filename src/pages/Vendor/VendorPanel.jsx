import React, { useState, useContext, useEffect } from 'react';
import { useOutletContext, Navigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ShopContext } from '../../context/ShopContext';
import ProductManager from '../../components/Admin/ProductManager';
import OrderManager from '../../components/Admin/OrderManager';
import ReservationManager from '../../components/Admin/ReservationManager';
import ConfirmModal from '../../components/Common/ConfirmModal';
import '../Admin/Admin.css'; // Use the premium admin styles
import { Store, Package as PackageIcon, Target, Settings, Save, Plus, X, Image as ImageIcon, Home, CalendarCheck, CreditCard, CheckCircle, Zap, ShieldCheck } from 'lucide-react';
import api from '../../utils/api_v1_0_2';

const VendorPanel = () => {
    const { isRTL } = useOutletContext();
    const { user, isVendor } = useContext(AuthContext);
    const { showToast } = useContext(ShopContext);
    const shopId = user?.shop_id;
    const [activeTab, setActiveTab] = useState(shopId ? 'products' : 'billing');
    const [shopData, setShopData] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (!shopId) {
            setActiveTab('billing');
        }
    }, [shopId]);

    // Billing & Subscriptions state
    const [mySubscription, setMySubscription] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [loadingBilling, setLoadingBilling] = useState(false);
    const [subConfirmModal, setSubConfirmModal] = useState({
        isOpen: false,
        plan: null
    });
    const [cancelConfirmModal, setCancelConfirmModal] = useState(false);

    const fetchBillingData = async () => {
        if (!user?.id) return;
        try {
            setLoadingBilling(true);
            const [subRes, plansRes] = await Promise.all([
                api.get('/subscriptions/my-subscription'),
                api.get('/subscriptions/plans')
            ]);
            setMySubscription(subRes.data && subRes.data.id ? subRes.data : null);
            setAvailablePlans(plansRes.data || []);
        } catch (error) {
            console.error("Error fetching billing data:", error);
        } finally {
            setLoadingBilling(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'billing') {
            fetchBillingData();
        }
    }, [activeTab, user?.id]);

    const handleSubscribe = async () => {
        const plan = subConfirmModal.plan;
        if (!plan) return;
        try {
            const res = await api.post('/subscriptions/subscribe', { planId: plan.id });
            if (res.status === 201 || res.data.id) {
                showToast(isRTL ? 'تم الاشتراك بنجاح!' : 'Subscribed successfully!', 'success');
                setSubConfirmModal({ isOpen: false, plan: null });
                fetchBillingData();
            }
        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.error || (isRTL ? 'فشل الاشتراك' : 'Subscription failed'), 'error');
        }
    };

    const handleCancelSubscription = async () => {
        try {
            const res = await api.post('/subscriptions/cancel');
            if (res.status === 200 || res.data.message) {
                showToast(isRTL ? 'تم إلغاء الاشتراك بنجاح' : 'Subscription canceled successfully', 'success');
                setCancelConfirmModal(false);
                fetchBillingData();
            }
        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.error || (isRTL ? 'فشل إلغاء الاشتراك' : 'Failed to cancel subscription'), 'error');
        }
    };

    useEffect(() => {
        if (shopId && activeTab === 'settings' && !shopData) {
            api.get('/shops')
                .then(response => {
                    const data = response.data;
                    const shopsList = Array.isArray(data) ? data : (data.shops || []);
                    // Find THIS user's shop by owner_id or ID
                    const myShop = shopsList.find(s => s.owner_id === user?.id || s.id === shopId);
                    setShopData(myShop || {});
                })
                .catch(err => {
                    console.error("Error fetching shop data:", err);
                    setShopData({});
                });
        }
    }, [shopId, activeTab, shopData, user]);

    // If somehow landed here without vendor/admin/regional_admin role (moved after hooks to prevent rules of hooks violation)
    if (!isVendor && user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'regional_admin') {
        return <Navigate to="/" replace />;
    }

    const handleImageUpload = (e) => {
        try {
            const fileInput = e.target;
            const file = fileInput.files[0];
            if (file) {
                const objectUrl = URL.createObjectURL(file);
                const img = new window.Image();
                
                if (!window._activeImageRefs) {
                    window._activeImageRefs = new Set();
                }
                window._activeImageRefs.add(img);

                img.onload = () => {
                    try {
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
                        
                        fileInput.value = ''; // Reset input to allow uploading same image
                        URL.revokeObjectURL(objectUrl);
                        window._activeImageRefs.delete(img);
                    } catch (loadErr) {
                        alert("Error during image load processing: " + loadErr.message);
                        fileInput.value = '';
                        URL.revokeObjectURL(objectUrl);
                        window._activeImageRefs.delete(img);
                    }
                };
                img.onerror = () => {
                    alert("Failed to load image object.");
                    fileInput.value = ''; // Reset on error too
                    URL.revokeObjectURL(objectUrl);
                    window._activeImageRefs.delete(img);
                };
                img.src = objectUrl;
            }
        } catch (err) {
            alert("Error in handleImageUpload: " + err.message);
        }
    };

    const removeImage = (index) => {
        const updatedImages = [...shopData.images];
        updatedImages.splice(index, 1);
        setShopData({ ...shopData, images: updatedImages });
    };

    const tabs = [
        { id: 'products', label: isRTL ? 'منتجاتي' : 'My Products', icon: <PackageIcon size={20} /> },
        { id: 'orders', label: isRTL ? 'طلبات المتجر' : 'Shop Orders', icon: <Target size={20} /> },
        { id: 'reservations', label: isRTL ? 'الحجوزات' : 'Reservations', icon: <CalendarCheck size={20} /> },
        { id: 'settings', label: isRTL ? 'إعدادات المتجر' : 'Shop Settings', icon: <Settings size={20} /> },
        { id: 'billing', label: isRTL ? 'الاشتراكات والفوترة' : 'Billing & Subscription', icon: <CreditCard size={20} /> }
    ];

    const filteredTabs = shopId ? tabs : [
        { id: 'billing', label: isRTL ? 'الاشتراكات والفوترة' : 'Billing & Subscription', icon: <CreditCard size={20} /> }
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
                    {filteredTabs.map(tab => (
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
                        <h1>{filteredTabs.find(t => t.id === activeTab)?.label || (isRTL ? 'الاشتراكات والفوترة' : 'Billing & Subscription')}</h1>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
                            {isRTL
                                ? `مرحباً بك في متجرك، ${user?.name}`
                                : `Welcome to your shop, ${user?.name}`}
                        </p>
                    </div>
                </header>

                <div className="main-content-wrapper">
                    {activeTab === 'products' && shopId && <ProductManager isRTL={isRTL} shopId={shopId} />}
                    {activeTab === 'orders' && shopId && <OrderManager isRTL={isRTL} shopId={shopId} />}
                    {activeTab === 'reservations' && shopId && <ReservationManager isRTL={isRTL} shopId={shopId} />}
                    {activeTab === 'settings' && shopId && (
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
                                        const res = await api.put(`/shops/${shopId}`, {
                                            name: shopData.name,
                                            logo_url: shopData.logo_url,
                                            whatsapp_number: shopData.whatsapp_number,
                                            address: shopData.address,
                                            images: shopData.images
                                        });
                                        if (res.status === 200 || res.data.success) {
                                            showToast(isRTL ? 'تم الحفظ بنجاح' : 'Settings saved successfully', 'success');
                                        } else {
                                            showToast(`${isRTL ? 'فشل الحفظ' : 'Failed to save'}: ${res.data.error || res.data.message || 'Unknown error'}`, 'error');
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        showToast(e.response?.data?.error || (isRTL ? 'خطأ في الاتصال بالخادم' : 'Server connection error'), 'error');
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
                                            <label 
                                                htmlFor="vendor-photo-upload"
                                                style={{ height: '120px', borderRadius: '12px', border: '2px dashed #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s ease' }}
                                                onMouseOver={(e) => e.currentTarget.style.borderColor = '#c8a951'}
                                                onMouseOut={(e) => e.currentTarget.style.borderColor = '#334155'}
                                            >
                                                <Plus size={28} />
                                                <span style={{ fontSize: '0.8rem', marginTop: '8px', fontWeight: '500' }}>{isRTL ? 'إضافة صورة' : 'Add Photo'}</span>
                                            </label>
                                            <input type="file" id="vendor-photo-upload" style={{ opacity: 0, position: 'absolute', zIndex: -1, width: '1px', height: '1px', overflow: 'hidden' }} accept="image/*" onChange={handleImageUpload} />
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
                    {activeTab === 'billing' && (
                        <div className="admin-section">
                            <div className="manager-header">
                                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CreditCard size={24} color="#c8a951" />
                                    {isRTL ? 'الاشتراكات والفوترة' : 'Billing & Subscription'}
                                </h2>
                            </div>

                            {!shopId && (
                                <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(200, 169, 81, 0.1)', border: '1px solid #c8a951', borderRadius: '12px', color: '#fff', fontSize: '0.95rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <ShieldCheck size={20} color="#c8a951" style={{ flexShrink: 0 }} />
                                        <span>
                                            {isRTL 
                                                ? 'يرجى الاشتراك في خطة اشتراك لتفعيل متجرك وبدء بيع منتجاتك.' 
                                                : 'Please subscribe to a plan to activate your shop and start selling.'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {loadingBilling ? (
                                <div className="text-center p-4" style={{ color: '#94a3b8' }}>
                                    {isRTL ? 'جاري تحميل بيانات الفوترة...' : 'Loading billing data...'}
                                </div>
                            ) : mySubscription ? (
                                <div className="admin-card" style={{ padding: '30px', background: '#1e293b', border: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                                        <div>
                                            <span style={{ background: '#c8a95122', color: '#c8a951', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {isRTL ? 'خطة نشطة' : 'Active Plan'}
                                            </span>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginTop: '12px', marginBottom: '8px' }}>
                                                {mySubscription.plan?.name}
                                            </h3>
                                            <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '500px' }}>
                                                {mySubscription.plan?.description}
                                            </p>
                                            
                                            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                                                        {isRTL ? 'تكلفة الاشتراك' : 'Subscription Cost'}
                                                    </div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                                                        {mySubscription.plan?.price} QAR / {isRTL ? (mySubscription.plan?.interval === 'year' ? 'سنة' : 'شهر') : mySubscription.plan?.interval}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                                                        {isRTL ? 'تاريخ التجديد التالي' : 'Next Renewal Date'}
                                                    </div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                                                        {mySubscription.current_period_end ? new Date(mySubscription.current_period_end).toLocaleDateString(isRTL ? 'ar-QA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '12px', border: '1px solid #334155', minWidth: '250px' }}>
                                            <h4 style={{ color: '#fff', marginBottom: '12px', fontSize: '0.95rem' }}>{isRTL ? 'ميزات الخطة' : 'Plan Features'}</h4>
                                            {mySubscription.plan?.features && mySubscription.plan.features.length > 0 ? (
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {mySubscription.plan.features.map((feature, idx) => (
                                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                                                            <CheckCircle size={14} style={{ color: '#c8a951', flexShrink: 0 }} />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>{isRTL ? 'لا توجد ميزات مدرجة' : 'No features listed'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '30px', borderTop: '1px solid #334155', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button 
                                            type="button" 
                                            className="btn btn-outline" 
                                            style={{ borderColor: '#ef444433', color: '#ef4444' }}
                                            onClick={() => setCancelConfirmModal(true)}
                                        >
                                            {isRTL ? 'إلغاء الاشتراك' : 'Cancel Subscription'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                        <h3 style={{ fontSize: '1.5rem', color: '#fff', fontWeight: '700' }}>
                                            {isRTL ? 'اختر خطة لتنشيط متجرك' : 'Choose a Plan to Activate Your Shop'}
                                        </h3>
                                        <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '0.95rem' }}>
                                            {isRTL 
                                                ? 'اشترك لفتح ميزات البيع المتقدمة والترويج لمنتجاتك' 
                                                : 'Subscribe to unlock advanced selling features and promote your products'}
                                        </p>
                                    </div>

                                    <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                                        {availablePlans.map(plan => (
                                            <div key={plan.id} className="admin-card" style={{ padding: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <div style={{ flex: 1 }}>
                                                    <h4 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>{plan.name}</h4>
                                                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4' }}>{plan.description}</p>
                                                    
                                                    <div style={{ margin: '20px 0', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                        <span style={{ fontSize: '2rem', fontWeight: '800', color: '#c8a951' }}>{plan.price} QAR</span>
                                                        <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>/ {isRTL ? (plan.interval === 'year' ? 'سنوياً' : 'شهرياً') : plan.interval}</span>
                                                    </div>

                                                    {plan.features && plan.features.length > 0 && (
                                                        <div style={{ borderTop: '1px solid #334155', paddingTop: '16px', marginTop: '16px' }}>
                                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                {plan.features.map((feature, idx) => (
                                                                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                                                                        <CheckCircle size={14} style={{ color: '#c8a951', flexShrink: 0 }} />
                                                                        <span>{feature}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>

                                                <button 
                                                    type="button" 
                                                    className="btn btn-gold" 
                                                    style={{ width: '100%', marginTop: '24px', height: '40px' }}
                                                    onClick={() => setSubConfirmModal({ isOpen: true, plan })}
                                                >
                                                    {isRTL ? 'اشترك الآن' : 'Subscribe Now'}
                                                </button>
                                            </div>
                                        ))}

                                        {availablePlans.length === 0 && (
                                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '2px dashed #334155' }}>
                                                <p style={{ color: '#94a3b8' }}>{isRTL ? 'لا توجد خطط اشتراك متاحة حالياً.' : 'No subscription plans available currently.'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <ConfirmModal
                                isOpen={subConfirmModal.isOpen}
                                onClose={() => setSubConfirmModal({ isOpen: false, plan: null })}
                                onConfirm={handleSubscribe}
                                title={isRTL ? 'تأكيد الاشتراك' : 'Confirm Subscription'}
                                message={
                                    isRTL
                                        ? `هل ترغب في الاشتراك في خطة "${subConfirmModal.plan?.name}" مقابل ${subConfirmModal.plan?.price} QAR؟`
                                        : `Do you want to subscribe to the "${subConfirmModal.plan?.name}" plan for ${subConfirmModal.plan?.price} QAR?`
                                }
                                confirmText={isRTL ? 'اشترك' : 'Subscribe'}
                                cancelText={isRTL ? 'إلغاء' : 'Cancel'}
                                isRTL={isRTL}
                                variant="gold"
                                isPremium={true}
                                iconType="alert"
                            />

                            <ConfirmModal
                                isOpen={cancelConfirmModal}
                                onClose={() => setCancelConfirmModal(false)}
                                onConfirm={handleCancelSubscription}
                                title={isRTL ? 'إلغاء الاشتراك' : 'Cancel Subscription'}
                                message={
                                    isRTL
                                        ? 'هل أنت متأكد من إلغاء خطة اشتراكك الحالية؟ ستفقد إمكانية الوصول إلى الميزات المميزة.'
                                        : 'Are you sure you want to cancel your current subscription plan? You will lose access to premium selling features.'
                                }
                                confirmText={isRTL ? 'إلغاء الاشتراك' : 'Cancel Subscription'}
                                cancelText={isRTL ? 'إبقاء الاشتراك' : 'Keep Subscription'}
                                isRTL={isRTL}
                                variant="danger"
                                iconType="trash"
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default VendorPanel;

