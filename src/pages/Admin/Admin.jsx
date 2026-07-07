import React, { useState } from 'react';
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
import { 
    LayoutDashboard, ShoppingCart, Ticket, 
    Users, Store, BarChart2, DatabaseBackup, Globe, Home,
    Sparkles, Sliders, Package, Bell
} from 'lucide-react';
import DiscoveryManager from '../../components/Admin/DiscoveryManager';
import RecommendationLab from '../../components/Admin/RecommendationLab';
import { Link } from 'react-router-dom';
import './Admin.css';

const Admin = () => {
    const { isRTL, user } = useOutletContext();
    const [activeTab, setActiveTab] = useState('shops');
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    // Assume user object contains the role from context. 
    // Fallback to 'super_admin' or 'admin' for demo purposes if strictly not set.
    const role = user?.role || 'super_admin'; 

    const isSuperAdmin = role === 'super_admin' || role === 'admin';
    const isRegionalAdmin = role === 'regional_admin';

    // Protect Route
    if (!isSuperAdmin && !isRegionalAdmin) {
        return <Navigate to="/" replace />;
    }

    const tabs = [
        { id: 'shops', label: isRTL ? 'المتاجر' : 'Shops', icon: <Store size={20} /> },
        { id: 'products', label: isRTL ? 'المنتجات' : 'Products', icon: <Package size={20} /> },
        { id: 'orders', label: isRTL ? 'إدارة الطلبات' : 'Orders', icon: <ShoppingCart size={20} /> },
        // Regional admins might not control global coupons or recovery
        ...(isSuperAdmin ? [{ id: 'coupons', label: isRTL ? 'الكوبونات' : 'Coupons', icon: <Ticket size={20} /> }] : []),
        { id: 'customers', label: isRTL ? 'العملاء' : 'Customers', icon: <Users size={20} /> },
        { id: 'reports', label: isRTL ? 'التقارير' : 'Reports', icon: <BarChart2 size={20} /> },
        ...(isSuperAdmin ? [
            { id: 'discovery', label: isRTL ? 'الاكتشاف' : 'Discovery', icon: <Sparkles size={20} /> },
            { id: 'algorithm', label: isRTL ? 'مختبر الخوارزميات' : 'Algo Lab', icon: <Sliders size={20} /> },
            { id: 'regions', label: isRTL ? 'المناطق' : 'Regions', icon: <Globe size={20} /> },
            { id: 'subscriptions', label: isRTL ? 'الاشتراكات' : 'Subscriptions', icon: <Ticket size={20} /> },
            { id: 'recovery', label: isRTL ? 'الاسترداد' : 'Recovery', icon: <DatabaseBackup size={20} /> }
        ] : []),
    ];

    return (
        <div className={`admin-dashboard ${isRTL ? 'rtl' : 'ltr'}`}>
            {/* Sidebar Navigation */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <h2>{isRTL ? 'لوحة القيادة' : 'Dashboard'}</h2>
                    <span className="role-badge">
                        {user?.name || (isSuperAdmin ? 'Super Admin' : 'Regional Admin')}
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
                <header className="main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                    <h1>
                        {tabs.find(t => t.id === activeTab)?.label}
                    </h1>
                    
                    {/* Admin Panel Notification Dropdown */}
                    <div className="admin-notifications-container" style={{ position: 'relative' }}>
                        <button 
                            className="icon-btn notification-btn"
                            style={{ 
                                background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                padding: '10px', 
                                borderRadius: '12px', 
                                color: '#f8fafc',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                transition: 'all 0.2s',
                                outline: 'none'
                            }}
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            title={isRTL ? 'التنبيهات' : 'Notifications'}
                        >
                            <Bell size={20} />
                            <span style={{ 
                                position: 'absolute', 
                                top: '-2px', 
                                right: '-2px', 
                                background: '#c8a951', 
                                color: '#000', 
                                fontSize: '10px', 
                                fontWeight: 'bold', 
                                width: '16px', 
                                height: '16px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                boxShadow: '0 0 8px #c8a951'
                            }}>
                                1
                            </span>
                        </button>
                        
                        {isNotificationOpen && (
                            <div className="admin-notification-dropdown" style={{
                                position: 'absolute',
                                right: isRTL ? 'auto' : '0',
                                left: isRTL ? '0' : 'auto',
                                top: '50px',
                                width: '320px',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '16px',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                zIndex: 1000,
                                padding: '16px'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#c8a951', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', fontFamily: 'Inter, sans-serif' }}>
                                    {isRTL ? 'تنبيهات النظام' : 'System Notifications'}
                                </h4>
                                <div className="notification-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div className="notification-item" style={{
                                        background: 'rgba(200, 169, 81, 0.05)',
                                        borderLeft: isRTL ? 'none' : '3px solid #c8a951',
                                        borderRight: isRTL ? '3px solid #c8a951' : 'none',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        textAlign: isRTL ? 'right' : 'left'
                                    }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#f8fafc' }}>
                                            {isRTL ? 'استعادة قاعدة البيانات' : 'Database Restoration'}
                                        </div>
                                        <div style={{ color: '#94a3b8', fontSize: '11px', lineHeight: '1.4' }}>
                                            DATABASE RESTORATION v1.0.2 - 167 PRODUCTS SYNCED
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <div className="main-content-wrapper">
                    {activeTab === 'products' && <ProductManager isRTL={isRTL} />}
                    {activeTab === 'orders' && <OrderManager isRTL={isRTL} />}
                    {activeTab === 'coupons' && <CouponsManager isRTL={isRTL} />}
                    {activeTab === 'customers' && <CustomersManager isRTL={isRTL} />}
                    {activeTab === 'shops' && <ShopsManager isRTL={isRTL} />}
                    {activeTab === 'reports' && <ReportsManager isRTL={isRTL} />}
                    {activeTab === 'discovery' && <DiscoveryManager isRTL={isRTL} />}
                    {activeTab === 'algorithm' && <RecommendationLab isRTL={isRTL} />}
                    {activeTab === 'regions' && <RegionsManager isRTL={isRTL} />}
                    {activeTab === 'subscriptions' && <SubscriptionManager isRTL={isRTL} />}
                    {activeTab === 'recovery' && <ArchiveManager isRTL={isRTL} />}
                </div>
            </main>
        </div>
    );
};

export default Admin;
