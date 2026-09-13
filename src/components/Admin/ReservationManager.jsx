import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ShopContext } from '../../context/ShopContext';
import { Clock, CheckCircle, XCircle, PackageCheck, AlertCircle, RefreshCw, CalendarCheck, Search, MessageSquare, Store } from 'lucide-react';

const ReservationManager = ({ shopId, isRTL, activeTerritoryId, adminRegions }) => {
    const { user } = useContext(AuthContext);
    const { shops } = useContext(ShopContext);
    const isRegionalAdmin = user?.role === 'regional_admin';

    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const adminRegionIds = useMemo(() => {
        return user?.assignedRegionIds || (adminRegions || []).map(r => r.id);
    }, [user?.assignedRegionIds, adminRegions]);

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

    const fetchReservations = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/reservations${shopId ? `?shop_id=${shopId}` : ''}`, {
                headers: { 'x-user-id': user?.id }
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to fetch reservations');
            }
            const data = await res.json();
            setReservations(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();
    }, [shopId, user?.id]);

    const handleAction = async (id, action) => {
        const actionLabels = {
            confirm: isRTL ? 'تأكيد هذا الحجز؟' : 'Confirm this reservation?',
            complete: isRTL ? 'تأكيد استلام العميل؟' : 'Mark as picked up?',
            cancel: isRTL ? 'إلغاء هذا الحجز؟ سيتم تحرير المخزون.' : 'Cancel this reservation? Stock will be freed.'
        };
        if (!window.confirm(actionLabels[action])) return;

        setActionLoading(id);
        try {
            const res = await fetch(`/api/reservations/${id}/${action}`, {
                method: 'POST',
                headers: { 'x-user-id': user?.id }
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Action failed');
            }
            fetchReservations();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    // Helper: SLA Expiration Tracking (< 2 hours remaining)
    const isExpiringSoon = (resv) => {
        const s = (resv.status || '').toLowerCase();
        if (s !== 'pending' && s !== 'confirmed') return false;
        if (!resv.expires_at) return false;
        const diffMs = new Date(resv.expires_at).getTime() - Date.now();
        return diffMs > 0 && diffMs <= 2 * 60 * 60 * 1000;
    };

    const getRemainingMinutes = (resv) => {
        const diffMs = new Date(resv.expires_at).getTime() - Date.now();
        return Math.max(1, Math.round(diffMs / (1000 * 60)));
    };

    const sendWhatsAppAlert = (resv) => {
        const phone = (resv.customer_phone || resv.phone || '').replace(/[^0-9]/g, '');
        const boutiqueName = resv.shops?.name || (shops?.find(s => String(s.id) === String(resv.shop_id))?.name) || (isRTL ? 'البوتيك' : 'the boutique');
        const minsLeft = getRemainingMinutes(resv);
        const msg = encodeURIComponent(
            isRTL 
                ? `تذكير استلام حجز: نود تذكيركم بأن حجزكم رقم #${resv.id.slice(0, 8)} لدى ${boutiqueName} يتبقى على انتهاء صلاحيته ${minsLeft} دقيقة فقط (< ساعتين). يرجى التوجه للاستلام.`
                : `Pickup Reminder: Your reservation #${resv.id.slice(0, 8)} at ${boutiqueName} will expire in ${minsLeft} minutes (<2 hours). Please visit to pick up your order to avoid release.`
        );
        if (phone) {
            window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
        } else {
            window.open(`https://wa.me/?text=${msg}`, '_blank');
        }
    };

    const statusConfig = {
        pending:   { label: isRTL ? 'قيد الانتظار' : 'Pending',   bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
        confirmed: { label: isRTL ? 'مؤكد'        : 'Confirmed', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
        completed: { label: isRTL ? 'تم الاستلام'  : 'Completed', bg: 'rgba(99, 102, 241, 0.15)', color: '#a78bfa', border: 'rgba(99, 102, 241, 0.3)' },
        cancelled: { label: isRTL ? 'ملغى'        : 'Cancelled', bg: 'rgba(239, 68, 68, 0.15)',  color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
        expired:   { label: isRTL ? 'منتهي'       : 'Expired',   bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)' },
    };

    const getStatusBadge = (status) => {
        const cfg = statusConfig[status] || { label: status, bg: '#333', color: '#fff', border: '#555' };
        return (
            <span className="status-badge" style={{ 
                backgroundColor: cfg.bg, color: cfg.color, 
                border: `1px solid ${cfg.border}`,
                padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
                {cfg.label}
            </span>
        );
    };

    // Scoped list
    const scopedReservations = useMemo(() => {
        return reservations.filter(r => {
            if (shopId) return String(r.shop_id) === String(shopId);
            if (territoryShopIds && r.shop_id) {
                return territoryShopIds.has(String(r.shop_id));
            }
            return true;
        });
    }, [reservations, shopId, territoryShopIds]);

    const filteredReservations = useMemo(() => {
        return scopedReservations.filter(r => {
            if (statusFilter === 'expiring') {
                if (!isExpiringSoon(r)) return false;
            } else if (statusFilter !== 'all' && r.status !== statusFilter) {
                return false;
            }

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const productName = r.products?.name?.toLowerCase() || '';
                const id = r.id?.toLowerCase() || '';
                const boutiqueName = r.shops?.name?.toLowerCase() || '';
                if (!productName.includes(q) && !id.includes(q) && !boutiqueName.includes(q)) return false;
            }
            return true;
        });
    }, [scopedReservations, statusFilter, searchQuery]);

    const statusCounts = useMemo(() => ({
        all: scopedReservations.length,
        pending: scopedReservations.filter(r => r.status === 'pending').length,
        confirmed: scopedReservations.filter(r => r.status === 'confirmed').length,
        completed: scopedReservations.filter(r => r.status === 'completed').length,
        expiring: scopedReservations.filter(isExpiringSoon).length,
    }), [scopedReservations]);

    if (loading) {
        return (
            <div className="admin-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <RefreshCw size={32} color="#c8a951" className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-section" style={{ textAlign: 'center', padding: '40px' }}>
                <AlertCircle size={40} color="#f87171" style={{ marginBottom: '16px' }} />
                <p style={{ color: '#f87171', fontWeight: '500' }}>{error}</p>
                <button className="btn btn-outline" onClick={fetchReservations} style={{ marginTop: '16px' }}>
                    <RefreshCw size={16} /> {isRTL ? 'إعادة المحاولة' : 'Retry'}
                </button>
            </div>
        );
    }

    return (
        <div className="admin-section animate-fade-in">
            <div className="manager-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <CalendarCheck size={24} color="#c8a951" />
                        {isRTL ? 'إدارة الحجوزات والاستلام' : 'Click & Collect Reservations'}
                    </h2>
                    <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: '700', 
                        background: 'rgba(200, 169, 81, 0.15)', 
                        border: '1px solid rgba(200, 169, 81, 0.3)',
                        color: '#c8a951', 
                        padding: '3px 10px', 
                        borderRadius: '12px' 
                    }}>
                        {filteredReservations.length} {isRTL ? 'حجز' : 'Reservations'}
                    </span>
                    {statusCounts.expiring > 0 && (
                        <span style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            🔥 {statusCounts.expiring} {isRTL ? 'تنتهي قريباً (< ساعتين)' : 'Expiring Soon (<2h)'}
                        </span>
                    )}
                </div>
                <button className="btn btn-outline" onClick={fetchReservations} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    <RefreshCw size={14} /> {isRTL ? 'تحديث' : 'Refresh'}
                </button>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { key: 'pending', label: isRTL ? 'قيد الانتظار' : 'Pending', icon: <Clock size={20} />, color: '#fbbf24' },
                    { key: 'confirmed', label: isRTL ? 'مؤكد' : 'Confirmed', icon: <CheckCircle size={20} />, color: '#34d399' },
                    { key: 'completed', label: isRTL ? 'تم الاستلام' : 'Completed', icon: <PackageCheck size={20} />, color: '#a78bfa' },
                    { key: 'expiring', label: isRTL ? 'ينتهي قريباً (<2س)' : 'Expiring (<2h)', icon: <AlertCircle size={20} />, color: '#f87171' },
                ].map(s => (
                    <div key={s.key} 
                        onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
                        style={{ 
                            background: statusFilter === s.key ? 'rgba(200, 169, 81, 0.1)' : '#1e293b', 
                            border: statusFilter === s.key ? '1px solid #c8a951' : (s.key === 'expiring' && statusCounts.expiring > 0 ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid #334155'),
                            borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}
                    >
                        <div style={{ color: s.color }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: s.key === 'expiring' && statusCounts.expiring > 0 ? '#f87171' : '#f8fafc' }}>
                                {statusCounts[s.key]}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                                {s.label}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="admin-search-container" style={{ marginBottom: '20px', minWidth: 'auto' }}>
                <span className="admin-search-icon"><Search size={16} /></span>
                <input 
                    type="text" 
                    className="form-control admin-search-input" 
                    placeholder={isRTL ? 'بحث بالمنتج، اسم البوتيك أو رقم الحجز...' : 'Search by product, boutique or reservation ID...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {['all', 'pending', 'confirmed', 'completed', 'cancelled', 'expired', 'expiring'].map(s => {
                    const label = s === 'all' 
                        ? (isRTL ? 'الكل' : 'All') 
                        : (s === 'expiring' ? (isRTL ? '🔥 ينتهي قريباً (<2س)' : '🔥 Expiring Soon (<2h)') : statusConfig[s]?.label || s);
                    return (
                        <button
                            key={s}
                            className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
                            onClick={() => setStatusFilter(s)}
                            style={s === 'expiring' ? { borderColor: 'rgba(239, 68, 68, 0.5)', color: statusFilter === s ? '#fff' : '#f87171' } : {}}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="admin-table-container" style={{ overflowX: 'auto' }}>
                {filteredReservations.length === 0 ? (
                    <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b' }}>
                        <CalendarCheck size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <p style={{ fontWeight: '500' }}>{isRTL ? 'لا توجد حجوزات مطابقة' : 'No matching reservations found'}</p>
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{isRTL ? 'المنتج والبوتيك' : 'Product & Boutique'}</th>
                                <th>{isRTL ? 'الكمية' : 'Qty'}</th>
                                <th>{isRTL ? 'موعد الاستلام' : 'Pickup Window'}</th>
                                <th>{isRTL ? 'صلاحية الحجز (SLA)' : 'Expires (SLA)'}</th>
                                <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReservations.map(resv => {
                                const isActioning = actionLoading === resv.id;
                                const isExpiring = isExpiringSoon(resv);
                                const boutique = resv.shops || shops?.find(s => String(s.id) === String(resv.shop_id));

                                return (
                                    <tr key={resv.id} style={{ 
                                        opacity: isActioning ? 0.5 : 1, 
                                        transition: 'opacity 0.2s',
                                        background: isExpiring ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                                    }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {resv.products?.image_url && (
                                                    <img 
                                                        src={Array.isArray(resv.products.image_url) ? resv.products.image_url[0] : resv.products.image_url} 
                                                        alt="" 
                                                        style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #334155' }} 
                                                    />
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#f8fafc' }}>
                                                        {resv.products?.name || 'Unknown Product'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                                                        <span>{resv.products?.brand} • #{resv.id.slice(0, 8)}</span>
                                                        {boutique && (
                                                            <span style={{ 
                                                                display: 'inline-flex', 
                                                                alignItems: 'center', 
                                                                gap: '3px',
                                                                background: 'rgba(212, 175, 55, 0.12)', 
                                                                color: '#d4af37', 
                                                                padding: '1px 6px', 
                                                                borderRadius: '4px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: '600'
                                                            }}>
                                                                <Store size={10} /> {boutique.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ 
                                                fontWeight: '700', fontSize: '0.95rem', color: '#f8fafc',
                                                background: '#334155', padding: '4px 10px', borderRadius: '6px'
                                            }}>
                                                {resv.quantity}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                                                {new Date(resv.pickup_time_start).toLocaleDateString(isRTL ? 'ar-QA' : 'en-GB', { day: '2-digit', month: 'short' })}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {new Date(resv.pickup_time_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} – {new Date(resv.pickup_time_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.82rem', color: new Date(resv.expires_at) < new Date() ? '#f87171' : '#cbd5e1' }}>
                                                {new Date(resv.expires_at).toLocaleString(isRTL ? 'ar-QA' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {isExpiring && (
                                                <div style={{
                                                    marginTop: '4px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                    border: '1px solid rgba(239, 68, 68, 0.45)',
                                                    color: '#f87171',
                                                    padding: '2px 7px',
                                                    borderRadius: '5px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: '700'
                                                }}>
                                                    🔥 {isRTL ? `ينتهي خلال ${getRemainingMinutes(resv)} دقيقة` : `Expiring in ${getRemainingMinutes(resv)}m (<2h SLA)`}
                                                </div>
                                            )}
                                        </td>
                                        <td>{getStatusBadge(resv.status)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                {isExpiring && (
                                                    <button
                                                        type="button"
                                                        className="admin-action-btn"
                                                        onClick={() => sendWhatsAppAlert(resv)}
                                                        title={isRTL ? 'إرسال تذكير واتساب للعميل' : 'Send WhatsApp Outreach to Customer'}
                                                        style={{ color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.4)', background: 'rgba(37, 211, 102, 0.1)' }}
                                                    >
                                                        <MessageSquare size={16} />
                                                    </button>
                                                )}
                                                {resv.status === 'pending' && (
                                                    <button 
                                                        className="admin-action-btn edit-btn" 
                                                        onClick={() => handleAction(resv.id, 'confirm')} 
                                                        title={isRTL ? 'تأكيد' : 'Confirm'}
                                                        disabled={isActioning}
                                                        style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                                {resv.status === 'confirmed' && (
                                                    <button 
                                                        className="admin-action-btn edit-btn" 
                                                        onClick={() => handleAction(resv.id, 'complete')} 
                                                        title={isRTL ? 'تأكيد الاستلام' : 'Complete Pickup'}
                                                        disabled={isActioning}
                                                        style={{ color: '#a78bfa', borderColor: 'rgba(99, 102, 241, 0.3)' }}
                                                    >
                                                        <PackageCheck size={16} />
                                                    </button>
                                                )}
                                                {(resv.status === 'pending' || resv.status === 'confirmed') && (
                                                    <button 
                                                        className="admin-action-btn delete-btn" 
                                                        onClick={() => handleAction(resv.id, 'cancel')} 
                                                        title={isRTL ? 'إلغاء' : 'Cancel'}
                                                        disabled={isActioning}
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ReservationManager;
