import React, { useContext, useState, useMemo } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { Search, ChevronDown, ChevronUp, User, Package as PackageIcon, Clock, CheckCircle, Truck, Phone, Mail, MapPin, AlertCircle, Calendar } from 'lucide-react';

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
        const s = (status || '').toLowerCase();
        if (!isRTL) {
            switch (s) {
                case 'pending': return 'Pending';
                case 'processing': return 'Processing';
                case 'shipped': return 'Shipped';
                case 'delivered': return 'Delivered';
                case 'cancelled': return 'Cancelled';
                case 'reserved': return 'Reserved (Pickup)';
                default: return status || 'Unknown';
            }
        }
        switch (s) {
            case 'pending': return 'قيد الانتظار';
            case 'processing': return 'قيد المعالجة';
            case 'shipped': return 'تم الشحن';
            case 'delivered': return 'تم التوصيل';
            case 'cancelled': return 'ملغى';
            case 'reserved': return 'محجوز (استلام من الفرع)';
            default: return status || 'غير معروف';
        }
    };

    const formatOrderDate = (dateStr) => {
        if (!dateStr) return isRTL ? 'تاريخ غير محدد' : 'Date not available';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString(isRTL ? 'ar-QA' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ── Grouping, Filtering & Sorting Logic ──
    const groupedOrders = useMemo(() => {
        let relevantOrders = orders || [];
        if (shopId) {
            relevantOrders = relevantOrders.filter(order => {
                if (order.shop_ids && Array.isArray(order.shop_ids) && order.shop_ids.includes(shopId)) {
                    return true;
                }
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
            const currentStatus = (order.status || 'pending').toLowerCase();
            const matchesStatus = statusFilter === 'All' || currentStatus === statusFilter.toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            const custName = (order.customer_name || order.customerName || '').toLowerCase();
            const custEmail = (order.email || '').toLowerCase();
            const custPhone = (order.phone || '').toLowerCase();
            const orderIdStr = String(order.id || '').toLowerCase();

            const matchesSearch = 
                custName.includes(searchLower) ||
                custEmail.includes(searchLower) ||
                custPhone.includes(searchLower) ||
                orderIdStr.includes(searchLower);
            
            return matchesStatus && (searchTerm ? matchesSearch : true);
        });

        // 2. Sorting: Priority by status, then by date (newest first)
        const statusPriority = {
            'pending': 1,
            'processing': 2,
            'shipped': 3,
            'reserved': 3,
            'delivered': 4,
            'cancelled': 5
        };

        const sorted = [...filtered].sort((a, b) => {
            const priorityA = statusPriority[(a.status || '').toLowerCase()] || 99;
            const priorityB = statusPriority[(b.status || '').toLowerCase()] || 99;

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            const dateA = new Date(a.created_at || a.date || a.createdAt || 0);
            const dateB = new Date(b.created_at || b.date || b.createdAt || 0);
            return dateB - dateA;
        });

        // 3. Group by customer unique identifier (email, otherwise customer_name)
        const groups = {};
        sorted.forEach(order => {
            const resolvedName = order.customer_name || order.customerName || (order.email ? order.email.split('@')[0] : `Customer #${order.id}`);
            const resolvedEmail = order.email || (order.phone ? `Phone: ${order.phone}` : (isRTL ? 'زائر' : 'Guest Customer'));
            const resolvedPhone = order.phone || '';
            const key = (order.email || order.customer_name || order.customerName || `customer-${order.id}`).toLowerCase();

            if (!groups[key]) {
                groups[key] = {
                    key,
                    customerName: resolvedName,
                    email: resolvedEmail,
                    phone: resolvedPhone,
                    orders: []
                };
            }
            groups[key].orders.push(order);
        });

        return Object.values(groups);
    }, [orders, statusFilter, searchTerm, shopId, isRTL]);

    const toggleCustomerExpand = (key) => {
        setExpandedCustomers(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleStatusUpdate = (orderId, e) => {
        updateOrderStatus(orderId, e.target.value);
    };

    return (
        <div className="manager-content">
            <div className="manager-header stack-mobile" style={{ marginBottom: '24px' }}>
                <div className="header-title-container">
                    <h2 style={{ margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PackageIcon size={26} color="#c8a951" />
                        {isRTL ? 'إدارة الطلبات المتقدمة' : 'Advanced Order Management'}
                    </h2>
                </div>

                {/* ── Search & Filter Bar ── */}
                <div className="admin-order-controls" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="admin-search-container" style={{ minWidth: '260px' }}>
                        <input 
                            type="text" 
                            className="form-control admin-search-input" 
                            placeholder={isRTL ? 'بحث بالاسم، الإيميل أو رقم الطلب...' : 'Search by name, email or order ID...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="admin-search-icon">
                            <Search size={18} color="#94a3b8" />
                        </div>
                    </div>

                    <div className="filter-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(status => {
                            const isActive = statusFilter.toLowerCase() === status.toLowerCase();
                            return (
                                <button 
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    style={{
                                        padding: '7px 16px',
                                        fontSize: '0.82rem',
                                        borderRadius: '999px',
                                        border: isActive ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.18)',
                                        background: isActive ? 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)' : 'rgba(255, 255, 255, 0.06)',
                                        color: isActive ? '#000000' : '#f8fafc',
                                        fontWeight: isActive ? '800' : '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        boxShadow: isActive ? '0 2px 10px rgba(200, 169, 81, 0.4)' : 'none'
                                    }}
                                >
                                    {translateStatus(status)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="table-responsive" style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid rgba(51, 65, 85, 0.8)', overflow: 'hidden' }}>
                <table className="admin-table" style={{ margin: 0 }}>
                    <thead>
                        <tr>
                            <th style={{ width: isRTL ? 'auto' : '32%' }}>{isRTL ? 'العميل' : 'Customer'}</th>
                            <th>{isRTL ? 'الطلبات' : 'Orders'}</th>
                            <th>{isRTL ? 'الإجمالي' : 'Total'}</th>
                            <th className="hide-mobile">{isRTL ? 'آخر حالة' : 'Latest Status'}</th>
                            <th style={{ textAlign: 'center' }}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedOrders.map((group, groupIdx) => {
                            const isExpanded = expandedCustomers[group.key];
                            const totalSpent = group.orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
                            const latestOrder = group.orders[0];

                            return (
                                <React.Fragment key={group.key || groupIdx}>
                                    <tr style={{ background: isExpanded ? 'rgba(200, 169, 81, 0.05)' : 'transparent', fontWeight: '500', transition: 'background 0.2s ease' }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ 
                                                    background: 'rgba(200, 169, 81, 0.15)', 
                                                    border: '1px solid rgba(200, 169, 81, 0.35)', 
                                                    padding: '10px', 
                                                    borderRadius: '50%', 
                                                    color: '#c8a951',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.95rem' }}>{group.customerName}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>{group.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ 
                                                background: 'rgba(255, 255, 255, 0.08)', 
                                                border: '1px solid rgba(255, 255, 255, 0.15)', 
                                                padding: '4px 10px', 
                                                borderRadius: '6px', 
                                                fontWeight: '700', 
                                                color: '#f8fafc',
                                                fontSize: '0.82rem'
                                            }}>
                                                {group.orders.length} {isRTL ? 'طلبات' : 'Orders'}
                                            </span>
                                        </td>
                                        <td>
                                            <strong style={{ color: '#c8a951', fontSize: '1.05rem', fontWeight: '800' }}>
                                                {totalSpent.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}
                                            </strong>
                                        </td>
                                        <td className="hide-mobile">
                                            <span className={`status-badge ${getStatusClass(latestOrder.status)}`} style={{ textTransform: 'uppercase', fontWeight: '700' }}>
                                                {translateStatus(latestOrder.status)}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '10px 5px' }}>
                                            <button 
                                                onClick={() => toggleCustomerExpand(group.key)}
                                                style={{ 
                                                    background: isExpanded ? 'rgba(200, 169, 81, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                                    border: isExpanded ? '1px solid #c8a951' : '1px solid rgba(255, 255, 255, 0.2)',
                                                    color: isExpanded ? '#c8a951' : '#f8fafc',
                                                    borderRadius: '8px',
                                                    padding: '7px 16px',
                                                    fontSize: '0.82rem',
                                                    fontWeight: '700',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
                                                }}
                                            >
                                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                <span>{isExpanded ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض' : 'View')}</span>
                                            </button>
                                        </td>
                                    </tr>
                                    
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '0 0 20px 0', background: 'rgba(15, 23, 42, 0.6)' }}>
                                                <div style={{ 
                                                    margin: isMobile ? '10px 10px' : '12px 24px', 
                                                    padding: '20px', 
                                                    background: '#0f172a', 
                                                    borderRadius: '12px',
                                                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(51, 65, 85, 0.8)'
                                                }}>
                                                    {group.orders.map((order, idx) => {
                                                        const orderDateFormatted = formatOrderDate(order.created_at || order.date || order.createdAt);
                                                        const currentStatus = (order.status || 'pending').toLowerCase();
                                                        const shippingAddress = order.shipping_address || order.shippingAddress;
                                                        const paymentMethod = order.payment_method || order.paymentMethod;

                                                        return (
                                                            <div key={order.id} style={{ 
                                                                padding: '18px 0', 
                                                                borderBottom: idx === group.orders.length - 1 ? 'none' : '1px solid rgba(51, 65, 85, 0.6)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '14px'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                                                    <div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                                            <PackageIcon size={18} color="#c8a951" />
                                                                            <strong style={{ fontSize: '1.15rem', color: '#f8fafc', letterSpacing: '0.3px' }}>Order #{order.id}</strong>
                                                                            <span style={{ 
                                                                                color: '#94a3b8', 
                                                                                fontSize: '0.85rem',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '5px',
                                                                                background: 'rgba(255, 255, 255, 0.05)',
                                                                                padding: '2px 8px',
                                                                                borderRadius: '6px',
                                                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                                                            }}>
                                                                                <Calendar size={13} color="#94a3b8" />
                                                                                {orderDateFormatted}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                                                            {order.phone && (
                                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                                    <Phone size={13} color="#c8a951" /> {order.phone}
                                                                                </span>
                                                                            )}
                                                                            {shippingAddress && (
                                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                                    <MapPin size={13} color="#60a5fa" /> {shippingAddress}
                                                                                </span>
                                                                            )}
                                                                            {paymentMethod && (
                                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                                    <CheckCircle size={13} color="#34d399" /> {paymentMethod}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ textAlign: isRTL ? 'left' : 'right', display: 'flex', flexDirection: 'column', alignItems: isRTL ? 'flex-start' : 'flex-end', gap: '8px' }}>
                                                                        <div>
                                                                            <select 
                                                                                value={currentStatus}
                                                                                onChange={(e) => handleStatusUpdate(order.id, e)}
                                                                                style={{ 
                                                                                    background: '#1e293b', 
                                                                                    color: '#f8fafc',
                                                                                    border: '1px solid rgba(200, 169, 81, 0.45)',
                                                                                    borderRadius: '8px',
                                                                                    padding: '7px 14px', 
                                                                                    fontSize: '0.85rem',
                                                                                    fontWeight: '700',
                                                                                    cursor: 'pointer',
                                                                                    outline: 'none',
                                                                                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)'
                                                                                }}
                                                                            >
                                                                                <option value="pending" style={{ background: '#1e293b', color: '#f8fafc' }}>{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
                                                                                <option value="processing" style={{ background: '#1e293b', color: '#f8fafc' }}>{isRTL ? 'قيد المعالجة' : 'Processing'}</option>
                                                                                <option value="shipped" style={{ background: '#1e293b', color: '#f8fafc' }}>{isRTL ? 'تم الشحن' : 'Shipped'}</option>
                                                                                <option value="delivered" style={{ background: '#1e293b', color: '#f8fafc' }}>{isRTL ? 'تم التوصيل' : 'Delivered'}</option>
                                                                                <option value="cancelled" style={{ background: '#1e293b', color: '#f87171' }}>{isRTL ? 'إلغاء الطلب' : 'Cancel Order'}</option>
                                                                            </select>
                                                                        </div>
                                                                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#c8a951' }}>
                                                                            {order.total} {isRTL ? 'ر.ق' : 'QAR'}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '12px 18px', borderRadius: '10px', border: '1px solid rgba(51, 65, 85, 0.8)' }}>
                                                                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        {order.items?.map((item, iIdx) => (
                                                                            <li key={iIdx} style={{ fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', alignItems: 'center' }}>
                                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                    <span style={{ background: 'rgba(200, 169, 81, 0.15)', color: '#c8a951', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '0.8rem' }}>
                                                                                        {item.quantity}x
                                                                                    </span>
                                                                                    <span style={{ color: '#f8fafc', fontWeight: '600' }}>{item.name}</span>
                                                                                    {item.isGiftWrapped && <span title="Gift Wrapped">🎁</span>}
                                                                                </span>
                                                                                <span style={{ fontWeight: '700', color: '#c8a951' }}>{item.price} {isRTL ? 'ر.ق' : 'QAR'}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {groupedOrders.length === 0 && (
                            <tr>
                                <td colSpan="5" className="text-center" style={{ padding: '50px 20px' }}>
                                    <div style={{ opacity: 0.6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                        <PackageIcon size={48} color="#64748b" />
                                        <div style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: '600' }}>
                                            {shopId 
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
