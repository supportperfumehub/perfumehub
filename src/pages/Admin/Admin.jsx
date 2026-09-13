import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import ProductManager from '../../components/Admin/ProductManager';
import OrderManager from '../../components/Admin/OrderManager';
import CouponsManager from '../../components/Admin/CouponsManager';
import CustomersManager from '../../components/Admin/CustomersManager';
import ReportsManager from '../../components/Admin/ReportsManager';
import ArchiveManager from '../../components/Admin/ArchiveManager';
import ShopsManager from '../../components/Admin/ShopsManager';
import RegionsManager from '../../components/Admin/RegionsManager';
import SubscriptionManager from '../../components/Admin/SubscriptionManager';
import SettingsManager from '../../components/Admin/SettingsManager';
import BannersManager from '../../components/Admin/BannersManager';
import PayoutsManager from '../../components/Admin/PayoutsManager';
import { 
    LayoutDashboard, ShoppingCart, Ticket, 
    Users, Store, BarChart2, DatabaseBackup, Globe, Home,
    Sparkles, Sliders, Package, Bell, BellOff, Trash2, Smartphone, Settings as SettingsIcon,
    Megaphone, MapPin, CalendarCheck, ShieldAlert, DollarSign
} from 'lucide-react';
import DiscoveryManager from '../../components/Admin/DiscoveryManager';
import DeviceManager from '../../components/Admin/DeviceManager';
import RecommendationLab from '../../components/Admin/RecommendationLab';
import ReservationManager from '../../components/Admin/ReservationManager';
import AuditLogsManager from '../../components/Admin/AuditLogsManager';
import { Link } from 'react-router-dom';
import api from '../../utils/api_v1_0_2';
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
    const { isRTL, user } = useOutletContext();
    const [activeTab, setActiveTab] = useState('shops');
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const notificationRef = useRef(null);

    // Administrative Territory Governance State
    const [adminRegions, setAdminRegions] = useState([]);
    const [selectedTerritoryId, setSelectedTerritoryId] = useState(() => {
        return localStorage.getItem('perfumehub_admin_active_territory') || 'all';
    });

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

    // Assume user object contains the role from context. 
    // Fallback to 'super_admin' or 'admin' for demo purposes if strictly not set.
    const role = user?.role || 'super_admin'; 

    const isSuperAdmin = role === 'super_admin' || role === 'admin';
    const isRegionalAdmin = role === 'regional_admin';

    // Fetch assigned territories for this admin
    useEffect(() => {
        const fetchAdminRegions = async () => {
            try {
                const res = await api.get('/admin/my-regions');
                const data = Array.isArray(res.data) ? res.data : [];
                setAdminRegions(data);
                
                // If single territory assigned, auto-select it if not set
                if (data.length === 1 && selectedTerritoryId === 'all') {
                    const singleId = String(data[0].id);
                    setSelectedTerritoryId(singleId);
                    localStorage.setItem('perfumehub_admin_active_territory', singleId);
                }
            } catch (err) {
                console.error('Failed to fetch administrative territories:', err);
            }
        };

        if (user?.id) {
            fetchAdminRegions();
        }
    }, [user?.id]);

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

    // Protect Route
    if (!isSuperAdmin && !isRegionalAdmin) {
        return <Navigate to="/" replace />;
    }

    const tabs = [
        { id: 'shops', label: isRTL ? 'المتاجر' : 'Shops', icon: <Store size={20} /> },
        { id: 'products', label: isRTL ? 'المنتجات' : 'Products', icon: <Package size={20} /> },
        { id: 'orders', label: isRTL ? 'إدارة الطلبات' : 'Orders', icon: <ShoppingCart size={20} /> },
        { id: 'reservations', label: isRTL ? 'الحجوزات والاستلام' : 'Click & Collect', icon: <CalendarCheck size={20} /> },
        { id: 'discovery', label: isRTL ? 'الاكتشاف والحملات' : 'Discovery & Campaigns', icon: <Sparkles size={20} /> },
        // SA-Only tabs
        ...(isSuperAdmin ? [
            { id: 'payouts', label: isRTL ? 'المستحقات والتحويلات' : 'Payouts & Settlements', icon: <DollarSign size={20} /> },
            { id: 'coupons', label: isRTL ? 'الكوبونات' : 'Coupons', icon: <Ticket size={20} /> },
            { id: 'customers', label: isRTL ? 'العملاء' : 'Customers', icon: <Users size={20} /> },
            { id: 'regions', label: isRTL ? 'المناطق والبلديات' : 'Regions & Zones', icon: <Globe size={20} /> },
            { id: 'banners', label: isRTL ? 'البانرات' : 'Banners', icon: <Megaphone size={20} /> },
        ] : []),
        { id: 'reports', label: isRTL ? 'التقارير' : 'Reports', icon: <BarChart2 size={20} /> },
        { id: 'devices', label: isRTL ? 'إدارة الأجهزة' : 'Manage Devices', icon: <Smartphone size={20} /> },
        // Platform Master Controls (Super Admin Only)
        ...(isSuperAdmin ? [
            { id: 'algorithm', label: isRTL ? 'مختبر الخوارزميات' : 'Algo Lab', icon: <Sliders size={20} /> },
            { id: 'subscriptions', label: isRTL ? 'الاشتراكات' : 'Subscriptions', icon: <Ticket size={20} /> },
            { id: 'audit', label: isRTL ? 'سجل التدقيق والأمان' : 'Security Audit', icon: <ShieldAlert size={20} /> },
            { id: 'recovery', label: isRTL ? 'الاسترداد' : 'Recovery', icon: <DatabaseBackup size={20} /> }
        ] : []),
        // Settings available to both Super Admin and Regional Admin
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
                            {isSuperAdmin ? 'SA' : isRegionalAdmin ? 'RA' : (user?.name || 'Admin')}
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
                                {user?.name || (isSuperAdmin ? (isRTL ? 'المدير العام (SA)' : 'Super Admin (SA)') : (isRTL ? 'المدير الإقليمي (RA)' : 'Regional Admin (RA)'))}
                            </span>
                        </h1>
                        <p>{isRTL ? 'إليك نظرة عامة على عمليات المتجر اليوم.' : "Here's what's happening with your store today."}</p>
                    </div>

                    {/* Active Territory Governance Badge & Switcher */}
                    <div className="active-territory-container">
                        <div className="territory-badge">
                            <MapPin size={16} className="territory-pin-icon" />
                            <div className="territory-text-group">
                                <span className="territory-label">{isRTL ? 'الإقليم الإداري النشط' : 'Active Territory'}</span>
                                <select
                                    className="territory-select"
                                    value={selectedTerritoryId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedTerritoryId(val);
                                        localStorage.setItem('perfumehub_admin_active_territory', val);
                                    }}
                                    aria-label={isRTL ? 'تحديد الإقليم الإداري' : 'Select Administrative Territory'}
                                >
                                    {(isSuperAdmin || adminRegions.length > 1) && (
                                        <option value="all">
                                            {isRTL ? '🌐 كافة الأقاليم الموكلة' : '🌐 All Authorized Territories'}
                                        </option>
                                    )}
                                    {adminRegions.map(reg => (
                                        <option key={reg.id} value={reg.id}>
                                            📍 {reg.name} ({reg.code || reg.currency_code})
                                        </option>
                                    ))}
                                    {adminRegions.length === 0 && (
                                        <option value="all">{isRTL ? 'جاري التحميل...' : 'Loading Territories...'}</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Interactive Quick Municipality Pills for Rapid Territory Governance */}
                        {adminRegions.length > 1 && (
                            <div className="municipality-pills-row">
                                <button
                                    type="button"
                                    className={`muni-pill ${selectedTerritoryId === 'all' ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedTerritoryId('all');
                                        localStorage.setItem('perfumehub_admin_active_territory', 'all');
                                    }}
                                >
                                    {isRTL ? 'الكل' : 'All'}
                                </button>
                                {adminRegions.slice(0, 5).map(reg => (
                                    <button
                                        key={reg.id}
                                        type="button"
                                        className={`muni-pill ${String(selectedTerritoryId) === String(reg.id) ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedTerritoryId(String(reg.id));
                                            localStorage.setItem('perfumehub_admin_active_territory', String(reg.id));
                                        }}
                                    >
                                        {reg.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
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
                </header>

                <div className="main-content-wrapper">
                    {activeTab === 'shops' && <ShopsManager isRTL={isRTL} activeTerritoryId={selectedTerritoryId} adminRegions={adminRegions} />}
                    {activeTab === 'products' && <ProductManager isRTL={isRTL} activeTerritoryId={selectedTerritoryId} adminRegions={adminRegions} />}
                    {activeTab === 'orders' && <OrderManager isRTL={isRTL} activeTerritoryId={selectedTerritoryId} adminRegions={adminRegions} />}
                    {activeTab === 'reservations' && <ReservationManager isRTL={isRTL} activeTerritoryId={selectedTerritoryId} adminRegions={adminRegions} />}
                    {activeTab === 'discovery' && <DiscoveryManager isRTL={isRTL} activeTerritoryId={selectedTerritoryId} adminRegions={adminRegions} />}
                    {isSuperAdmin && activeTab === 'coupons' && <CouponsManager isRTL={isRTL} />}
                    {isSuperAdmin && activeTab === 'customers' && <CustomersManager isRTL={isRTL} />}
                    {activeTab === 'reports' && <ReportsManager isRTL={isRTL} activeTerritoryId={selectedTerritoryId} adminRegions={adminRegions} />}
                    {isSuperAdmin && activeTab === 'regions' && <RegionsManager isRTL={isRTL} />}
                    {isSuperAdmin && activeTab === 'banners' && <BannersManager isRTL={isRTL} />}
                    {activeTab === 'devices' && <DeviceManager isRTL={isRTL} />}
                    {isSuperAdmin && activeTab === 'payouts' && <PayoutsManager isRTL={isRTL} />}
                    {isSuperAdmin && activeTab === 'algorithm' && <RecommendationLab isRTL={isRTL} />}
                    {isSuperAdmin && activeTab === 'subscriptions' && <SubscriptionManager isRTL={isRTL} />}
                    {isSuperAdmin && activeTab === 'audit' && <AuditLogsManager isRTL={isRTL} />}
                    {isSuperAdmin && activeTab === 'recovery' && <ArchiveManager isRTL={isRTL} />}
                    {activeTab === 'settings' && <SettingsManager isRTL={isRTL} user={user} />}
                </div>
            </main>
        </div>
    );
};

export default Admin;
