import React, { useContext, useState, useMemo } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { Search, ChevronDown, ChevronUp, User, Package as PackageIcon, Clock, CheckCircle, Truck, Phone, Mail, MapPin } from 'lucide-react';

const OrderManager = ({ isRTL, shopId }) => {
    const { orders, updateOrderStatus } = useContext(ShopContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [expandedCustomers, setExpandedCustomers] = useState({});
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Helper: Status Translation & Styling ──
    const getStatusClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'status-pending';
            case 'processing': return 'status-processing';
            case 'shipped': return 'status-shipped';
            case 'delivered': return 'status-delivered';
            case 'cancelled': return 'status-cancelled';
            default: return '';
        }
    };

    const translateStatus = (status) => {
        if (!isRTL) return status;
        switch (status?.toLowerCase()) {
            case 'pending': return 'قيد الانتظار';
            case 'processing': return 'قيد المعالجة';
            case 'shipped': return 'تم الشحن';
            case 'delivered': return 'تم التوصيل';
            case 'cancelled': return 'ملغى';
            default: return status;
        }
    };

    // ── Grouping, Filtering & Sorting Logic ──
    const groupedOrders = useMemo(() => {
        // 0. If shopId is provided (vendor view), filter orders to only those containing this shop's products
        let relevantOrders = orders;
        if (shopId) {
            relevantOrders = orders.filter(order => {
                // Check shop_ids array on the order
                if (order.shop_ids && Array.isArray(order.shop_ids) && order.shop_ids.includes(shopId)) {
                    return true;
                }
                // Fallback: check individual items for shop_id match
                if (order.items && Array.isArray(order.items)) {
                    return order.items.some(item => 
                        item.shop_id === shopId || (item.product && item.product.shop_id === shopId)
                    );
                }
                return false;
            });
        }

        // 1. Filter by status and search term
        const filtered = relevantOrders.filter(order => {
            const matchesStatus = statusFilter === 'All' || order.status.toLowerCase() === statusFilter.toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                order.customerName?.toLowerCase().includes(searchLower) ||
                order.email?.toLowerCase().includes(searchLower) ||
                order.phone?.toLowerCase().includes(searchLower) ||
                order.id.toString().toLowerCase().includes(searchLower);
            
            return matchesStatus && matchesSearch;
        });

        // 2. Sorting: Priority by status, then by date (newest first)
        const statusPriority = {
            'pending': 1,
            'processing': 2,
            'shipped': 3,
            'delivered': 4,
            'cancelled': 5
        };

        const sorted = [...filtered].sort((a, b) => {
            const priorityA = statusPriority[a.status.toLowerCase()] || 99;
            const priorityB = statusPriority[b.status.toLowerCase()] || 99;

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
        });

        // 3. Group by customer unique identifier (email, otherwise name)
        const groups = {};
        sorted.forEach(order => {
            const key = order.email?.toLowerCase() || order.customerName?.toLowerCase() || 'guest';
            if (!groups[key]) {
                groups[key] = {
                    customerName: order.customerName,
                    email: order.email,
                    phone: order.phone,
                    orders: []
                };
            }
            groups[key].orders.push(order);
        });

        return Object.values(groups);
    }, [orders, statusFilter, searchTerm, shopId]);

    const toggleCustomerExpand = (email) => {
        setExpandedCustomers(prev => ({ ...prev, [email]: !prev[email] }));
    };

    const handleStatusUpdate = (orderId, e) => {
        updateOrderStatus(orderId, e.target.value);
    };

    return (
        <div className="manager-content">
            <div className="manager-header stack-mobile">
                <div className="header-title-container">
                    <h2 style={{ margin: 0 }}>{isRTL ? 'إدارة الطلبات المتقدمة' : 'Advanced Order Management'}</h2>
                </div>

                {/* ── Search & Filter Bar ── */}
                <div className="admin-order-controls">
                    <div className="admin-search-container">
                        <input 
                            type="text" 
                            className="form-control admin-search-input" 
                            placeholder={isRTL ? 'بحث بالاسم، الإيميل أو رقم الطلب...' : 'Search by name, email or order ID...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="admin-search-icon">
                            <Search size={18} />
                        </div>
                    </div>

                    <div className="filter-group">
                        {['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(status => (
                            <button 
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`filter-pill ${statusFilter === status ? 'active' : ''}`}
                            >
                                {translateStatus(status)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="table-responsive">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ width: isRTL ? 'auto' : '30%' }}>{isRTL ? 'العميل' : 'Customer'}</th>
                            <th>{isRTL ? 'الطلبات' : 'Orders'}</th>
                            <th>{isRTL ? 'الإجمالي' : 'Total'}</th>
                            <th className="hide-mobile">{isRTL ? 'آخر حالة' : 'Latest Status'}</th>
                            <th style={{ textAlign: 'center' }}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedOrders.map((group, groupIdx) => {
                            const customerKey = group.email || group.customerName;
                            const isExpanded = expandedCustomers[customerKey];
                            const totalSpent = group.orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
                            const latestOrder = group.orders[0];

                            return (
                                <React.Fragment key={groupIdx}>
                                    <tr style={{ background: isExpanded ? 'rgba(255, 255, 255, 0.05)' : 'transparent', fontWeight: '500' }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ background: '#334155', padding: '8px', borderRadius: '50%', color: '#cbd5e1' }}>
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{group.customerName}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{group.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{group.orders.length} {isRTL ? 'طلبات' : 'Orders'}</td>
                                        <td><strong>{totalSpent.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}</strong></td>
                                        <td className="hide-mobile">
                                            <span className={`status-badge ${getStatusClass(latestOrder.status)}`}>
                                                {translateStatus(latestOrder.status)}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '10px 5px' }}>
                                            <button 
                                                className="admin-action-btn edit-btn" 
                                                onClick={() => toggleCustomerExpand(customerKey)}
                                                style={{ width: 'auto', padding: '0 12px', fontSize: '0.85rem' }}
                                            >
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                <span style={{ marginLeft: isRTL ? '0' : '5px', marginRight: isRTL ? '5px' : '0' }}>{isExpanded ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض' : 'View')}</span>
                                            </button>
                                        </td>
                                    </tr>
                                    
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '0 0 20px 0' }}>
                                                <div style={{ 
                                                    margin: isMobile ? '10px 10px' : '10px 40px', 
                                                    padding: '20px', 
                                                    background: '#151f33', 
                                                    borderRadius: '12px',
                                                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)',
                                                    border: '1px solid #334155'
                                                }}>
                                                    {group.orders.map((order, idx) => (
                                                        <div key={order.id} style={{ 
                                                            padding: '15px', 
                                                            borderBottom: idx === group.orders.length - 1 ? 'none' : '1px solid #f0f0f0',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '15px'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                                                        <PackageIcon size={16} color="#c8a951" />
                                                                        <strong style={{ fontSize: '1.1rem', color: '#f8fafc' }}>{order.id}</strong>
                                                                        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>• {order.date}</span>
                                                                    </div>
                                                                    <div style={{ fontSize: '0.9rem', color: '#cbd5e1', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                                                        {order.phone && <span><Phone size={12} /> {order.phone}</span>}
                                                                        {order.shippingAddress && <span><MapPin size={12} /> {order.shippingAddress}</span>}
                                                                        {order.paymentMethod && <span><CheckCircle size={12} /> {order.paymentMethod}</span>}
                                                                    </div>
                                                                </div>
                                                                <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
                                                                    <div style={{ marginBottom: '10px' }}>
                                                                        <select 
                                                                            className="form-control"
                                                                            value={order.status}
                                                                            onChange={(e) => handleStatusUpdate(order.id, e)}
                                                                            style={{ width: 'auto', padding: '5px 10px', fontSize: '0.9rem' }}
                                                                        >
                                                                            <option value="Pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
                                                                            <option value="Processing">{isRTL ? 'قيد المعالجة' : 'Processing'}</option>
                                                                            <option value="Shipped">{isRTL ? 'تم الشحن' : 'Shipped'}</option>
                                                                            <option value="Delivered">{isRTL ? 'تم التوصيل' : 'Delivered'}</option>
                                                                            <option value="Cancelled">{isRTL ? 'إلغاء الطلب' : 'Cancel Order'}</option>
                                                                        </select>
                                                                    </div>
                                                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-gold)' }}>
                                                                        {order.total} {isRTL ? 'ر.ق' : 'QAR'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155' }}>
                                                                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                                                    {order.items?.map((item, iIdx) => (
                                                                        <li key={iIdx} style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#cbd5e1' }}>
                                                                            <span>{item.quantity}x {item.name} {item.isGiftWrapped && '🎁'}</span>
                                                                            <span style={{ fontWeight: '600', color: '#f8fafc' }}>{item.price} {isRTL ? 'ر.ق' : 'QAR'}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {groupedOrders.length === 0 && (
                            <tr>
                                <td colSpan="5" className="text-center" style={{ padding: '40px' }}>
                                    <div style={{ opacity: 0.5 }}>
                                        <PackageIcon size={48} style={{ marginBottom: '10px' }} />
                                        <div>{shopId 
                                            ? (isRTL ? 'لم تصل طلبات لمنتجات متجرك بعد' : 'No orders yet for your shop products')
                                            : (isRTL ? 'لم يتم العثور على طلبات مطابقة' : 'No matching orders found')}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OrderManager;
