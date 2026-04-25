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
    LayoutDashboard, Package, ShoppingCart, Ticket, 
    Users, Store, BarChart2, DatabaseBackup, Globe, Home,
    Sparkles, Sliders
} from 'lucide-react';
import DiscoveryManager from '../../components/Admin/DiscoveryManager';
import RecommendationLab from '../../components/Admin/RecommendationLab';
import { Link } from 'react-router-dom';
import './Admin.css';

const Admin = () => {
    const { isRTL, user } = useOutletContext();
    const [activeTab, setActiveTab] = useState('shops');

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
                        {isSuperAdmin ? 'Super Admin' : 'Regional Admin'}
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
                    <h1>
                        {tabs.find(t => t.id === activeTab)?.label}
                    </h1>
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
