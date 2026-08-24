import React, { useState, useEffect } from 'react';
import { 
    Settings as SettingsIcon, 
    Save, 
    RotateCcw, 
    Store, 
    Truck, 
    Bell, 
    Sparkles, 
    ShieldAlert, 
    CheckCircle2, 
    AlertTriangle,
    Mail,
    Phone,
    MessageCircle,
    DollarSign,
    Share2,
    Lock,
    Sliders,
    Zap,
    CreditCard,
    PackageCheck
} from 'lucide-react';
import ConfirmModal from '../Common/ConfirmModal';
import api from '../../utils/api_v1_0_2';
import './SettingsManager.css';

const DEFAULT_SETTINGS = {
    general: {
        storeName: 'PerfumeHub',
        storeNameAr: 'بيرفيوم هب',
        tagline: 'Best Luxury Perfumes & Fragrances in Qatar & Middle East',
        taglineAr: 'أفخم العطور الفاخرة في قطر والشرق الأوسط',
        contactEmail: 'support@perfumehubqa.com',
        supportPhone: '+974 5555 1234',
        whatsappNumber: '+974 5555 1234',
        defaultCurrency: 'QAR',
        storeAddress: 'Lusail Marina Promenade, Doha, Qatar',
        instagram: 'https://instagram.com/perfumehubqa',
        tiktok: 'https://tiktok.com/@perfumehubqa',
        twitter: 'https://twitter.com/perfumehubqa',
        snapchat: 'https://snapchat.com/add/perfumehubqa',
        facebook: 'https://facebook.com/perfumehubqa'
    },
    orders: {
        freeShippingThreshold: 300,
        standardShippingFee: 25,
        expressShippingFee: 50,
        enableExpressShipping: true,
        enableStorePickup: true,
        giftWrapFee: 10,
        enableGiftWrap: true,
        enableCOD: true,
        enableCardPayment: true
    },
    notifications: {
        adminAlertEmail: 'admin@perfumehubqa.com',
        notifyCustomerOnOrder: true,
        notifyCustomerOnShipment: true,
        notifyWhatsAppUpdates: true,
        lowStockThreshold: 5,
        dailySummaryEmail: true
    },
    aiDiscovery: {
        enableAIFinder: true,
        aiPersonality: 'luxury',
        matchingSensitivity: 'balanced',
        dailyFreeQueries: 10,
        maxRecommendationsPerQuery: 6
    },
    security: {
        maintenanceMode: false,
        maintenanceMessage: 'PerfumeHub is undergoing scheduled maintenance to bring you an elevated luxury experience. We will be back shortly.',
        maintenanceMessageAr: 'موقع بيرفيوم هب قيد الصيانة المجدولة لتحسين تجربتكم الفاخرة. سنعود قريباً.',
        allowGuestCheckout: true,
        sessionTimeoutHours: 24,
        maxConcurrentDevices: 3,
        requireStrongPassword: true
    }
};

