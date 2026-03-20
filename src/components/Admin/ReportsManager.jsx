import React, { useContext, useState } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { TrendingUp, DollarSign, ShoppingBag, Users, X, Activity, AlertCircle, Package, Search } from 'lucide-react';

const ReportsManager = ({ isRTL }) => {
    const { orders, products, updateProduct } = useContext(ShopContext);
    const [activeDrillDown, setActiveDrillDown] = useState(null);
    const [editingStock, setEditingStock] = useState({}); // { productId: value }
    const [stockSearchTerm, setStockSearchTerm] = useState('');

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;

    // Calculate total units sold
    const totalUnitsSold = orders.reduce((total, order) => {
        return total + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    // Today's Sales calculation
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(order => order.date === today);
    const todaySales = todayOrders.length;
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);

    const outOfStockList = products.filter(p => p.stock === 0);
    const outOfStockProducts = outOfStockList.length;

    // For demo purposes, we'll assume 4 registered customers as per CustomersManager
    const totalCustomers = 4;

    const lowStockList = products.filter(p => p.stock !== undefined && p.stock < 20);
    const lowStockProducts = lowStockList.length;
    const totalProductsListing = products.length;

    // Date helper for filtering orders
    const getOrdersInLastDays = (days) => {
        const threshold = new Date(Date.now() - days * 86400000);
        return orders.filter(order => new Date(order.date) >= threshold);
    };

    const orders30Days = getOrdersInLastDays(30);
    const orders7Days = getOrdersInLastDays(7);

    // Calculate sales statistics for a given set of orders
    const getProductSales = (orderList) => {
        let sales = {};
        orderList.forEach(order => {
            order.items.forEach(item => {
                if (sales[item.name]) {
                    sales[item.name] += item.quantity;
                } else {
                    sales[item.name] = item.quantity;
                }
            });
        });
        return Object.entries(sales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    };

    const bestSelling30Days = getProductSales(orders30Days);
    const trending7Days = getProductSales(orders7Days);

    // Recent orders for the activity feed
    const recentOrders = [...orders].reverse().slice(0, 5);

    return (
        <div className="manager-content animate-fade-in">
            <div className="manager-header">
                <h2>{isRTL ? 'تقارير المبيعات' : 'Sales Reports'}</h2>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div
                    onClick={() => setActiveDrillDown('revenue')}
                    style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: 'var(--shadow-sm)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#e6f7ff', color: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>{isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em' }}>{totalRevenue} {isRTL ? 'ر.ق' : 'QAR'}</h3>
                    </div>
                </div>

                <div
                    onClick={() => setActiveDrillDown('orders')}
                    style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: 'var(--shadow-sm)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#fff0f6', color: '#eb2f96', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>{isRTL ? 'إجمالي الطلبات' : 'Total Orders'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em' }}>{totalOrders}</h3>
                    </div>
                </div>

                <div
                    onClick={() => setActiveDrillDown('customers')}
                    style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: 'var(--shadow-sm)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#f6ffed', color: '#52c41a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>{isRTL ? 'العملاء' : 'Total Customers'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em' }}>{totalCustomers}</h3>
                    </div>
                </div>

                <div
                    onClick={() => setActiveDrillDown('low-stock')}
                    style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: 'var(--shadow-sm)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#fff2e8', color: '#fa541c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>{isRTL ? 'منتجات منخفضة المخزون' : 'Low Stock Items (<20)'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em' }}>{lowStockProducts}</h3>
                    </div>
                </div>

                <div
                    onClick={() => setActiveDrillDown('today-sales')}
                    style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: 'var(--shadow-sm)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#fffbe6', color: '#faad14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>{isRTL ? 'مبيعات اليوم' : "Today's Sales"}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em' }}>{todaySales} ({todayRevenue} QAR)</h3>
                    </div>
                </div>

                <div
                    onClick={() => setActiveDrillDown('out-of-stock')}
                    style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: 'var(--shadow-sm)' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#fff1f0', color: '#f5222d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>{isRTL ? 'منتجات غير متوفرة' : 'Out of Stock'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em' }}>{outOfStockProducts}</h3>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#f9f0ff', color: '#722ed1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>{isRTL ? 'إجمالي المنتجات المدرجة' : 'Total Products Listed'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em' }}>{totalProductsListing}</h3>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#e6fffb', color: '#13c2c2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>{isRTL ? 'إجمالي المنتجات المباعة' : 'Total Products Sold'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: '1.5em' }}>{totalUnitsSold}</h3>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '30px' }}>
                {/* Best Selling (30 Days) */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
                    <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{isRTL ? 'الأكثر مبيعاً (30 يوم)' : 'Best Selling (30 Days)'}</span>
                        <span style={{ fontSize: '0.7em', color: '#888', fontWeight: 'normal' }}>{isRTL ? 'آخر 30 يوم' : 'Last 30 days'}</span>
                    </h3>
                    {bestSelling30Days.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {bestSelling30Days.map(([name, qty], index) => (
                                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
                                    <span style={{ fontSize: '0.95em' }}><strong>{index + 1}.</strong> {name}</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--color-gold)' }}>{qty} {isRTL ? 'وحدة' : 'units'}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: '#888' }}>{isRTL ? 'لا توجد بيانات متاحة' : 'No sales data for this period'}</p>
                    )}
                </div>

                {/* Trending (7 Days) */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
                    <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#eb2f96' }}>{isRTL ? 'المنتجات الرائجة (7 أيام)' : 'Trending (7 Days)'}</span>
                        <span style={{ fontSize: '0.7em', color: '#888', fontWeight: 'normal' }}>{isRTL ? 'آخر 7 أيام' : 'Last 7 days'}</span>
                    </h3>
                    {trending7Days.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {trending7Days.map(([name, qty], index) => (
                                <li key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
                                    <span style={{ fontSize: '0.95em' }}><strong>{index + 1}.</strong> {name}</span>
                                    <span style={{ fontWeight: 'bold', color: '#eb2f96' }}>{qty} {isRTL ? 'وحدة' : 'units'}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: '#888' }}>{isRTL ? 'لا توجد بيانات متاحة' : 'No recent trends'}</p>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                {/* Recent Activity */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
                    <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        {isRTL ? 'أحدث الطلبات' : 'Recent Orders'}
                    </h3>
                    {recentOrders.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {recentOrders.map((order, index) => (
                                <li key={index} style={{ marginBottom: '15px', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <strong>{order.id}</strong>
                                        <span style={{ color: '#888', fontSize: '0.9em' }}>{order.date}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95em', color: '#555' }}>
                                        <span>{order.customerName}</span>
                                        <span style={{ fontWeight: 'bold' }}>{order.total} QAR</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: '#888' }}>{isRTL ? 'لا توجد طلبات حديثة' : 'No recent orders'}</p>
                    )}
                </div>

            </div>

            {/* Drill-down Modal */}
            {activeDrillDown && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setActiveDrillDown(null)}>
                    <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '600px', maxHeight: '80vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>
                                {activeDrillDown === 'revenue' && (isRTL ? 'تفاصيل الإيرادات' : 'Revenue Details')}
                                {activeDrillDown === 'orders' && (isRTL ? 'قائمة الطلبات' : 'Order List')}
                                {activeDrillDown === 'today-sales' && (isRTL ? 'مبيعات اليوم' : "Today's Orders")}
                                {activeDrillDown === 'customers' && (isRTL ? 'قائمة العملاء' : 'Customer List')}
                                {activeDrillDown === 'low-stock' && (isRTL ? 'منتجات منخفضة المخزون' : 'Low Stock Items')}
                                {activeDrillDown === 'out-of-stock' && (isRTL ? 'منتجات غير متوفرة' : 'Out of Stock Items')}
                            </h3>
                            <button onClick={() => { setActiveDrillDown(null); setStockSearchTerm(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        {/* Search Bar for Stock Modals */}
                        {(activeDrillDown === 'low-stock' || activeDrillDown === 'out-of-stock') && (
                            <div style={{ padding: '15px 20px', backgroundColor: '#fafafa', borderBottom: '1px solid #eee' }}>
                                <div className="admin-search-container" style={{ maxWidth: '100%' }}>
                                    <input 
                                        type="text" 
                                        className="form-control admin-search-input"
                                        placeholder={isRTL ? 'ابحث بالاسم أو الماركة...' : 'Search by name or brand...'} 
                                        value={stockSearchTerm}
                                        onChange={(e) => setStockSearchTerm(e.target.value)}
                                        style={{ height: '40px' }}
                                    />
                                    <div className="admin-search-icon">
                                        <Search size={18} />
                                    </div>
                                    {stockSearchTerm && (
                                        <button 
                                            onClick={() => setStockSearchTerm('')}
                                            style={{ position: 'absolute', right: isRTL ? 'auto' : '10px', left: isRTL ? '10px' : 'auto', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', zIndex: 5 }}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ padding: '20px', overflowY: 'auto' }}>
                            {activeDrillDown === 'revenue' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: isRTL ? 'right' : 'left', borderBottom: '2px solid #eee' }}>
                                            <th style={{ padding: '10px' }}>{isRTL ? 'الطلب' : 'Order'}</th>
                                            <th style={{ padding: '10px' }}>{isRTL ? 'التاريخ' : 'Date'}</th>
                                            <th style={{ padding: '10px' }}>{isRTL ? 'المبلغ' : 'Amount'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(order => (
                                            <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '10px' }}>{order.id}</td>
                                                <td style={{ padding: '10px' }}>{order.date}</td>
                                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{order.total} QAR</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {activeDrillDown === 'orders' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {orders.map(order => (
                                        <div key={order.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <strong>{order.id}</strong>
                                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em', backgroundColor: order.status === 'Processing' ? '#e6f7ff' : '#f6ffed', color: order.status === 'Processing' ? '#1890ff' : '#52c41a' }}>{order.status}</span>
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#666' }}>{order.customerName} • {order.date}</div>
                                            <div style={{ marginTop: '5px', fontWeight: 'bold' }}>{order.total} QAR</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeDrillDown === 'today-sales' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {todayOrders.length > 0 ? (
                                        todayOrders.map(order => (
                                            <div key={order.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <strong>{order.id}</strong>
                                                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em', backgroundColor: '#e6f7ff', color: '#1890ff' }}>{order.status}</span>
                                                </div>
                                                <div style={{ fontSize: '0.9em', color: '#666' }}>{order.customerName} • {order.date}</div>
                                                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>{order.total} QAR</div>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#888' }}>{isRTL ? 'لا توجد طلبات اليوم حتى الآن' : 'No orders placed today yet.'}</p>
                                    )}
                                </div>
                            )}
                            {activeDrillDown === 'customers' && (
                                <div>
                                    <p style={{ color: '#666', marginBottom: '15px' }}>{isRTL ? 'قائمة العملاء المسجلين حالياً' : 'List of currently registered customers'}</p>
                                    {[
                                        { name: 'John Doe', email: 'john@example.com', orders: 2 },
                                        { name: 'Jane Smith', email: 'jane@example.com', orders: 1 },
                                        { name: 'Ahmed Ali', email: 'ahmed@example.com', orders: 0 },
                                        { name: 'Sara Khan', email: 'sara@example.com', orders: 1 }
                                    ].map((customer, idx) => (
                                        <div key={idx} style={{ padding: '12px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{customer.name}</div>
                                                <div style={{ fontSize: '0.85em', color: '#666' }}>{customer.email}</div>
                                            </div>
                                            <div style={{ fontSize: '0.9em' }}>{customer.orders} {isRTL ? 'طلبات' : 'orders'}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                             {activeDrillDown === 'low-stock' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {lowStockList
                                        .filter(p => 
                                            p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) || 
                                            p.brand.toLowerCase().includes(stockSearchTerm.toLowerCase())
                                        ).length > 0 ? (
                                        lowStockList
                                            .filter(p => 
                                                p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) || 
                                                p.brand.toLowerCase().includes(stockSearchTerm.toLowerCase())
                                            )
                                            .map(product => (
                                                <div key={product.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold' }}>{product.name}</div>
                                                    <div style={{ fontSize: '0.85em', color: '#666' }}>{product.brand}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{ fontSize: '0.75em', color: '#888', marginBottom: '2px' }}>{isRTL ? 'المخزون الحالي' : 'Current Stock'}</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editingStock[product.id] !== undefined ? editingStock[product.id] : product.stock}
                                                            onChange={(e) => setEditingStock({ ...editingStock, [product.id]: parseInt(e.target.value) })}
                                                            style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center' }}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newStock = editingStock[product.id] !== undefined ? editingStock[product.id] : product.stock;
                                                            updateProduct(product.id, { ...product, stock: newStock });
                                                            // Clear edit state for this product
                                                            const newEditingStock = { ...editingStock };
                                                            delete newEditingStock[product.id];
                                                            setEditingStock(newEditingStock);
                                                        }}
                                                        style={{ backgroundColor: 'var(--color-gold)', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em', height: 'fit-content', marginTop: '18px' }}
                                                    >
                                                        {isRTL ? 'تحديث' : 'Update'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#888' }}>
                                            {stockSearchTerm 
                                                ? (isRTL ? 'لم يتم العثور على منتجات تطابق بحثك' : 'No products found matching your search')
                                                : (isRTL ? 'كل المنتجات مخزنة جيداً كلاً' : 'All products are well stocked')}
                                        </p>
                                    )}
                                </div>
                            )}
                             {activeDrillDown === 'out-of-stock' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {outOfStockList
                                        .filter(p => 
                                            p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) || 
                                            p.brand.toLowerCase().includes(stockSearchTerm.toLowerCase())
                                        ).length > 0 ? (
                                        outOfStockList
                                            .filter(p => 
                                                p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) || 
                                                p.brand.toLowerCase().includes(stockSearchTerm.toLowerCase())
                                            )
                                            .map(product => (
                                                <div key={product.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold' }}>{product.name}</div>
                                                    <div style={{ fontSize: '0.85em', color: '#666' }}>{product.brand}</div>
                                                    <div style={{ color: '#f5222d', fontSize: '0.8em', marginTop: '4px' }}>{isRTL ? 'غير متوفر' : 'Sold Out'}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{ fontSize: '0.75em', color: '#888', marginBottom: '2px' }}>{isRTL ? 'تحديث المخزون' : 'Update Stock'}</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            placeholder="0"
                                                            value={editingStock[product.id] !== undefined ? editingStock[product.id] : ''}
                                                            onChange={(e) => setEditingStock({ ...editingStock, [product.id]: parseInt(e.target.value) })}
                                                            style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center' }}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newStock = editingStock[product.id];
                                                            if (newStock > 0) {
                                                                updateProduct(product.id, { ...product, stock: newStock });
                                                                const newEditingStock = { ...editingStock };
                                                                delete newEditingStock[product.id];
                                                                setEditingStock(newEditingStock);
                                                            }
                                                        }}
                                                        disabled={!editingStock[product.id] || editingStock[product.id] <= 0}
                                                        style={{ 
                                                            backgroundColor: editingStock[product.id] > 0 ? 'var(--color-gold)' : '#ccc', 
                                                            color: '#fff', 
                                                            border: 'none', 
                                                            padding: '8px 12px', 
                                                            borderRadius: '4px', 
                                                            cursor: editingStock[product.id] > 0 ? 'pointer' : 'not-allowed', 
                                                            fontSize: '0.85em', 
                                                            height: 'fit-content', 
                                                            marginTop: '18px' 
                                                        }}
                                                    >
                                                        {isRTL ? 'إضافة' : 'Restock'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#888' }}>
                                            {stockSearchTerm 
                                                ? (isRTL ? 'لم يتم العثور على منتجات تطابق بحثك' : 'No products found matching your search')
                                                : (isRTL ? 'جميع المنتجات متوفرة حالياً' : 'All products are currently in stock.')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsManager;
