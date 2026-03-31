import React, { useState } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import ProductManager from '../../components/Admin/ProductManager';
import OrderManager from '../../components/Admin/OrderManager';
import CouponsManager from '../../components/Admin/CouponsManager';
import CustomersManager from '../../components/Admin/CustomersManager';
import ReportsManager from '../../components/Admin/ReportsManager';
import ArchiveManager from '../../components/Admin/ArchiveManager';
import ShopsManager from '../../components/Admin/ShopsManager';
import './Admin.css';

const Admin = () => {
    const { isRTL } = useOutletContext();
    const [activeTab, setActiveTab] = useState('products');

    return (
        <div className="admin-page">
            <div className="admin-header text-center">
                <div className="container">
                    <h1>{isRTL ? 'لوحة تحكم الإدارة' : 'Admin Dashboard'}</h1>
                    <p className="admin-subtitle">
                        {isRTL
                            ? 'إدارة المنتجات والطلبات بسهولة.'
                            : 'Manage your products and orders with ease.'}
                    </p>
                </div>
            </div>

            <div className="container section admin-container">
                <div className="admin-sidebar text-center" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                    <button
                        className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
                        onClick={() => setActiveTab('products')}
                    >
                        {isRTL ? 'إدارة المنتجات' : 'Products'}
                    </button>
                    <button
                        className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                        onClick={() => setActiveTab('orders')}
                    >
                        {isRTL ? 'إدارة الطلبات' : 'Orders'}
                    </button>
                    <button
                        className={`admin-tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
                        onClick={() => setActiveTab('coupons')}
                    >
                        {isRTL ? 'الكوبونات' : 'Coupons'}
                    </button>
                    <button
                        className={`admin-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('customers')}
                    >
                        {isRTL ? 'العملاء' : 'Customers'}
                    </button>
                    <button
                        className={`admin-tab-btn ${activeTab === 'shops' ? 'active' : ''}`}
                        onClick={() => setActiveTab('shops')}
                    >
                        {isRTL ? 'المتاجر' : 'Shops'}
                    </button>
                    <button
                        className={`admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reports')}
                    >
                        {isRTL ? 'التقارير' : 'Reports'}
                    </button>
                    <button
                        className={`admin-tab-btn ${activeTab === 'recovery' ? 'active' : ''}`}
                        onClick={() => setActiveTab('recovery')}
                        style={{ borderLeft: isRTL ? 'none' : '2px solid rgba(200,169,81,0.3)', borderRight: isRTL ? '2px solid rgba(200,169,81,0.3)' : 'none', marginLeft: isRTL ? '0' : '10px', marginRight: isRTL ? '10px' : '0' }}
                    >
                        {isRTL ? 'الاسترداد' : 'Recovery'}
                    </button>
                </div>

                <div className="admin-content">
                    {activeTab === 'products' && <ProductManager isRTL={isRTL} />}
                    {activeTab === 'orders' && <OrderManager isRTL={isRTL} />}
                    {activeTab === 'coupons' && <CouponsManager isRTL={isRTL} />}
                    {activeTab === 'customers' && <CustomersManager isRTL={isRTL} />}
                    {activeTab === 'shops' && <ShopsManager isRTL={isRTL} />}
                    {activeTab === 'reports' && <ReportsManager isRTL={isRTL} />}
                    {activeTab === 'recovery' && <ArchiveManager isRTL={isRTL} />}
                </div>
            </div>
        </div>
    );
};

export default Admin;
