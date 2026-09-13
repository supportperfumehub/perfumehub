import React, { useContext, useState, useMemo } from 'react';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import { Search, ChevronDown, ChevronUp, User, Package as PackageIcon, Clock, CheckCircle, Truck, Phone, Mail, MapPin, AlertCircle, Calendar, MessageSquare, Printer, FileText, Check, Edit3, X } from 'lucide-react';
import api from '../../utils/api_v1_0_2';

// ── Authenticity Barcode SVG Vector Generator (Zero External Dependencies) ──
const BarcodeSvg = ({ value = 'ORD-0000' }) => {
    const str = String(value);
    const bars = [];
    let seed = 0;
    for (let i = 0; i < str.length; i++) {
        seed += str.charCodeAt(i) * (i + 1);
    }
    bars.push({ width: 3, isBlack: true });
    bars.push({ width: 2, isBlack: false });
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 3, isBlack: false });

    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        const w1 = ((code * 3 + seed) % 3) + 1;
        const w2 = ((code * 7 + i) % 3) + 1;
        const w3 = ((code * 5 + seed * 2) % 3) + 1;
        const w4 = ((code + i * 4) % 2) + 1;
        bars.push({ width: w1, isBlack: true });
        bars.push({ width: w2, isBlack: false });
        bars.push({ width: w3, isBlack: true });
        bars.push({ width: w4, isBlack: false });
    }
    bars.push({ width: 3, isBlack: true });
    bars.push({ width: 2, isBlack: false });
    bars.push({ width: 4, isBlack: true });

    let currentX = 10;
    const elements = bars.map((b, idx) => {
        const x = currentX;
        currentX += b.width * 2;
        if (!b.isBlack) return null;
        return (
            <rect key={idx} x={x} y="0" width={b.width * 2} height="50" fill="#000000" />
        );
    });

    return (
        <div style={{ textAlign: 'center', display: 'inline-block' }}>
            <svg width={currentX + 20} height="52" style={{ background: '#ffffff', padding: '2px' }}>
                {elements}
            </svg>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', letterSpacing: '3px', fontWeight: '700', color: '#111827', marginTop: '2px' }}>
                *{str.toUpperCase()}*
            </div>
        </div>
    );
};

