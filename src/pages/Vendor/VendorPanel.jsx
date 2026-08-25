import React, { useState, useContext, useEffect } from 'react';
import { useOutletContext, Navigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ShopContext } from '../../context/ShopContext';
import ProductManager from '../../components/Admin/ProductManager';
import OrderManager from '../../components/Admin/OrderManager';
import ReservationManager from '../../components/Admin/ReservationManager';
import DeviceManager from '../../components/Admin/DeviceManager';
import ConfirmModal from '../../components/Common/ConfirmModal';
import '../Admin/Admin.css'; // Use the premium admin styles
import { Store, Package as PackageIcon, Target, Settings, Save, Plus, X, Image as ImageIcon, Home, CalendarCheck, CreditCard, CheckCircle, Zap, ShieldCheck, Smartphone, Upload, Trash2, MapPin, Phone, Clock, Truck, Bell, MessageSquare, Shield } from 'lucide-react';
import api from '../../utils/api_v1_0_2';

const VendorPanel = () => {
    const { isRTL } = useOutletContext();
    const { user, isVendor } = useContext(AuthContext);
    const { showToast } = useContext(ShopContext);
    const shopId = user?.shop_id;
    const [activeTab, setActiveTab] = useState(shopId ? 'products' : 'billing');
    const [shopData, setShopData] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [vendorPrefs, setVendorPrefs] = useState(() => {
        try {
            const saved = localStorage.getItem(`vendor_prefs_${shopId}`);
            return saved ? JSON.parse(saved) : {
                isAcceptingOrders: true,
                openTime: '09:00',
                closeTime: '22:00',
                weekendHours: '04:00 PM - 11:30 PM',
                allowStorePickup: true,
                allowHomeDelivery: true,
                deliveryWindow: 'same_day',
                whatsappGreeting: '',
                notifyLowStock: true,
                notifyNewReservations: true
            };
        } catch {
            return {
                isAcceptingOrders: true,
                openTime: '09:00',
                closeTime: '22:00',
                weekendHours: '04:00 PM - 11:30 PM',
                allowStorePickup: true,
                allowHomeDelivery: true,
                deliveryWindow: 'same_day',
                whatsappGreeting: '',
                notifyLowStock: true,
                notifyNewReservations: true
            };
        }
    });

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
                    // Backend already filters the list to only return the vendor's own shop
                    const myShop = shopsList[0];
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
        const updatedImages = [...(shopData.images || [])];
        updatedImages.splice(index, 1);
        setShopData({ ...shopData, images: updatedImages });
    };

    const handleLogoUpload = (e) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            const objectUrl = URL.createObjectURL(file);
            const img = new window.Image();

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                    setShopData(prev => ({ 
                        ...prev, 
                        logo_url: compressedBase64,
                        images: [compressedBase64]
                    }));
                    URL.revokeObjectURL(objectUrl);
                } catch (err) {
                    console.error(err);
                    URL.revokeObjectURL(objectUrl);
                }
            };
            img.src = objectUrl;
            e.target.value = '';
        } catch (err) {
            console.error(err);
        }
    };

    const removeLogo = () => {
        setShopData(prev => ({ ...prev, logo_url: '', images: [] }));
    };

    const tabs = [
        { id: 'products', label: isRTL ? 'منتجاتي' : 'My Products', icon: <PackageIcon size={20} /> },
        { id: 'orders', label: isRTL ? 'طلبات المتجر' : 'Shop Orders', icon: <Target size={20} /> },
        { id: 'reservations', label: isRTL ? 'الحجوزات' : 'Reservations', icon: <CalendarCheck size={20} /> },
        { id: 'devices', label: isRTL ? 'إدارة الأجهزة' : 'Manage Devices', icon: <Smartphone size={20} /> },
        { id: 'settings', label: isRTL ? 'إعدادات المتجر' : 'Shop Settings', icon: <Settings size={20} /> },
        { id: 'billing', label: isRTL ? 'الاشتراكات والفوترة' : 'Billing & Subscription', icon: <CreditCard size={20} /> }
    ];

    const filteredTabs = shopId ? tabs : [
        { id: 'devices', label: isRTL ? 'إدارة الأجهزة' : 'Manage Devices', icon: <Smartphone size={20} /> },
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
                    {activeTab === 'devices' && <DeviceManager isRTL={isRTL} />}
                    {activeTab === 'settings' && shopId && (
                        <div className="admin-section">
                            <div className="manager-header" style={{ marginBottom: '24px' }}>
                                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Settings size={24} color="#c8a951" /> 
                                    {isRTL ? 'إعدادات وخيارات المتجر' : 'Shop Settings & Preferences'}
                                </h2>
                                <p style={{ color: '#94a3b8', fontSize: '0.86rem', margin: '6px 0 0 0' }}>
                                    {isRTL ? 'تحكم ببيانات المتجر، أوقات العمل، خيارات التوصيل، رسائل الطلبات، والتنبيهات' : 'Manage your boutique profile, business hours, delivery options, custom messages, and smart alerts'}
                                </p>
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

                                        // Persist operational preferences locally
                                        localStorage.setItem(`vendor_prefs_${shopId}`, JSON.stringify(vendorPrefs));

                                        if (res.status === 200 || res.data.success) {
                                            showToast(isRTL ? 'تم حفظ جميع إعدادات المتجر بنجاح!' : 'All shop settings saved successfully!', 'success');
                                            if (res.data.shop) {
                                                setShopData(res.data.shop);
                                            }
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
                                    {/* 1. Boutique Profile & Visual Identity */}
                                    <div className="settings-section-card">
                                        <div className="settings-section-header">
                                            <h3 className="settings-section-title">
                                                <Store size={18} color="#c8a951" />
                                                {isRTL ? 'معلومات وهوية المتجر' : 'Boutique Profile & Contact'}
                                            </h3>
                                            <p className="settings-section-desc">
                                                {isRTL ? 'البيانات الأساسية التي تظهر للعملاء في دليل المتاجر والصفحة الرئيسية' : 'Primary store identity visible across customer discovery and shop listings'}
                                            </p>
                                        </div>

                                        {/* Brand Identity / Profile Photo */}
                                        {(() => {
                                            const currentLogo = shopData?.logo_url || (Array.isArray(shopData?.images) && shopData.images.length > 0 ? shopData.images[0] : '');
                                            return (
                                                <div className="vendor-logo-section">
                                                    <div className="vendor-logo-preview">
                                                        {currentLogo ? (
                                                            <img src={currentLogo} alt="Shop Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <Store size={34} color="#c8a951" />
                                                        )}
                                                    </div>
                                                    <div className="vendor-logo-info">
                                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.96rem', color: '#f8fafc', fontWeight: '700' }}>
                                                            {isRTL ? 'صورة وشعار المتجر' : 'Shop Profile Photo & Logo'}
                                                        </h4>
                                                        <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                                                            {isRTL ? 'تظهر للعملاء في ملف المتجر وقائمة المتاجر' : 'Visible to customers across boutique discovery and profiles'}
                                                        </p>
                                                        <div className="vendor-logo-actions">
                                                            <label 
                                                                htmlFor="vendor-logo-file-input" 
                                                                className="btn-logo-upload"
                                                            >
                                                                <Upload size={14} />
                                                                <span>{currentLogo ? (isRTL ? 'تغيير الصورة' : 'Change Photo') : (isRTL ? 'رفع صورة المتجر' : 'Upload Photo')}</span>
                                                            </label>
                                                            <input 
                                                                type="file" 
                                                                id="vendor-logo-file-input" 
                                                                accept="image/*" 
                                                                style={{ display: 'none' }} 
                                                                onChange={handleLogoUpload} 
                                                            />
                                                            {currentLogo && (
                                                                <button 
                                                                    type="button" 
                                                                    className="btn-logo-remove" 
                                                                    onClick={removeLogo}
                                                                >
                                                                    <Trash2 size={14} />
                                                                    <span>{isRTL ? 'حذف' : 'Remove'}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="settings-grid-2">
                                            {/* Shop Name */}
                                            <div className="form-group">
                                                <label className="form-label">
                                                    <Store size={15} color="#c8a951" />
                                                    {isRTL ? 'اسم المتجر' : 'Shop Name'}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    value={shopData.name || ''} 
                                                    onChange={(e) => setShopData({...shopData, name: e.target.value})}
                                                    required
                                                    placeholder={isRTL ? 'أدخل اسم متجرك' : 'Enter shop name'}
                                                />
                                            </div>

                                            {/* WhatsApp Number */}
                                            <div className="form-group">
                                                <label className="form-label">
                                                    <Phone size={15} color="#c8a951" />
                                                    {isRTL ? 'رقم الواتساب للطلبات' : 'WhatsApp Order Hotline'}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    placeholder="+974..."
                                                    value={shopData.whatsapp_number || ''} 
                                                    onChange={(e) => setShopData({...shopData, whatsapp_number: e.target.value})}
                                                />
                                                <small className="form-helper-text">
                                                    {isRTL ? 'الرقم الذي يتواصل عليه العملاء لتأكيد الحجز' : 'The number customers message for reservations and order confirmations'}
                                                </small>
                                            </div>
                                        </div>

                                        {/* Detailed Address */}
                                        <div className="form-group" style={{ marginTop: '8px' }}>
                                            <label className="form-label">
                                                <MapPin size={15} color="#c8a951" />
                                                {isRTL ? 'عنوان وموقع المتجر' : 'Detailed Shop Address'}
                                            </label>
                                            <textarea 
                                                className="form-control textarea-address" 
                                                rows="3"
                                                value={shopData.address || ''} 
                                                onChange={(e) => setShopData({...shopData, address: e.target.value})}
                                                placeholder={isRTL ? 'أدخل العنوان بالتفصيل، المدينة، واسم الشارع أو المول' : 'Enter detailed boutique address, mall/street, and city'}
                                            />
                                        </div>
                                    </div>

                                    {/* 2. Operational Hours & Availability */}
                                    <div className="settings-section-card">
                                        <div className="settings-section-header">
                                            <h3 className="settings-section-title">
                                                <Clock size={18} color="#c8a951" />
                                                {isRTL ? 'أوقات العمل واستقبال الطلبات' : 'Working Hours & Availability'}
                                            </h3>
                                            <p className="settings-section-desc">
                                                {isRTL ? 'تحديد مواعيد فتح المتجر واستقبال الحجوزات أو تعليقها مؤقتاً' : 'Configure operating hours and pause customer orders during holidays or renovations'}
                                            </p>
                                        </div>

                                        {/* Accepting Orders Toggle */}
                                        <div className="settings-toggle-row">
                                            <div className="settings-toggle-info">
                                                <div className="settings-toggle-label">
                                                    <span>{isRTL ? 'حالة استقبال الطلبات' : 'Accepting Orders & Inquiries'}</span>
                                                    {vendorPrefs.isAcceptingOrders ? (
                                                        <span className="settings-badge-active">
                                                            <CheckCircle size={12} /> {isRTL ? 'مفتوح للطلبات' : 'Active / Open'}
                                                        </span>
                                                    ) : (
                                                        <span className="settings-badge-paused">
                                                            <Clock size={12} /> {isRTL ? 'معلق مؤقتاً' : 'Temporarily Paused'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="settings-toggle-sub">
                                                    {isRTL ? 'عند التعطيل، سيتم إعلام العملاء بأن المتجر في فترة استراحة أو إجازة' : 'When disabled, customers are notified that your boutique is temporarily on pause or vacation'}
                                                </div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={vendorPrefs.isAcceptingOrders} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, isAcceptingOrders: e.target.checked }))} 
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>

                                        <div className="settings-grid-2" style={{ marginTop: '16px' }}>
                                            <div className="form-group">
                                                <label className="form-label">
                                                    <Clock size={15} color="#c8a951" />
                                                    {isRTL ? 'ساعة فتح المتجر اليومي' : 'Daily Opening Time'}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    placeholder="09:00 AM" 
                                                    value={vendorPrefs.openTime || ''} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, openTime: e.target.value }))} 
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">
                                                    <Clock size={15} color="#c8a951" />
                                                    {isRTL ? 'ساعة إغلاق المتجر اليومي' : 'Daily Closing Time'}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    placeholder="10:00 PM" 
                                                    value={vendorPrefs.closeTime || ''} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, closeTime: e.target.value }))} 
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginTop: '8px' }}>
                                            <label className="form-label">
                                                <CalendarCheck size={15} color="#c8a951" />
                                                {isRTL ? 'ملاحظة مواعيد يوم الجمعة والعطلات' : 'Friday & Weekend Special Hours'}
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                placeholder="04:00 PM - 11:30 PM (Friday)" 
                                                value={vendorPrefs.weekendHours || ''} 
                                                onChange={(e) => setVendorPrefs(prev => ({ ...prev, weekendHours: e.target.value }))} 
                                            />
                                        </div>
                                    </div>

                                    {/* 3. Order Fulfillment & Delivery Preferences */}
                                    <div className="settings-section-card">
                                        <div className="settings-section-header">
                                            <h3 className="settings-section-title">
                                                <Truck size={18} color="#c8a951" />
                                                {isRTL ? 'خيارات الاستلام والتوصيل' : 'Fulfillment & Delivery Options'}
                                            </h3>
                                            <p className="settings-section-desc">
                                                {isRTL ? 'حدد طرق الاستلام والتسليم المتاحة لزبائنك' : 'Configure delivery services and in-store boutique pickup availability'}
                                            </p>
                                        </div>

                                        {/* Boutique Pickup Toggle */}
                                        <div className="settings-toggle-row">
                                            <div className="settings-toggle-info">
                                                <div className="settings-toggle-label">
                                                    <Store size={15} color="#c8a951" />
                                                    <span>{isRTL ? 'الاستلام المباشر من المتجر (In-Store Pickup)' : 'In-Store Boutique Pickup'}</span>
                                                </div>
                                                <div className="settings-toggle-sub">
                                                    {isRTL ? 'السماح للزبون بحجز العطر أونلاين واستلامه وتجربته في المتجر' : 'Allow customers to reserve perfumes online and collect/sample at your shop'}
                                                </div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={vendorPrefs.allowStorePickup} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, allowStorePickup: e.target.checked }))} 
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>

                                        {/* Direct Home Delivery Toggle */}
                                        <div className="settings-toggle-row">
                                            <div className="settings-toggle-info">
                                                <div className="settings-toggle-label">
                                                    <Truck size={15} color="#c8a951" />
                                                    <span>{isRTL ? 'خدمة التوصيل المباشر للمنزل (Home Delivery)' : 'Direct Home Delivery'}</span>
                                                </div>
                                                <div className="settings-toggle-sub">
                                                    {isRTL ? 'توفير خدمة شحن وتوصيل الطلبات إلى عنوان العميل' : 'Provide direct local courier dispatch to customer destination'}
                                                </div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={vendorPrefs.allowHomeDelivery} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, allowHomeDelivery: e.target.checked }))} 
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>

                                        {/* Processing Window */}
                                        <div className="form-group" style={{ marginTop: '16px' }}>
                                            <label className="form-label">
                                                <Zap size={15} color="#c8a951" />
                                                {isRTL ? 'متوسط سرعة تجهيز وتوصيل الطلبات' : 'Standard Fulfillment Window'}
                                            </label>
                                            <select 
                                                className="form-control" 
                                                value={vendorPrefs.deliveryWindow || 'same_day'} 
                                                onChange={(e) => setVendorPrefs(prev => ({ ...prev, deliveryWindow: e.target.value }))}
                                            >
                                                <option value="express">{isRTL ? 'توصيل فوري سريع (2 - 4 ساعات)' : 'Express Courier (2 - 4 Hours)'}</option>
                                                <option value="same_day">{isRTL ? 'توصيل في نفس اليوم (Same Day)' : 'Same Day Delivery'}</option>
                                                <option value="next_day">{isRTL ? 'توصيل خلال 24 ساعة (Next Day)' : 'Next Day Delivery (24h)'}</option>
                                                <option value="standard">{isRTL ? '1 - 2 أيام عمل (1 - 2 Business Days)' : '1 - 2 Business Days'}</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* 4. WhatsApp Order Template & Smart Notifications */}
                                    <div className="settings-section-card">
                                        <div className="settings-section-header">
                                            <h3 className="settings-section-title">
                                                <MessageSquare size={18} color="#c8a951" />
                                                {isRTL ? 'رسائل الواتساب والتنبيهات' : 'WhatsApp Messages & Alerts'}
                                            </h3>
                                            <p className="settings-section-desc">
                                                {isRTL ? 'تخصيص نص رسالة الحجز وتفعيل إشعارات المخزون المنخفض' : 'Customize customer greeting messages and enable automated stock alert notifications'}
                                            </p>
                                        </div>

                                        {/* Custom WhatsApp Greeting */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <MessageSquare size={15} color="#c8a951" />
                                                {isRTL ? 'رسالة الترحيب التلقائية عند طلب الحجز عبر الواتساب' : 'Custom WhatsApp Order Greeting Template'}
                                            </label>
                                            <textarea 
                                                className="form-control textarea-address" 
                                                rows="2"
                                                placeholder={isRTL ? 'مرحباً! أود تأكيد حجز المنتج التالي من متجركم على بيرفيوم هب:' : 'Hello! I would like to reserve an item from your boutique on PerfumeHub:'}
                                                value={vendorPrefs.whatsappGreeting || ''} 
                                                onChange={(e) => setVendorPrefs(prev => ({ ...prev, whatsappGreeting: e.target.value }))}
                                            />
                                            <small className="form-helper-text">
                                                {isRTL ? 'الرسالة الأولية التي تظهر للعميل في محادثة الواتساب عند النقر على حجز المنتج' : 'Initial greeting pre-filled in customer WhatsApp chat when reserving perfumes from your boutique'}
                                            </small>
                                        </div>

                                        {/* Low Stock Alert Toggle */}
                                        <div className="settings-toggle-row" style={{ marginTop: '14px' }}>
                                            <div className="settings-toggle-info">
                                                <div className="settings-toggle-label">
                                                    <Bell size={15} color="#c8a951" />
                                                    <span>{isRTL ? 'تنبيه انخفاض المخزون (Low Stock Alert)' : 'Low Stock Warning Alerts'}</span>
                                                </div>
                                                <div className="settings-toggle-sub">
                                                    {isRTL ? 'إظهار شارة تنبيه عندما يصل مخزون أي عطر إلى أقل من 3 حبات' : 'Display alert badge when product stock drops below 3 units'}
                                                </div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={vendorPrefs.notifyLowStock} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, notifyLowStock: e.target.checked }))} 
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>

                                        {/* Reservation Alerts */}
                                        <div className="settings-toggle-row">
                                            <div className="settings-toggle-info">
                                                <div className="settings-toggle-label">
                                                    <CalendarCheck size={15} color="#c8a951" />
                                                    <span>{isRTL ? 'تنبيهات الحجوزات الجديدة' : 'Instant Reservation Alerts'}</span>
                                                </div>
                                                <div className="settings-toggle-sub">
                                                    {isRTL ? 'تلقي إشعارات فورية عند تسجيل حجز جديد من العملاء' : 'Receive instant status alerts when customers submit new reservation requests'}
                                                </div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={vendorPrefs.notifyNewReservations} 
                                                    onChange={(e) => setVendorPrefs(prev => ({ ...prev, notifyNewReservations: e.target.checked }))} 
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* 5. Account & Plan Overview */}
                                    <div className="settings-section-card">
                                        <div className="settings-section-header">
                                            <h3 className="settings-section-title">
                                                <ShieldCheck size={18} color="#c8a951" />
                                                {isRTL ? 'بيانات الحساب والاشتراك' : 'Account & Subscription Overview'}
                                            </h3>
                                            <p className="settings-section-desc">
                                                {isRTL ? 'معلومات اعتماد البائع وخطة الاشتراك الحالية' : 'Vendor partner credentials and active subscription tier'}
                                            </p>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                                            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>{isRTL ? 'معرف المتجر' : 'Shop ID'}</div>
                                                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#c8a951', marginTop: '4px' }}>#{shopId}</div>
                                            </div>

                                            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>{isRTL ? 'حالة الاعتماد' : 'Verification Status'}</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#4ade80', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <CheckCircle size={14} /> {isRTL ? 'بائع معتمد' : 'Verified Vendor'}
                                                </div>
                                            </div>

                                            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>{isRTL ? 'البريد الإلكتروني' : 'Account Email'}</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f8fafc', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'N/A'}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <button 
                                                type="button" 
                                                className="btn-logo-upload"
                                                onClick={() => setActiveTab('billing')}
                                                style={{ height: '38px', fontSize: '0.82rem' }}
                                            >
                                                <CreditCard size={15} />
                                                <span>{isRTL ? 'إدارة الاشتراك والفوترة' : 'Manage Subscription & Plans'}</span>
                                            </button>
                                            <button 
                                                type="button" 
                                                className="btn-logo-upload"
                                                onClick={() => setActiveTab('devices')}
                                                style={{ height: '38px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.05)', borderColor: '#334155', color: '#cbd5e1' }}
                                            >
                                                <Smartphone size={15} />
                                                <span>{isRTL ? 'إدارة الأجهزة المسجلة' : 'Manage Connected Devices'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Unified Save Changes Button */}
                                    <div style={{ marginTop: '28px', marginBottom: '20px' }}>
                                        <button type="submit" className="btn-save-settings" disabled={savingSettings}>
                                            <Save size={18} />
                                            {savingSettings ? (isRTL ? 'جاري حفظ التغييرات...' : 'Saving All Settings...') : (isRTL ? 'حفظ جميع الإعدادات' : 'Save All Settings')}
                                        </button>
                                    </div>
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

