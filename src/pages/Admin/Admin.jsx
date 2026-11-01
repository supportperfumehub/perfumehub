import React, { useState, useEffect, useRef, useContext } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { lazy, Suspense } from 'react';
import { 
    LayoutDashboard, ShoppingCart, Ticket, 
    Users, BarChart2, DatabaseBackup, Home,
    Sparkles, Package, Bell, BellOff, Trash2, Smartphone, Settings as SettingsIcon,
    Megaphone, CalendarCheck, ShieldAlert, Loader2
} from 'lucide-react';

// Lazy-loaded administrative submodules for instant SA dashboard loading
const ProductManager = lazy(() => import('../../components/Admin/ProductManager'));
const OrderManager = lazy(() => import('../../components/Admin/OrderManager'));
const CouponsManager = lazy(() => import('../../components/Admin/CouponsManager'));
const CustomersManager = lazy(() => import('../../components/Admin/CustomersManager'));
const ReportsManager = lazy(() => import('../../components/Admin/ReportsManager'));
const ArchiveManager = lazy(() => import('../../components/Admin/ArchiveManager'));
const SettingsManager = lazy(() => import('../../components/Admin/SettingsManager'));
const BannersManager = lazy(() => import('../../components/Admin/BannersManager'));
const DiscoveryManager = lazy(() => import('../../components/Admin/DiscoveryManager'));
const DeviceManager = lazy(() => import('../../components/Admin/DeviceManager'));
const ReservationManager = lazy(() => import('../../components/Admin/ReservationManager'));
const AuditLogsManager = lazy(() => import('../../components/Admin/AuditLogsManager'));

const AdminTabLoader = ({ isRTL }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '380px',
        color: '#d4af37',
        gap: '14px',
        backgroundColor: '#121212',
        borderRadius: '14px',
        border: '1px solid rgba(212, 175, 55, 0.15)'
    }}>
        <Loader2 size={36} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.95rem', fontWeight: '600', letterSpacing: '0.5px', color: '#e2e8f0' }}>
            {isRTL ? 'جاري تحميل لوحة التحكم...' : 'Loading Module...'}
        </span>
    </div>
);
import { Link } from 'react-router-dom';
import './Admin.css';

const DEFAULT_NOTIFICATIONS = [
    {
        id: 'db_restore_1',
        title: 'Database Restoration',
        titleAr: 'استعادة قاعدة البيانات',
        message: 'DATABASE RESTORATION v1.0.2 - 167 PRODUCTS SYNCED'
    }
];

