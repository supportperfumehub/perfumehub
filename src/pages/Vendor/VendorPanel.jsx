import React, { useState, useContext } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ProductManager from '../../components/Admin/ProductManager';
import OrderManager from '../../components/Admin/OrderManager';
import { Store, Package, Target } from 'lucide-react';

const VendorPanel = () => {
    const { isRTL } = useOutletContext();
    const { user, isVendor } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('products');

    // If somehow landed here without vendor role
    if (!isVendor && user?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    const shopId = user?.shop_id;

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
                </div>

                <div className="admin-content">
                    {activeTab === 'products' && <ProductManager isRTL={isRTL} shopId={shopId} />}
                    {activeTab === 'orders' && <OrderManager isRTL={isRTL} shopId={shopId} />}
                </div>
            </div>
        </div>
    );
};

export default VendorPanel;