const SettingsManager = ({ isRTL, user }) => {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [resetModalOpen, setResetModalOpen] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/settings');
            if (res.data) {
                setSettings({
                    general: { ...DEFAULT_SETTINGS.general, ...(res.data.general || {}) },
                    orders: { ...DEFAULT_SETTINGS.orders, ...(res.data.orders || {}) },
                    notifications: { ...DEFAULT_SETTINGS.notifications, ...(res.data.notifications || {}) },
                    aiDiscovery: { ...DEFAULT_SETTINGS.aiDiscovery, ...(res.data.aiDiscovery || {}) },
                    security: { ...DEFAULT_SETTINGS.security, ...(res.data.security || {}) }
                });
            }
        } catch (err) {
            console.error('Failed to load backend settings, using local defaults:', err);
            try {
                const local = localStorage.getItem('perfumehub_platform_settings');
                if (local) {
                    setSettings(JSON.parse(local));
                }
            } catch (e) {}
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setFeedback({ type: '', message: '' });

            // Persist locally for instant fallback
            localStorage.setItem('perfumehub_platform_settings', JSON.stringify(settings));

            await api.put('/admin/settings', settings);

            setFeedback({
                type: 'success',
                message: isRTL ? 'تم حفظ كافة الإعدادات وتطبيقها بنجاح!' : 'All platform settings have been updated and saved successfully!'
            });

            setTimeout(() => {
                setFeedback({ type: '', message: '' });
            }, 4000);
        } catch (err) {
            console.error('Save error:', err);
            setFeedback({
                type: 'success',
                message: isRTL ? 'تم حفظ الإعدادات محلياً بنجاح!' : 'Settings updated and saved locally!'
            });
            setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
        } finally {
            setSaving(false);
        }
    };

    const handleResetConfirm = () => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.removeItem('perfumehub_platform_settings');
        setResetModalOpen(false);
        setFeedback({
            type: 'warning',
            message: isRTL ? 'تمت استعادة الإعدادات الافتراضية. انقر على "حفظ التغييرات" لتأكيدها.' : 'Default settings restored. Click "Save Changes" to apply.'
        });
    };

    const updateNested = (category, field, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: value
            }
        }));
    };

    const tabs = [
        { id: 'general', label: isRTL ? 'العام والهوية' : 'General & Brand', icon: <Store size={18} /> },
        { id: 'orders', label: isRTL ? 'الطلبات والتوصيل' : 'Orders & Shipping', icon: <Truck size={18} /> },
        { id: 'notifications', label: isRTL ? 'التنبيهات والرسائل' : 'Notifications', icon: <Bell size={18} /> },
        { id: 'aiDiscovery', label: isRTL ? 'الذكاء الاصطناعي' : 'AI & Discovery', icon: <Sparkles size={18} /> },
        { id: 'security', label: isRTL ? 'الأمان والصيانة' : 'Security & System', icon: <ShieldAlert size={18} /> }
    ];

    if (loading) {
        return (
            <div className="settings-manager-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ color: 'var(--color-gold)', fontSize: '1.2rem', fontWeight: '600' }}>
                    {isRTL ? 'جاري تحميل الإعدادات...' : 'Loading platform settings...'}
                </div>
            </div>
        );
    }

    return (
        <div className={`settings-manager-container ${isRTL ? 'rtl' : 'ltr'}`}>
            {/* Header */}
            <div className="settings-header">
                <div className="settings-header-titles">
                    <h2>
                        <SettingsIcon size={28} color="var(--color-gold)" />
                        <span>{isRTL ? 'إعدادات المنصة والمتجر' : 'Platform & Store Settings'}</span>
                    </h2>
                    <p>
                        {isRTL 
                            ? 'إدارة هوية المتجر، سياسات التوصيل، قنوات التنبيه، محرك الذكاء الاصطناعي وأمان المنصة.'
                            : 'Configure brand identity, shipping policies, notification dispatchers, AI engine, and system security.'}
                    </p>
                </div>

                <div className="settings-header-actions">
                    <button 
                        type="button"
                        className="btn-settings-reset"
                        onClick={() => setResetModalOpen(true)}
                    >
                        <RotateCcw size={16} />
                        <span>{isRTL ? 'استعادة الافتراضي' : 'Reset Defaults'}</span>
                    </button>
                    <button 
                        type="button"
                        className="btn-settings-save"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <Save size={18} />
                        <span>{saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التغييرات' : 'Save Changes')}</span>
                    </button>
                </div>
            </div>

            {/* Feedback Alert */}
            {feedback.message && (
                <div className={`settings-alert-banner ${feedback.type}`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Category Nav Tabs */}
            <div className="settings-nav-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`settings-nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Body */}
            <div className="settings-content-grid">
                
                {/* 1. GENERAL TAB */}
                {activeTab === 'general' && (
                    <>
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <div className="settings-card-header-icon"><Store size={20} /></div>
                                <div>
                                    <h3>{isRTL ? 'هوية المتجر والعلامة التجارية' : 'Store & Brand Identity'}</h3>
                                    <p>{isRTL ? 'الاسم والشعار الرسمي المعروض للعملاء عبر المتجر.' : 'Official brand name and tagline displayed across customer storefronts.'}</p>
                                </div>
                            </div>
                            <div className="settings-fields-grid">
                                <div className="settings-field-group">
                                    <label>{isRTL ? 'اسم المتجر (الإنجليزية)' : 'Store Name (English)'}</label>
                                    <input 
                                        type="text" 
                                        className="settings-input" 
                                        value={settings.general.storeName}
                                        onChange={(e) => updateNested('general', 'storeName', e.target.value)}
                                        placeholder="PerfumeHub"
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label>{isRTL ? 'اسم المتجر (العربية)' : 'Store Name (Arabic)'}</label>
                                    <input 
                                        type="text" 
                                        className="settings-input" 
                                        value={settings.general.storeNameAr}
                                        onChange={(e) => updateNested('general', 'storeNameAr', e.target.value)}
                                        placeholder="بيرفيوم هب"
                                    />
                                </div>
                                <div className="settings-field-group full-width">
                                    <label>{isRTL ? 'الشعار التسويقي (الإنجليزية)' : 'Tagline / Slogan (English)'}</label>
                                    <input 
                                        type="text" 
                                        className="settings-input" 
                                        value={settings.general.tagline}
                                        onChange={(e) => updateNested('general', 'tagline', e.target.value)}
                                    />
                                </div>
                                <div className="settings-field-group full-width">
                                    <label>{isRTL ? 'الشعار التسويقي (العربية)' : 'Tagline / Slogan (Arabic)'}</label>
                                    <input 
                                        type="text" 
                                        className="settings-input" 
                                        value={settings.general.taglineAr}
                                        onChange={(e) => updateNested('general', 'taglineAr', e.target.value)}
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label><DollarSign size={16} /> {isRTL ? 'العملة الافتراضية' : 'Default Currency'}</label>
                                    <select 
                                        className="settings-select"
                                        value={settings.general.defaultCurrency}
                                        onChange={(e) => updateNested('general', 'defaultCurrency', e.target.value)}
                                    >
                                        <option value="QAR">QAR - Qatari Riyal (ر.ق)</option>
                                        <option value="SAR">SAR - Saudi Riyal (ر.س)</option>
                                        <option value="AED">AED - UAE Dirham (د.إ)</option>
                                        <option value="KWD">KWD - Kuwaiti Dinar (د.ك)</option>
                                        <option value="BHD">BHD - Bahraini Dinar (د.ب)</option>
                                        <option value="OMR">OMR - Omani Rial (ر.ع)</option>
                                        <option value="USD">USD - US Dollar ($)</option>
                                    </select>
                                </div>
                                <div className="settings-field-group">
                                    <label>{isRTL ? 'العنوان / المقر الرئيسي' : 'Headquarters / Location'}</label>
                                    <input 
                                        type="text" 
                                        className="settings-input" 
                                        value={settings.general.storeAddress}
                                        onChange={(e) => updateNested('general', 'storeAddress', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="settings-card">
                            <div className="settings-card-header">
                                <div className="settings-card-header-icon"><Phone size={20} /></div>
                                <div>
                                    <h3>{isRTL ? 'قنوات الدعم والتواصل' : 'Customer Support & Helplines'}</h3>
                                    <p>{isRTL ? 'معلومات الاتصال المباشرة للمساعدة والطلبات.' : 'Direct contact channels displayed on footer, contact page, and invoices.'}</p>
                                </div>
                            </div>
                            <div className="settings-fields-grid">
                                <div className="settings-field-group">
                                    <label><Mail size={16} /> {isRTL ? 'بريد الدعم الفني' : 'Support Email'}</label>
                                    <input 
                                        type="email" 
                                        className="settings-input" 
                                        value={settings.general.contactEmail}
                                        onChange={(e) => updateNested('general', 'contactEmail', e.target.value)}
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label><Phone size={16} /> {isRTL ? 'هاتف خدمة العملاء' : 'Support Phone'}</label>
                                    <input 
                                        type="text" 
                                        className="settings-input" 
                                        value={settings.general.supportPhone}
                                        onChange={(e) => updateNested('general', 'supportPhone', e.target.value)}
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label><MessageCircle size={16} /> {isRTL ? 'رقم الواتساب الرسمي' : 'Official WhatsApp Helpline'}</label>
                                    <input 
                                        type="text" 
                                        className="settings-input" 
                                        value={settings.general.whatsappNumber}
                                        onChange={(e) => updateNested('general', 'whatsappNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="settings-card">
                            <div className="settings-card-header">
                                <div className="settings-card-header-icon"><Share2 size={20} /></div>
                                <div>
                                    <h3>{isRTL ? 'حسابات التواصل الاجتماعي' : 'Social Media Accounts'}</h3>
                                    <p>{isRTL ? 'روابط القنوات الرسمية في التذييل وصفحات التواصل.' : 'Official social media links linked throughout the platform.'}</p>
                                </div>
                            </div>
                            <div className="settings-fields-grid">
                                <div className="settings-field-group">
                                    <label>Instagram URL</label>
                                    <input 
                                        type="url" 
                                        className="settings-input" 
                                        value={settings.general.instagram}
                                        onChange={(e) => updateNested('general', 'instagram', e.target.value)}
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label>TikTok URL</label>
                                    <input 
                                        type="url" 
                                        className="settings-input" 
                                        value={settings.general.tiktok}
                                        onChange={(e) => updateNested('general', 'tiktok', e.target.value)}
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label>X (Twitter) URL</label>
                                    <input 
                                        type="url" 
                                        className="settings-input" 
                                        value={settings.general.twitter}
                                        onChange={(e) => updateNested('general', 'twitter', e.target.value)}
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label>Snapchat URL</label>
                                    <input 
                                        type="url" 
                                        className="settings-input" 
                                        value={settings.general.snapchat}
                                        onChange={(e) => updateNested('general', 'snapchat', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* 2. ORDERS & SHIPPING TAB */}
                {activeTab === 'orders' && (
                    <>
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <div className="settings-card-header-icon"><Truck size={20} /></div>
                                <div>
                                    <h3>{isRTL ? 'سياسات ورسوم الشحن والتوصيل' : 'Delivery Rates & Thresholds'}</h3>
                                    <p>{isRTL ? 'تحديد حدود التوصيل المجاني والرسوم الثابتة.' : 'Configure free delivery eligibility and standard delivery pricing.'}</p>
                                </div>
                            </div>
                            <div className="settings-fields-grid">
                                <div className="settings-field-group">
                                    <label>{isRTL ? 'الحد الأدنى للشحن المجاني (ر.ق)' : 'Free Shipping Minimum Order (QAR)'}</label>
                                    <input 
                                        type="number" 
                                        className="settings-input" 
                                        value={settings.orders.freeShippingThreshold}
                                        onChange={(e) => updateNested('orders', 'freeShippingThreshold', Number(e.target.value))}
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label>{isRTL ? 'رسوم التوصيل القياسي (ر.ق)' : 'Standard Delivery Fee (QAR)'}</label>
                                    <input 
                                        type="number" 
                                        className="settings-input" 
                                        value={settings.orders.standardShippingFee}
                                        onChange={(e) => updateNested('orders', 'standardShippingFee', Number(e.target.value))}
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label>{isRTL ? 'رسوم التوصيل السريع لنفس اليوم (ر.ق)' : 'Express Same-Day Delivery Fee (QAR)'}</label>
                                    <input 
                                        type="number" 
                                        className="settings-input" 
                                        value={settings.orders.expressShippingFee}
                                        onChange={(e) => updateNested('orders', 'expressShippingFee', Number(e.target.value))}
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label>{isRTL ? 'رسوم تغليف الهدايا الفاخر (ر.ق)' : 'Luxury Gift Wrapping Fee (QAR)'}</label>
                                    <input 
                                        type="number" 
                                        className="settings-input" 
                                        value={settings.orders.giftWrapFee}
                                        onChange={(e) => updateNested('orders', 'giftWrapFee', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="settings-card">
                            <div className="settings-card-header">
                                <div className="settings-card-header-icon"><PackageCheck size={20} /></div>
                                <div>
                                    <h3>{isRTL ? 'خيارات وطرق الاستلام والتسليم' : 'Fulfillment Services & Toggles'}</h3>
                                    <p>{isRTL ? 'تفعيل أو تعطيل الخدمات المتاحة للعملاء في صفحة الدفع.' : 'Enable or disable checkout options such as express courier and boutique pickup.'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div className="settings-toggle-row">
                                    <div className="settings-toggle-info">
                                        <h4>{isRTL ? 'خدمة التوصيل السريع (في نفس اليوم)' : 'Express Same-Day Delivery'}</h4>
                                        <p>{isRTL ? 'إتاحة خيار الشحن الفوري للطلبات المستعجلة.' : 'Allow customers to select priority express delivery at checkout.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.orders.enableExpressShipping}
                                            onChange={(e) => updateNested('orders', 'enableExpressShipping', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>

                                <div className="settings-toggle-row">
                                    <div className="settings-toggle-info">
                                        <h4>{isRTL ? 'الاستلام المباشر من المتجر (Click & Collect)' : 'In-Store Boutique Pickup'}</h4>
                                        <p>{isRTL ? 'تمكين العملاء من حجز العطور واستلامها من المتجر الأقرب.' : 'Allow customers to reserve perfumes and pick them up from the nearest boutique.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.orders.enableStorePickup}
                                            onChange={(e) => updateNested('orders', 'enableStorePickup', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>

                                <div className="settings-toggle-row">
                                    <div className="settings-toggle-info">
                                        <h4>{isRTL ? 'خدمة تغليف الهدايا الفاخرة' : 'Luxury Gift Wrapping Service'}</h4>
                                        <p>{isRTL ? 'إتاحة تغليف العطر مع كرت إهداء شخصي مخصص.' : 'Offer branded gift packaging with custom handwritten note option.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.orders.enableGiftWrap}
                                            onChange={(e) => updateNested('orders', 'enableGiftWrap', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="settings-card">
                            <div className="settings-card-header">
                                <div className="settings-card-header-icon"><CreditCard size={20} /></div>
                                <div>
                                    <h3>{isRTL ? 'بوابات وطرق الدفع' : 'Payment Gateways'}</h3>
                                    <p>{isRTL ? 'التحكم في طرق الدفع المعروضة للعملاء عند الشراء.' : 'Enable or disable accepted checkout payment methods.'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div className="settings-toggle-row">
                                    <div className="settings-toggle-info">
                                        <h4>{isRTL ? 'الدفع عند الاستلام (Cash on Delivery)' : 'Cash on Delivery (COD)'}</h4>
                                        <p>{isRTL ? 'السماح بالدفع نقداً لمندوب التوصيل عند استلام الطلب.' : 'Allow customers to pay in cash upon receiving their order.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.orders.enableCOD}
                                            onChange={(e) => updateNested('orders', 'enableCOD', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>

                                <div className="settings-toggle-row">
                                    <div className="settings-toggle-info">
                                        <h4>{isRTL ? 'البطاقات الائتمانية والبنكية' : 'Credit / Debit Cards & Apple Pay'}</h4>
                                        <p>{isRTL ? 'قبول الدفع الإلكتروني عبر فيزا، ماستركارد وApple Pay.' : 'Accept online digital payments via Visa, Mastercard, and Apple Pay.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.orders.enableCardPayment}
                                            onChange={(e) => updateNested('orders', 'enableCardPayment', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* 3. NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                    <>
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <div className="settings-card-header-icon"><Bell size={20} /></div>
                                <div>
                                    <h3>{isRTL ? 'إشعارات الإدارة والمبيعات' : 'Admin & Staff Alerts'}</h3>
                                    <p>{isRTL ? 'تنبيهات فورية عند وصول طلبات جديدة أو انخفاض المخزون.' : 'Real-time alert dispatching when new orders are placed or stock runs low.'}</p>
                                </div>
                            </div>
                            <div className="settings-fields-grid" style={{ marginBottom: '20px' }}>
                                <div className="settings-field-group full-width">
                                    <label>{isRTL ? 'البريد الإلكتروني لتنبيهات الطلبات الجديدة' : 'Admin Order Alert Email (comma-separated)'}</label>
                                    <input 
                                        type="text" 
                                        className="settings-input" 
                                        value={settings.notifications.adminAlertEmail}
                                        onChange={(e) => updateNested('notifications', 'adminAlertEmail', e.target.value)}
                                        placeholder="admin@perfumehubqa.com, orders@perfumehubqa.com"
                                    />
                                </div>
                                <div className="settings-field-group">
                                    <label>{isRTL ? 'تنبيه انخفاض المخزون (أقل من كمية)' : 'Low Stock Warning Threshold (units)'}</label>
                                    <input 
                                        type="number" 
                                        className="settings-input" 
                                        value={settings.notifications.lowStockThreshold}
                                        onChange={(e) => updateNested('notifications', 'lowStockThreshold', Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div className="settings-toggle-row">
                                    <div className="settings-toggle-info">
                                        <h4>{isRTL ? 'ملخص المبيعات اليومي للإدارة' : 'Daily Super Admin Revenue Summary Email'}</h4>
                                        <p>{isRTL ? 'إرسال تقرير مسائي مجمع يومياً بإجمالي الطلبات والإيرادات.' : 'Receive an automated daily sales digest at 11:59 PM.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.notifications.dailySummaryEmail}
                                            onChange={(e) => updateNested('notifications', 'dailySummaryEmail', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="settings-card">
                            <div className="settings-card-header">
                                <div className="settings-card-header-icon"><MessageCircle size={20} /></div>
                                <div>
                                    <h3>{isRTL ? 'تنبيهات العملاء وحالة الطلب' : 'Customer Notifications'}</h3>
                                    <p>{isRTL ? 'الرسائل التلقائية المرسلة للعميل عند تحديث الطلب.' : 'Automated notifications dispatched to customers throughout order lifecycle.'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div className="settings-toggle-row">
                                    <div className="settings-toggle-info">
                                        <h4>{isRTL ? 'إرسال تأكيد الطلب عبر البريد' : 'Email Order Confirmation'}</h4>
                                        <p>{isRTL ? 'إرسال فاتورة وتفاصيل الطلب فور إتمامه للعميل.' : 'Send order receipt & invoice immediately after checkout.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.notifications.notifyCustomerOnOrder}
                                            onChange={(e) => updateNested('notifications', 'notifyCustomerOnOrder', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>

                                <div className="settings-toggle-row">
                                    <div className="settings-toggle-info">
                                        <h4>{isRTL ? 'تحديثات الشحن عبر الواتساب والرسائل' : 'WhatsApp & SMS Shipping Updates'}</h4>
                                        <p>{isRTL ? 'إرسال رابط تتبع الشحنة عندما يصبح الطلب في الطريق.' : 'Notify customer when courier is out for delivery with live tracking.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.notifications.notifyWhatsAppUpdates}
                                            onChange={(e) => updateNested('notifications', 'notifyWhatsAppUpdates', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* 4. AI & SCENT DISCOVERY TAB */}
                {activeTab === 'aiDiscovery' && (
                    <>
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <div className="settings-card-header-icon"><Sparkles size={20} /></div>
                                <div>
                                    <h3>{isRTL ? 'مستشار العطور الذكي (PerfumeHub AI)' : 'AI Fragrance Advisor Engine'}</h3>
                                    <p>{isRTL ? 'ضبط شخصية خوارزمية الذكاء الاصطناعي وحدود البحث والاستكشاف.' : 'Control AI recommendation personality, note matching precision, and query limits.'}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
                                <div className="settings-toggle-row">
                                    <div className="settings-toggle-info">
                                        <h4>{isRTL ? 'تفعيل مستشار العطور الذكي' : 'Enable PerfumeHub AI Advisor'}</h4>
                                        <p>{isRTL ? 'إتاحة نافذة الدردشة الذكية واستكشاف النوتات للزوار.' : 'Enable interactive AI scent finder chatbot in the main storefront.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.aiDiscovery.enableAIFinder}
                                            onChange={(e) => updateNested('aiDiscovery', 'enableAIFinder', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div className="settings-fields-grid">
                                <div className="settings-field-group">
                                    <label><Sliders size={16} /> {isRTL ? 'شخصية ونبرة المستشار' : 'AI Voice & Tone'}</label>
                                    <select 
                                        className="settings-select"
                                        value={settings.aiDiscovery.aiPersonality}
                                        onChange={(e) => updateNested('aiDiscovery', 'aiPersonality', e.target.value)}
                                    >
                                        <option value="luxury">{isRTL ? 'فاخرة وبلاغية (Luxury & Eloquent)' : 'Luxury & Eloquent'}</option>
                                        <option value="friendly">{isRTL ? 'عصرية وودودة (Modern & Friendly)' : 'Modern & Friendly'}</option>
                                        <option value="direct">{isRTL ? 'مباشرة وموجزة (Concise & Direct)' : 'Concise & Direct'}</option>
                                    </select>
                                </div>

                                <div className="settings-field-group">
                                    <label><Zap size={16} /> {isRTL ? 'دقة مطابقة النوتات العطرية' : 'Fragrance Matching Precision'}</label>
                                    <select 
                                        className="settings-select"
                                        value={settings.aiDiscovery.matchingSensitivity}
                                        onChange={(e) => updateNested('aiDiscovery', 'matchingSensitivity', e.target.value)}
                                    >
                                        <option value="strict">{isRTL ? 'مطابقة دقيقة لنوتات العطر (Strict Notes Match)' : 'Strict Notes Match'}</option>
                                        <option value="balanced">{isRTL ? 'متوازنة مع العائلات العطرية (Balanced)' : 'Balanced Note & Family'}</option>
                                        <option value="exploratory">{isRTL ? 'استكشافية وإبداعية (Creative & Exploratory)' : 'Creative & Exploratory'}</option>
                                    </select>
                                </div>

                                <div className="settings-field-group">
                                    <label>{isRTL ? 'الحد اليومي للاستشارات المجانية لكل مستخدم' : 'Daily Free AI Questions per Visitor'}</label>
                                    <input 
                                        type="number" 
                                        className="settings-input" 
                                        value={settings.aiDiscovery.dailyFreeQueries}
                                        onChange={(e) => updateNested('aiDiscovery', 'dailyFreeQueries', Number(e.target.value))}
                                    />
                                </div>

                                <div className="settings-field-group">
                                    <label>{isRTL ? 'أقصى عدد عطور مقترحة في الإجابة' : 'Max Recommended Perfumes per Response'}</label>
                                    <input 
                                        type="number" 
                                        className="settings-input" 
                                        value={settings.aiDiscovery.maxRecommendationsPerQuery}
                                        onChange={(e) => updateNested('aiDiscovery', 'maxRecommendationsPerQuery', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* 5. SECURITY & MAINTENANCE TAB */}
                {activeTab === 'security' && (
                    <>
                        <div className="settings-card" style={{ borderColor: settings.security.maintenanceMode ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)' }}>
                            <div className="settings-card-header">
                                <div className="settings-card-header-icon" style={{ color: settings.security.maintenanceMode ? '#f59e0b' : '#c8a951' }}>
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <h3 style={{ color: settings.security.maintenanceMode ? '#fbbf24' : '#ffffff' }}>
                                        {isRTL ? 'وضع الصيانة والترقية (Maintenance Mode)' : 'Platform Maintenance Mode'}
                                    </h3>
                                    <p>{isRTL ? 'عند التفعيل، سيتم حجب الواجهة وعرض رسالة الصيانة لجميع الزوار.' : 'When enabled, public storefront is locked with an elegant maintenance screen.'}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="settings-toggle-row" style={{ background: settings.security.maintenanceMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(15, 23, 42, 0.6)' }}>
                                    <div className="settings-toggle-info">
                                        <h4 style={{ color: settings.security.maintenanceMode ? '#fbbf24' : '#ffffff' }}>
                                            {isRTL ? 'تفعيل وضع الصيانة العام للمتجر' : 'Enable Maintenance Mode'}
                                        </h4>
                                        <p>{isRTL ? 'يسمح للمسؤولين فقط بالدخول بينما يرى الزوار شاشة الترقية.' : 'Admins can still browse, while customers see scheduled upgrade banner.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.security.maintenanceMode}
                                            onChange={(e) => updateNested('security', 'maintenanceMode', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>

                                <div className="settings-field-group full-width">
                                    <label>{isRTL ? 'رسالة الصيانة للزوار (الإنجليزية)' : 'Maintenance Screen Notice (English)'}</label>
                                    <textarea 
                                        className="settings-textarea"
                                        value={settings.security.maintenanceMessage}
                                        onChange={(e) => updateNested('security', 'maintenanceMessage', e.target.value)}
                                    />
                                </div>

                                <div className="settings-field-group full-width">
                                    <label>{isRTL ? 'رسالة الصيانة للزوار (العربية)' : 'Maintenance Screen Notice (Arabic)'}</label>
                                    <textarea 
                                        className="settings-textarea"
                                        value={settings.security.maintenanceMessageAr}
                                        onChange={(e) => updateNested('security', 'maintenanceMessageAr', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="settings-card">
                            <div className="settings-card-header">
                                <div className="settings-card-header-icon"><Lock size={20} /></div>
                                <div>
                                    <h3>{isRTL ? 'أمان الجلسات وحسابات الإدارة' : 'Authentication & Session Policies'}</h3>
                                    <p>{isRTL ? 'التحكم في فترات صلاحية تسجيل الدخول وأمان الأجهزة.' : 'Configure session durations, device concurrency limits, and password rules.'}</p>
                                </div>
                            </div>
                            <div className="settings-fields-grid" style={{ marginBottom: '18px' }}>
                                <div className="settings-field-group">
                                    <label>{isRTL ? 'مدة انتهاء الجلسة عند الخمول' : 'Session Inactivity Timeout'}</label>
                                    <select 
                                        className="settings-select"
                                        value={settings.security.sessionTimeoutHours}
                                        onChange={(e) => updateNested('security', 'sessionTimeoutHours', Number(e.target.value))}
                                    >
                                        <option value={1}>1 {isRTL ? 'ساعة' : 'Hour'}</option>
                                        <option value={6}>6 {isRTL ? 'ساعات' : 'Hours'}</option>
                                        <option value={24}>24 {isRTL ? 'ساعة (يوم كامل)' : 'Hours (1 Day)'}</option>
                                        <option value={168}>7 {isRTL ? 'أيام' : 'Days'}</option>
                                        <option value={720}>30 {isRTL ? 'يوماً' : 'Days'}</option>
                                    </select>
                                </div>

                                <div className="settings-field-group">
                                    <label>{isRTL ? 'الحد الأقصى للأجهزة المتزامنة لكل حساب' : 'Max Concurrent Logged Devices'}</label>
                                    <select 
                                        className="settings-select"
                                        value={settings.security.maxConcurrentDevices}
                                        onChange={(e) => updateNested('security', 'maxConcurrentDevices', Number(e.target.value))}
                                    >
                                        <option value={1}>1 {isRTL ? 'جهاز واحد فقط' : 'Device only'}</option>
                                        <option value={3}>3 {isRTL ? 'أجهزة' : 'Devices'}</option>
                                        <option value={5}>5 {isRTL ? 'أجهزة' : 'Devices'}</option>
                                        <option value={10}>10 {isRTL ? 'أجهزة' : 'Devices'}</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div className="settings-toggle-row">
                                    <div className="settings-toggle-info">
                                        <h4>{isRTL ? 'السماح بالشراء كزائر بدون تسجيل حساب' : 'Allow Guest Checkout'}</h4>
                                        <p>{isRTL ? 'تمكين العملاء من إتمام الشراء السريع بدون إنشاء كلمة مرور.' : 'Allow buyers to purchase without requiring mandatory account creation.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.security.allowGuestCheckout}
                                            onChange={(e) => updateNested('security', 'allowGuestCheckout', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>

                                <div className="settings-toggle-row">
                                    <div className="settings-toggle-info">
                                        <h4>{isRTL ? 'فرض سياسة كلمة مرور قوية للإدارة' : 'Enforce Strong Admin Password Policy'}</h4>
                                        <p>{isRTL ? 'اشتراط احتواء كلمات المرور على أحرف كبيرة وأرقام ورموز خاصة.' : 'Require at least 8 characters with numbers, symbols, and mixed case.'}</p>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.security.requireStrongPassword}
                                            onChange={(e) => updateNested('security', 'requireStrongPassword', e.target.checked)}
                                        />
                                        <span className="settings-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </>
                )}

            </div>

            {/* Reset Confirmation Modal */}
            <ConfirmModal
                isOpen={resetModalOpen}
                onClose={() => setResetModalOpen(false)}
                onConfirm={handleResetConfirm}
                title={isRTL ? 'استعادة الإعدادات الافتراضية' : 'Restore Default Settings'}
                message={
                    isRTL 
                        ? 'هل أنت متأكد من رغبتك في استعادة كافة إعدادات المنصة إلى القيم الافتراضية الأولية؟' 
                        : 'Are you sure you want to reset all platform and store settings back to their factory defaults?'
                }
                confirmText={isRTL ? 'استعادة الافتراضي' : 'RESTORE DEFAULTS'}
                cancelText={isRTL ? 'إلغاء' : 'CANCEL'}
                isRTL={isRTL}
                variant="danger"
                iconType="alert"
            />
        </div>
    );
};

export default SettingsManager;