const Admin = () => {
    const { isRTL = false, user: outletUser = null } = useOutletContext() || {};
    const { user: authUser, loading: authLoading } = useContext(AuthContext);
    const user = authUser || outletUser;

    const [activeTab, setActiveTab] = useState('products');
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const notificationRef = useRef(null);

    // Clean up any legacy territory preferences
    useEffect(() => {
        try {
            localStorage.removeItem('perfumehub_admin_active_territory');
        } catch (err) {
            // ignore
        }
    }, []);

    const [notifications, setNotifications] = useState(() => {
        try {
            const saved = localStorage.getItem('perfumehub_admin_notifications');
            if (saved !== null) {
                return JSON.parse(saved);
            }
        } catch (err) {
            console.error('Failed to load notifications from localStorage:', err);
        }
        return DEFAULT_NOTIFICATIONS;
    });

    // Real-time authoritative role resolution
    const role = user?.role || 'customer'; 

    const isSuperAdmin = role === 'super_admin' || role === 'admin';

    // Sync notifications to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('perfumehub_admin_notifications', JSON.stringify(notifications));
        } catch (err) {
            console.error('Failed to persist notifications:', err);
        }
    }, [notifications]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
            }
        };
        if (isNotificationOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isNotificationOpen]);

    const handleDeleteNotification = (id, e) => {
        if (e) e.stopPropagation();
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleClearAllNotifications = (e) => {
        if (e) e.stopPropagation();
        setNotifications([]);
    };

    // Route Protection with reactive AuthContext loading guard
    if (authLoading) {
        return (
            <div 
                className="loading-fallback" 
                style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '80vh', 
                    color: 'var(--color-gold, #d4af37)', 
                    fontSize: '1.2rem', 
                    fontWeight: '600' 
                }}
            >
                {isRTL ? 'جاري التحميل...' : 'Loading Perfume Hub...'}
            </div>
        );
    }

    if (!isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    const tabs = [
        { id: 'products', label: isRTL ? 'المنتجات' : 'Products', icon: <Package size={20} /> },
        { id: 'orders', label: isRTL ? 'إدارة الطلبات' : 'Orders', icon: <ShoppingCart size={20} /> },
        { id: 'reservations', label: isRTL ? 'الحجوزات والاستلام' : 'Click & Collect', icon: <CalendarCheck size={20} /> },
        { id: 'customers', label: isRTL ? 'العملاء' : 'Customers', icon: <Users size={20} /> },
        { id: 'coupons', label: isRTL ? 'الكوبونات' : 'Coupons', icon: <Ticket size={20} /> },
        { id: 'banners', label: isRTL ? 'إدارة الإعلانات والبانرات' : 'Ads & Banners', icon: <Megaphone size={20} /> },
        { id: 'discovery', label: isRTL ? 'الاكتشاف والحملات' : 'Discovery & Campaigns', icon: <Sparkles size={20} /> },
        { id: 'reports', label: isRTL ? 'التقارير' : 'Reports', icon: <BarChart2 size={20} /> },
        { id: 'devices', label: isRTL ? 'إدارة الأجهزة' : 'Manage Devices', icon: <Smartphone size={20} /> },
        { id: 'audit', label: isRTL ? 'سجل التدقيق والأمان' : 'Security Audit', icon: <ShieldAlert size={20} /> },
        { id: 'recovery', label: isRTL ? 'الاسترداد' : 'Recovery', icon: <DatabaseBackup size={20} /> },
        { id: 'settings', label: isRTL ? 'الإعدادات' : 'Settings', icon: <SettingsIcon size={20} /> }
    ];

    return (
        <div className={`admin-dashboard ${isRTL ? 'rtl' : 'ltr'}`}>
            {/* Sidebar Navigation */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <h2>{isRTL ? 'لوحة القيادة' : 'Dashboard'}</h2>
                    <div className="sidebar-header-right">
                        <span className="role-badge">
                            {isSuperAdmin ? 'SA' : (user?.name || 'Admin')}
                        </span>
                        <Link to="/" className="mobile-storefront-link" title={isRTL ? 'المتجر الرئيسي' : 'Storefront'}>
                            <Home size={16} />
                            <span>{isRTL ? 'المتجر' : 'Store'}</span>
                        </Link>
                    </div>
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

                {/* Sidebar Footer (Desktop only) */}
                <div className="sidebar-footer">
                    <Link to="/" className="nav-item" style={{ textDecoration: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }}>
                        <Home size={20} />
                        <span className="nav-label">{isRTL ? 'المتجر الرئيسي' : 'Storefront'}</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="admin-main">
                <header className="admin-topbar">
                    <div className="welcome-text">
                        <h1>
                            {isRTL ? 'مرحباً، ' : 'Welcome back, '}
                            <span className="gold-gradient-text">
                                {user?.name || (isRTL ? 'المدير العام (SA)' : 'Super Admin (SA)')}
                            </span>
                        </h1>
                        <p>{isRTL ? 'إليك نظرة عامة على عمليات المتجر اليوم.' : "Here's what's happening with your store today."}</p>
                    </div>

                    <div className="admin-topbar-controls">
                        {/* Admin Panel Notification Dropdown */}
                        <div className="admin-notification-wrapper" ref={notificationRef}>
                            <button 
                                className={`admin-notification-btn ${notifications.length > 0 ? 'has-notifications' : ''}`}
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                aria-label={isRTL ? 'التنبيهات' : 'Notifications'}
                            >
                                <Bell size={20} />
                                {notifications.length > 0 && (
                                    <span className="notification-badge-count">{notifications.length}</span>
                                )}
                            </button>
                            
                            {isNotificationOpen && (
                                <div className="admin-notification-panel animate-scale-up">
                                    <div className="admin-notification-header">
                                        <div className="admin-notification-title">
                                            <Bell size={16} />
                                            <span>{isRTL ? 'التنبيهات' : 'Notifications'}</span>
                                            <span className="notification-count-tag">{notifications.length}</span>
                                        </div>
                                        {notifications.length > 0 && (
                                            <button
                                                type="button"
                                                className="admin-clear-all-btn"
                                                onClick={handleClearAllNotifications}
                                                title={isRTL ? 'مسح الكل' : 'Clear all'}
                                            >
                                                {isRTL ? 'مسح الكل' : 'Clear all'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="admin-notification-body">
                                        {notifications.length > 0 ? (
                                            notifications.map(item => (
                                                <div key={item.id} className="admin-notification-item">
                                                    <div className="admin-notification-item-top">
                                                        <div className="admin-notification-item-title">
                                                            {isRTL ? (item.titleAr || item.title) : item.title}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="admin-notification-delete-btn"
                                                            onClick={(e) => handleDeleteNotification(item.id, e)}
                                                            title={isRTL ? 'حذف هذا التنبيه' : 'Delete notification'}
                                                            aria-label={isRTL ? 'حذف هذا التنبيه' : 'Delete notification'}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                    <div className="admin-notification-item-msg">
                                                        {item.message}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="admin-notification-empty">
                                                <BellOff size={26} />
                                                <span className="empty-title">
                                                    {isRTL ? 'لا توجد تنبيهات جديدة' : 'No notifications'}
                                                </span>
                                                <span className="empty-subtitle">
                                                    {isRTL ? 'تم الاطلاع على جميع التنبيهات' : 'All caught up!'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="main-content-wrapper">
                    <Suspense fallback={<AdminTabLoader isRTL={isRTL} />}>
                        {activeTab === 'products' && <ProductManager isRTL={isRTL} />}
                        {activeTab === 'orders' && <OrderManager isRTL={isRTL} />}
                        {activeTab === 'reservations' && <ReservationManager isRTL={isRTL} />}
                        {activeTab === 'customers' && <CustomersManager isRTL={isRTL} />}
                        {activeTab === 'coupons' && <CouponsManager isRTL={isRTL} />}
                        {activeTab === 'banners' && <BannersManager isRTL={isRTL} />}
                        {activeTab === 'discovery' && <DiscoveryManager isRTL={isRTL} />}
                        {activeTab === 'reports' && <ReportsManager isRTL={isRTL} />}
                        {activeTab === 'devices' && <DeviceManager isRTL={isRTL} />}
                        {activeTab === 'audit' && <AuditLogsManager isRTL={isRTL} />}
                        {activeTab === 'recovery' && <ArchiveManager isRTL={isRTL} />}
                        {activeTab === 'settings' && <SettingsManager isRTL={isRTL} user={user} />}
                    </Suspense>
                </div>
            </main>
        </div>
    );
};

export default Admin;