const OrderManager = ({ isRTL, shopId, activeTerritoryId, adminRegions }) => {
    const { orders, shops, updateOrderStatus } = useContext(ShopContext);
    const { user } = useContext(AuthContext);
    const isRegionalAdmin = user?.role === 'regional_admin';
    const adminRegionIds = useMemo(() => {
        return user?.assignedRegionIds || (adminRegions || []).map(r => r.id);
    }, [user?.assignedRegionIds, adminRegions]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [expandedCustomers, setExpandedCustomers] = useState({});
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Helper: SLA Delay Detection (> 24 hours without fulfillment)
    const isDelayed = (order) => {
        const s = (order.status || 'pending').toLowerCase();
        if (s === 'shipped' || s === 'delivered' || s === 'cancelled') return false;
        const createdAt = new Date(order.created_at || order.date || order.createdAt).getTime();
        if (isNaN(createdAt)) return false;
        const hoursElapsed = (Date.now() - createdAt) / (1000 * 60 * 60);
        return hoursElapsed > 24;
    };

    const sendWhatsAppNudge = (order) => {
        const boutiquePhone = (order.boutique_phone || order.shop_phone || order.phone || '').replace(/[^0-9]/g, '');
        const msg = encodeURIComponent(
            isRTL 
                ? `تنبيه إداري عاجل: الطلب #${order.id} تجاوز مهلة التجهيز المحددة بـ 24 ساعة. يرجى المسارعة في تجهيز وشحن الطلب فوراً.`
                : `Urgent Administrative Alert: Order #${order.id} has exceeded the 24-hour fulfillment SLA. Please expedite processing and dispatch immediately.`
        );
        if (boutiquePhone) {
            window.open(`https://wa.me/${boutiquePhone}?text=${msg}`, '_blank');
        } else {
            window.open(`https://wa.me/?text=${msg}`, '_blank');
        }
    };

    // Active territory shop IDs set
    const territoryShopIds = useMemo(() => {
        if (!shops || shops.length === 0) return null;
        const filtered = shops.filter(s => {
            if (isRegionalAdmin) {
                if (activeTerritoryId && activeTerritoryId !== 'all') {
                    return String(s.region_id) === String(activeTerritoryId);
                }
                return adminRegionIds.map(String).includes(String(s.region_id));
            }
            if (activeTerritoryId && activeTerritoryId !== 'all') {
                return String(s.region_id) === String(activeTerritoryId);
            }
            return true;
        });
        return new Set(filtered.map(s => String(s.id)));
    }, [shops, isRegionalAdmin, activeTerritoryId, adminRegionIds]);

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
        } else if (territoryShopIds) {
            relevantOrders = relevantOrders.filter(order => {
                if (order.shop_id && territoryShopIds.has(String(order.shop_id))) return true;
                if (order.pickup_shop_id && territoryShopIds.has(String(order.pickup_shop_id))) return true;
                if (order.shop_ids && Array.isArray(order.shop_ids)) {
                    if (order.shop_ids.some(id => territoryShopIds.has(String(id)))) return true;
                }
                if (order.items && Array.isArray(order.items)) {
                    return order.items.some(item => {
                        const sId = item.shop_id || (item.product && item.product.shop_id);
                        return sId && territoryShopIds.has(String(sId));
                    });
                }
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

    const [manifestOrder, setManifestOrder] = useState(null);
    const [trackingInputs, setTrackingInputs] = useState({});
    const [editingTracking, setEditingTracking] = useState({});
    const [savingTracking, setSavingTracking] = useState({});

    const handleSaveTracking = async (order) => {
        const orderId = order.id;
        const trackingNum = trackingInputs[orderId] !== undefined ? trackingInputs[orderId] : (order.tracking_number || '');
        if (!trackingNum.trim()) return;

        setSavingTracking(prev => ({ ...prev, [orderId]: true }));
        try {
            if (order.sub_order_id) {
                await api.put(`/orders/sub-orders/${order.sub_order_id}/tracking`, { tracking_number: trackingNum.trim() });
            } else {
                await api.put(`/orders/${orderId}/status`, { status: order.status, tracking_number: trackingNum.trim() });
            }
            order.tracking_number = trackingNum.trim();
            setEditingTracking(prev => ({ ...prev, [orderId]: false }));
        } catch (err) {
            console.error('Failed to update tracking number:', err);
            alert(isRTL ? 'فشل حفظ رقم التتبع' : 'Failed to save tracking number');
        } finally {
            setSavingTracking(prev => ({ ...prev, [orderId]: false }));
        }
    };

    const delayedOrdersCount = useMemo(() => {
        return groupedOrders.reduce((acc, g) => acc + g.orders.filter(isDelayed).length, 0);
    }, [groupedOrders]);

    return (
        <div className="manager-content">
            <div className="manager-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
                    <h2 style={{ 
                        margin: 0, 
                        color: '#f8fafc', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: isMobile ? '1.2rem' : '1.5rem',
                        whiteSpace: 'nowrap'
                    }}>
                        <PackageIcon size={isMobile ? 22 : 26} color="#c8a951" />
                        {isRTL ? 'إدارة الطلبات' : 'Order Management'}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                            background: 'rgba(200, 169, 81, 0.15)', 
                            border: '1px solid rgba(200, 169, 81, 0.3)', 
                            color: '#c8a951', 
                            padding: '3px 10px', 
                            borderRadius: '12px', 
                            fontSize: '0.78rem', 
                            fontWeight: '700',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}>
                            {groupedOrders.reduce((acc, g) => acc + g.orders.length, 0)} {isRTL ? 'طلب' : 'Orders'}
                        </span>
                        {delayedOrdersCount > 0 && (
                            <span style={{ 
                                background: 'rgba(239, 68, 68, 0.2)', 
                                border: '1px solid rgba(239, 68, 68, 0.4)', 
                                color: '#f87171', 
                                padding: '3px 10px', 
                                borderRadius: '12px', 
                                fontSize: '0.78rem', 
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                flexShrink: 0
                            }}>
                                <AlertCircle size={13} />
                                {delayedOrdersCount} {isRTL ? 'تأخير في التجهيز (>24س)' : 'Delayed SLA (>24h)'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Search & Single-Line Filter Bar ── */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="admin-search-container" style={{ flex: 1, minWidth: '240px', width: '100%' }}>
                    <div className="admin-search-icon">
                        <Search size={18} color="#94a3b8" />
                    </div>
                    <input 
                        type="text" 
                        className="form-control admin-search-input" 
                        placeholder={isRTL ? 'بحث بالاسم، الإيميل أو رقم الطلب...' : 'Search by name, email or order ID...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group" style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    overflowX: 'auto', 
                    flexWrap: 'nowrap',
                    width: isMobile ? '100%' : 'auto',
                    paddingBottom: isMobile ? '4px' : '0',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}>
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
                                    boxShadow: isActive ? '0 2px 10px rgba(200, 169, 81, 0.4)' : 'none',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                            >
                                {translateStatus(status)}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Mobile Card View ── */}
            {isMobile ? (
                <div style={{ display: 'grid', gap: '14px' }}>
                    {groupedOrders.map((group, groupIdx) => {
                        const isExpanded = expandedCustomers[group.key];
                        const totalSpent = group.orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
                        const latestOrder = group.orders[0];

                        return (
                            <div 
                                key={group.key || groupIdx} 
                                style={{ 
                                    background: '#1e293b', 
                                    borderRadius: '12px', 
                                    border: isExpanded ? '1px solid rgba(200, 169, 81, 0.5)' : '1px solid #334155', 
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                }}
                            >
                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ 
                                                width: '38px', 
                                                height: '38px', 
                                                borderRadius: '50%', 
                                                background: 'rgba(200, 169, 81, 0.15)', 
                                                border: '1px solid rgba(200, 169, 81, 0.35)', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                color: '#c8a951',
                                                flexShrink: 0
                                            }}>
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '1rem' }}>{group.customerName}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{group.email}</div>
                                            </div>
                                        </div>
                                        <span style={{ 
                                            background: 'rgba(255, 255, 255, 0.08)', 
                                            border: '1px solid rgba(255, 255, 255, 0.15)', 
                                            padding: '3px 8px', 
                                            borderRadius: '6px', 
                                            fontWeight: '700', 
                                            color: '#f8fafc', 
                                            fontSize: '0.75rem',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {group.orders.length} {isRTL ? 'طلبات' : 'Orders'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(51, 65, 85, 0.6)', marginTop: '10px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>{isRTL ? 'الإجمالي / الرصيد' : 'Total Balance'}</div>
                                            <strong style={{ color: '#c8a951', fontSize: '1.15rem', fontWeight: '800' }}>
                                                {totalSpent.toFixed(2)} {isRTL ? 'ر.ق' : 'QAR'}
                                            </strong>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className={`status-badge ${getStatusClass(latestOrder.status)}`} style={{ textTransform: 'uppercase', fontWeight: '700', fontSize: '0.72rem', padding: '4px 8px' }}>
                                                {translateStatus(latestOrder.status)}
                                            </span>
                                        </div>
                                    </div>

                                    <button 
                                        type="button"
                                        onClick={() => toggleCustomerExpand(group.key)}
                                        style={{ 
                                            width: '100%',
                                            marginTop: '12px',
                                            background: isExpanded ? 'rgba(200, 169, 81, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                                            border: isExpanded ? '1px solid #c8a951' : '1px solid rgba(255, 255, 255, 0.15)',
                                            color: isExpanded ? '#c8a951' : '#f8fafc',
                                            borderRadius: '8px',
                                            padding: '8px 14px',
                                            fontSize: '0.82rem',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                        <span>{isExpanded ? (isRTL ? 'إخفاء التفاصيل' : 'Hide Details') : (isRTL ? 'عرض تفاصيل الطلبات' : 'View Order Details')}</span>
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div style={{ background: '#0f172a', padding: '16px', borderTop: '1px solid #334155' }}>
                                        {group.orders.map((order, idx) => {
                                            const orderDateFormatted = formatOrderDate(order.created_at || order.date || order.createdAt);
                                            const currentStatus = (order.status || 'pending').toLowerCase();
                                            const shippingAddress = order.shipping_address || order.shippingAddress;
                                            const paymentMethod = order.payment_method || order.paymentMethod;

                                            return (
                                                <div key={order.id} style={{ 
                                                    paddingBottom: '16px', 
                                                    marginBottom: idx === group.orders.length - 1 ? '0' : '16px',
                                                    borderBottom: idx === group.orders.length - 1 ? 'none' : '1px solid rgba(51, 65, 85, 0.6)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>Order #{order.id}</strong>
                                                            {order.shop_name && (
                                                                <span style={{ fontSize: '0.72rem', background: 'rgba(212, 175, 55, 0.15)', color: '#d4af37', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                                                                    🏬 {order.shop_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{orderDateFormatted}</span>
                                                    </div>

                                                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {order.phone && <span><Phone size={12} color="#c8a951" /> {order.phone}</span>}
                                                        {shippingAddress && <span><MapPin size={12} color="#60a5fa" /> {shippingAddress}</span>}
                                                        {paymentMethod && <span><CheckCircle size={12} color="#34d399" /> {paymentMethod}</span>}
                                                    </div>

                                                    {isDelayed(order) && (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: '8px',
                                                            padding: '8px 12px',
                                                            borderRadius: '8px',
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                                            color: '#fca5a5',
                                                            fontSize: '0.78rem',
                                                            fontWeight: '600',
                                                            marginBottom: '10px'
                                                        }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <AlertCircle size={14} color="#f87171" style={{ flexShrink: 0 }} />
                                                                {isRTL ? '⚠️ تنبيه SLA: تأخر التجهيز (>24س)' : '⚠️ SLA Alert: Delayed Fulfillment (>24h)'}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => sendWhatsAppNudge(order)}
                                                                style={{
                                                                    background: '#25D366',
                                                                    color: '#ffffff',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    padding: '4px 8px',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    whiteSpace: 'nowrap',
                                                                    flexShrink: 0
                                                                }}
                                                            >
                                                                <MessageSquare size={12} />
                                                                {isRTL ? 'تنبيه واتساب' : 'WhatsApp Nudge'}
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <select 
                                                                value={currentStatus}
                                                                onChange={(e) => handleStatusUpdate(order.id, e)}
                                                                style={{ 
                                                                    background: '#1e293b', 
                                                                    color: '#f8fafc', 
                                                                    border: '1px solid rgba(200, 169, 81, 0.45)', 
                                                                    borderRadius: '6px', 
                                                                    padding: '5px 10px', 
                                                                    fontSize: '0.78rem', 
                                                                    fontWeight: '700',
                                                                    outline: 'none'
                                                                }}
                                                            >
                                                                <option value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
                                                                <option value="processing">{isRTL ? 'قيد المعالجة' : 'Processing'}</option>
                                                                <option value="shipped">{isRTL ? 'تم الشحن' : 'Shipped'}</option>
                                                                <option value="delivered">{isRTL ? 'تم التوصيل' : 'Delivered'}</option>
                                                                <option value="cancelled">{isRTL ? 'إلغاء الطلب' : 'Cancel Order'}</option>
                                                            </select>
                                                            <button
                                                                type="button"
                                                                onClick={() => setManifestOrder(order)}
                                                                style={{
                                                                    background: 'rgba(200, 169, 81, 0.15)',
                                                                    border: '1px solid rgba(200, 169, 81, 0.4)',
                                                                    color: '#c8a951',
                                                                    borderRadius: '6px',
                                                                    padding: '5px 8px',
                                                                    fontSize: '0.74rem',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                                title={isRTL ? 'طباعة بوليصة التجهيز' : 'Print Packing Slip'}
                                                            >
                                                                <Printer size={12} />
                                                                <span>{isRTL ? 'البوليصة' : 'Slip'}</span>
                                                            </button>
                                                        </div>
                                                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#c8a951' }}>
                                                            {order.total} {isRTL ? 'ر.ق' : 'QAR'}
                                                        </span>
                                                    </div>

                                                    {/* Tracking Row */}
                                                    <div style={{ marginBottom: '10px', padding: '6px 10px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '0.76rem' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#94a3b8' }}>
                                                            <Truck size={13} color="#60a5fa" />
                                                            {isRTL ? 'التتبع:' : 'Tracking:'}
                                                        </span>
                                                        {editingTracking[order.id] ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <input 
                                                                    type="text"
                                                                    placeholder="DHL-12345"
                                                                    value={trackingInputs[order.id] !== undefined ? trackingInputs[order.id] : (order.tracking_number || '')}
                                                                    onChange={(e) => setTrackingInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                                    style={{ background: '#0f172a', border: '1px solid #c8a951', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '0.74rem', width: '110px' }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveTracking(order)}
                                                                    disabled={savingTracking[order.id]}
                                                                    style={{ background: '#c8a951', color: '#000', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                                                                >
                                                                    {savingTracking[order.id] ? '...' : (isRTL ? 'حفظ' : 'Save')}
                                                                </button>
                                                                <button type="button" onClick={() => setEditingTracking(prev => ({ ...prev, [order.id]: false }))} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={12} /></button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                {order.tracking_number ? (
                                                                    <span style={{ color: '#60a5fa', fontWeight: '700', fontFamily: 'monospace' }}>{order.tracking_number}</span>
                                                                ) : (
                                                                    <span style={{ color: '#64748b', fontStyle: 'italic' }}>{isRTL ? 'غير مسجل' : 'None'}</span>
                                                                )}
                                                                <button type="button" onClick={() => setEditingTracking(prev => ({ ...prev, [order.id]: true }))} style={{ background: 'none', border: 'none', color: '#c8a951', cursor: 'pointer', padding: '2px' }}><Edit3 size={12} /></button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '10px 12px', borderRadius: '8px' }}>
                                                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {order.items?.map((item, iIdx) => (
                                                                <li key={iIdx} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                                                                    <span>{item.quantity}x {item.name}</span>
                                                                    <strong style={{ color: '#c8a951' }}>{item.price} QAR</strong>
                                                                </li>
                              ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {groupedOrders.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#1e293b', borderRadius: '12px' }}>
                            <PackageIcon size={40} color="#64748b" style={{ marginBottom: '10px' }} />
                            <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>
                                {shopId 
                                    ? (isRTL ? 'لم تصل طلبات لمنتجات متجرك بعد' : 'No orders yet for your shop products')
                                    : (isRTL ? 'لم يتم العثور على طلبات مطابقة' : 'No matching orders found')}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ── Desktop Table View ── */
                <div className="table-responsive" style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid rgba(51, 65, 85, 0.8)', overflowX: 'auto' }}>
                    <table className="admin-table" style={{ margin: 0, width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ width: isRTL ? 'auto' : '32%' }}>{isRTL ? 'العميل' : 'Customer'}</th>
                                <th>{isRTL ? 'الطلبات' : 'Orders'}</th>
                                <th>{isRTL ? 'الإجمالي' : 'Total'}</th>
                                <th>{isRTL ? 'آخر حالة' : 'Latest Status'}</th>
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
                                            <td>
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
                                                        margin: '12px 24px', 
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
                                                                                {order.shop_name && (
                                                                                    <span style={{ fontSize: '0.75rem', background: 'rgba(212, 175, 55, 0.15)', color: '#d4af37', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(212, 175, 55, 0.3)', fontWeight: '600' }}>
                                                                                        🏬 {order.shop_name}
                                                                                    </span>
                                                                                )}
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
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setManifestOrder(order)}
                                                                                    style={{
                                                                                        background: 'rgba(200, 169, 81, 0.15)',
                                                                                        border: '1px solid rgba(200, 169, 81, 0.45)',
                                                                                        color: '#c8a951',
                                                                                        borderRadius: '8px',
                                                                                        padding: '7px 14px',
                                                                                        fontSize: '0.82rem',
                                                                                        fontWeight: '700',
                                                                                        cursor: 'pointer',
                                                                                        display: 'inline-flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '6px',
                                                                                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
                                                                                    }}
                                                                                    title={isRTL ? 'طباعة بوليصة التجهيز والمنافيست' : 'Print Boutique Packing Slip & Manifest'}
                                                                                >
                                                                                    <Printer size={14} />
                                                                                    <span>{isRTL ? 'بوليصة التجهيز' : 'Packing Slip'}</span>
                                                                                </button>
                                                                            </div>

                                                                            {/* Desktop Courier Tracking Row */}
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                                                                                    <Truck size={13} color="#60a5fa" />
                                                                                    {isRTL ? 'التتبع:' : 'Tracking:'}
                                                                                </span>
                                                                                {editingTracking[order.id] ? (
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                        <input 
                                                                                            type="text"
                                                                                            placeholder="DHL-12345"
                                                                                            value={trackingInputs[order.id] !== undefined ? trackingInputs[order.id] : (order.tracking_number || '')}
                                                                                            onChange={(e) => setTrackingInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                                                            style={{ background: '#0f172a', border: '1px solid #c8a951', color: '#fff', borderRadius: '4px', padding: '3px 8px', fontSize: '0.78rem', width: '130px' }}
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleSaveTracking(order)}
                                                                                            disabled={savingTracking[order.id]}
                                                                                            style={{ background: '#c8a951', color: '#000', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                                                                                        >
                                                                                            {savingTracking[order.id] ? '...' : (isRTL ? 'حفظ' : 'Save')}
                                                                                        </button>
                                                                                        <button type="button" onClick={() => setEditingTracking(prev => ({ ...prev, [order.id]: false }))} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={12} /></button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                        {order.tracking_number ? (
                                                                                            <span style={{ color: '#60a5fa', fontWeight: '700', fontFamily: 'monospace', background: 'rgba(59, 130, 246, 0.12)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>{order.tracking_number}</span>
                                                                                        ) : (
                                                                                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>{isRTL ? 'غير مسجل' : 'None'}</span>
                                                                                        )}
                                                                                        <button type="button" onClick={() => setEditingTracking(prev => ({ ...prev, [order.id]: true }))} style={{ background: 'none', border: 'none', color: '#c8a951', cursor: 'pointer', padding: '2px' }}><Edit3 size={12} /></button>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#c8a951' }}>
                                                                                {order.total} {isRTL ? 'ر.ق' : 'QAR'}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {isDelayed(order) && (
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'space-between',
                                                                            gap: '12px',
                                                                            padding: '10px 16px',
                                                                            borderRadius: '8px',
                                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                                                            color: '#fca5a5',
                                                                            fontSize: '0.82rem',
                                                                            fontWeight: '600'
                                                                        }}>
                                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
                                                                                {isRTL ? '⚠️ تنبيه SLA: تأخر تجهيز هذا الطلب لأكثر من 24 ساعة عن موعد التسجيل' : '⚠️ SLA Alert: Fulfillment delayed >24 hours from placement'}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => sendWhatsAppNudge(order)}
                                                                                style={{
                                                                                    background: '#25D366',
                                                                                    color: '#ffffff',
                                                                                    border: 'none',
                                                                                    borderRadius: '6px',
                                                                                    padding: '6px 14px',
                                                                                    fontSize: '0.78rem',
                                                                                    fontWeight: '700',
                                                                                    cursor: 'pointer',
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '6px',
                                                                                    whiteSpace: 'nowrap',
                                                                                    flexShrink: 0,
                                                                                    boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)'
                                                                                }}
                                                                                title={isRTL ? 'إرسال تنبيه واتساب للبوتيك' : 'Send WhatsApp Escalation to Boutique'}
                                                                            >
                                                                                <MessageSquare size={14} />
                                                                                {isRTL ? 'تنبيه واتساب للبوتيك' : 'WhatsApp Nudge'}
                                                                            </button>
                                                                        </div>
                                                                    )}

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
            )}

            {/* ── 1-Click Boutique Packing Slip & Dispatch Manifest Modal ── */}
            {manifestOrder && (
                <div 
                    className="manifest-modal-overlay" 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        overflowY: 'auto'
                    }}
                    onClick={(e) => {
                        if (e.target.classList.contains('manifest-modal-overlay')) {
                            setManifestOrder(null);
                        }
                    }}
                >
                    <style>{`
                        @media print {
                            body * {
                                visibility: hidden !important;
                            }
                            #printable-packing-slip, #printable-packing-slip * {
                                visibility: visible !important;
                            }
                            #printable-packing-slip {
                                position: fixed !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                padding: 24px !important;
                                margin: 0 !important;
                                box-shadow: none !important;
                                border: none !important;
                                background: #ffffff !important;
                                color: #000000 !important;
                            }
                            .no-print {
                                display: none !important;
                            }
                        }
                    `}</style>
                    <div 
                        id="printable-packing-slip"
                        style={{
                            background: '#ffffff',
                            color: '#111827',
                            width: '100%',
                            maxWidth: '780px',
                            borderRadius: '14px',
                            padding: '36px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                            position: 'relative',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            direction: 'ltr',
                            textAlign: 'left'
                        }}
                    >
                        {/* Screen Actions Bar (hidden when printing) */}
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={22} color="#b45309" />
                                <div>
                                    <strong style={{ fontSize: '1.15rem', color: '#111827', display: 'block' }}>
                                        {isRTL ? 'بوليصة التجهيز والمنافيست الرسمية' : 'Official Boutique Dispatch Manifest & Packing Slip'}
                                    </strong>
                                    <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                                        {isRTL ? 'جاهزة للطباعة والإرفاق مع شحنة العميل' : 'Ready for high-resolution printing & parcel packaging'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    style={{
                                        background: 'linear-gradient(135deg, #c8a951 0%, #b8860b 100%)',
                                        color: '#000',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '9px 20px',
                                        fontWeight: '800',
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 3px 10px rgba(184, 134, 11, 0.35)'
                                    }}
                                >
                                    <Printer size={16} />
                                    {isRTL ? 'طباعة البوليصة' : 'Print Slip (Ctrl+P)'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setManifestOrder(null)}
                                    style={{
                                        background: '#f3f4f6',
                                        border: '1px solid #d1d5db',
                                        color: '#374151',
                                        borderRadius: '8px',
                                        padding: '8px 14px',
                                        fontWeight: '600',
                                        fontSize: '0.88rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Document Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111827', paddingBottom: '18px', marginBottom: '20px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '1.4rem' }}>👑</span>
                                    <h1 style={{ margin: 0, fontSize: '1.55rem', fontWeight: '900', letterSpacing: '-0.5px', color: '#111827' }}>
                                        PERFUME<span style={{ color: '#b45309' }}>HUB</span>
                                    </h1>
                                </div>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#6b7280', fontWeight: '800' }}>
                                    Enterprise Boutique Partner Dispatch Manifest
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#374151', lineHeight: '1.45' }}>
                                    <strong>{manifestOrder.shop_name || 'PerfumeHub Luxury Boutique Partner'}</strong><br />
                                    {manifestOrder.boutique_phone && <span>Contact: {manifestOrder.boutique_phone}<br /></span>}
                                    <span>Fulfillment Hub: State of Qatar</span>
                                </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <BarcodeSvg value={manifestOrder.sub_order_id ? `SUB-${manifestOrder.sub_order_id}` : `ORD-${manifestOrder.id}`} />
                                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#4b5563', lineHeight: '1.4' }}>
                                    <div><strong>Master Order ID:</strong> #{manifestOrder.id}</div>
                                    {manifestOrder.sub_order_id && <div><strong>Sub-Order Ref:</strong> #{manifestOrder.sub_order_id}</div>}
                                    <div><strong>Order Date:</strong> {formatOrderDate(manifestOrder.created_at || manifestOrder.date || manifestOrder.createdAt)}</div>
                                    <div><strong>Batch Printed:</strong> {new Date().toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Recipient / Shipping & Fulfillment Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '22px', border: '1px solid #e5e7eb' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#6b7280', fontWeight: '800', marginBottom: '6px' }}>
                                    Customer & Destination Details
                                </div>
                                <div style={{ fontSize: '0.94rem', fontWeight: '700', color: '#111827' }}>
                                    {manifestOrder.customer_name || manifestOrder.customerName || 'Valued Fragrance Customer'}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#4b5563', marginTop: '4px', lineHeight: '1.5' }}>
                                    {manifestOrder.phone && <div>📞 {manifestOrder.phone}</div>}
                                    {manifestOrder.email && <div>✉️ {manifestOrder.email}</div>}
                                    <div style={{ marginTop: '4px' }}>📍 {manifestOrder.shipping_address || manifestOrder.shippingAddress || 'Store Pickup / Counter Collection'}</div>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#6b7280', fontWeight: '800', marginBottom: '6px' }}>
                                    Fulfillment & Courier Routing
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#4b5563', lineHeight: '1.6' }}>
                                    <div><strong>Fulfillment Mode:</strong> {manifestOrder.fulfillment_type || (manifestOrder.shipping_address ? 'Courier Express Delivery' : 'In-Store Pickup')}</div>
                                    <div>
                                        <strong>Courier Tracking:</strong>{' '}
                                        {manifestOrder.tracking_number ? (
                                            <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#1d4ed8' }}>{manifestOrder.tracking_number}</span>
                                        ) : (
                                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Pending Courier Assignment</span>
                                        )}
                                    </div>
                                    <div><strong>Payment Method:</strong> {manifestOrder.payment_method || manifestOrder.paymentMethod || 'Prepaid / Verified'}</div>
                                    <div><strong>Sub-Order Status:</strong> <span style={{ textTransform: 'uppercase', fontWeight: '700', color: '#b45309' }}>{manifestOrder.status}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '22px', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: '#111827', color: '#ffffff', textAlign: 'left' }}>
                                    <th style={{ padding: '9px 10px', width: '35px' }}>#</th>
                                    <th style={{ padding: '9px 10px' }}>Fragrance Description</th>
                                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '60px' }}>Qty</th>
                                    <th style={{ padding: '9px 10px', textAlign: 'right', width: '90px' }}>Unit Price</th>
                                    <th style={{ padding: '9px 10px', textAlign: 'right', width: '100px' }}>Total (QAR)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(manifestOrder.items || []).map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                        <td style={{ padding: '9px 10px', color: '#6b7280' }}>{idx + 1}</td>
                                        <td style={{ padding: '9px 10px', fontWeight: '600', color: '#111827' }}>
                                            {item.name || item.title}
                                            {item.isGiftWrapped && (
                                                <span style={{ marginLeft: '6px', fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                                    🎁 Luxury Wrapped
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '700' }}>{item.quantity}</td>
                                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#4b5563' }}>{Number(item.price).toFixed(2)}</td>
                                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '700', color: '#111827' }}>
                                            {(Number(item.price) * Number(item.quantity)).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="4" style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', borderTop: '2px solid #111827' }}>
                                        Order Subtotal:
                                    </td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', fontSize: '1.05rem', borderTop: '2px solid #111827', color: '#b45309' }}>
                                        {Number(manifestOrder.total || manifestOrder.total_amount || 0).toFixed(2)} QAR
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Custody Sign-Off & Verification Block */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed #9ca3af' }}>
                            <div style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '6px' }}>
                                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '800', color: '#6b7280' }}>Boutique Packing Officer</div>
                                <div style={{ marginTop: '26px', borderTop: '1px solid #9ca3af', paddingTop: '4px', fontSize: '0.75rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Signature / Quality Stamp</span>
                                    <span>Date & Time</span>
                                </div>
                            </div>

                            <div style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '6px' }}>
                                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '800', color: '#6b7280' }}>Courier Driver / Customer Acceptance</div>
                                <div style={{ marginTop: '26px', borderTop: '1px solid #9ca3af', paddingTop: '4px', fontSize: '0.75rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Received In Good Order</span>
                                    <span>Recipient Signature</span>
                                </div>
                            </div>
                        </div>

                        {/* Security Guarantee Note */}
                        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.72rem', color: '#9ca3af', letterSpacing: '0.5px' }}>
                            🛡️ 100% Guaranteed Authentic Niche Fragrance • PerfumeHub Luxury Boutiques Network • Doha, Qatar
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderManager;
