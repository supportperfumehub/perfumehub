import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Clock, CheckCircle, XCircle, PackageCheck, AlertCircle, RefreshCw, CalendarCheck, ChevronDown, Search } from 'lucide-react';

const ReservationManager = ({ shopId, isRTL }) => {
    const { user } = useContext(AuthContext);
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchReservations = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/reservations${shopId ? `?shop_id=${shopId}` : ''}`, {
                headers: { 'x-user-id': user?.id }
            });
            if (!res.ok) throw new Error('Failed to fetch reservations');
            const data = await res.json();
            setReservations(data);
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
                const data = await res.json();
                throw new Error(data.error || 'Action failed');
            }
            fetchReservations();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
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

    const filteredReservations = reservations.filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const productName = r.products?.name?.toLowerCase() || '';
            const id = r.id?.toLowerCase() || '';
            if (!productName.includes(q) && !id.includes(q)) return false;
        }
        return true;
    });

    const statusCounts = {
        all: reservations.length,
        pending: reservations.filter(r => r.status === 'pending').length,
        confirmed: reservations.filter(r => r.status === 'confirmed').length,
        completed: reservations.filter(r => r.status === 'completed').length,
    };

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
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <CalendarCheck size={24} color="#c8a951" />
                    {isRTL ? 'إدارة الحجوزات' : 'Reservation Management'}
                    <span style={{ fontSize: '0.8rem', fontWeight: '400', color: '#94a3b8', marginLeft: '8px' }}>
                        ({filteredReservations.length})
                    </span>
                </h2>
                <button className="btn btn-outline" onClick={fetchReservations} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    <RefreshCw size={14} /> {isRTL ? 'تحديث' : 'Refresh'}
                </button>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { key: 'pending', icon: <Clock size={20} />, color: '#fbbf24' },
                    { key: 'confirmed', icon: <CheckCircle size={20} />, color: '#34d399' },
                    { key: 'completed', icon: <PackageCheck size={20} />, color: '#a78bfa' },
                ].map(s => (
                    <div key={s.key} 
                        onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
                        style={{ 
                            background: statusFilter === s.key ? 'rgba(200, 169, 81, 0.1)' : '#1e293b', 
                            border: statusFilter === s.key ? '1px solid #c8a951' : '1px solid #334155',
                            borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}
                    >
                        <div style={{ color: s.color }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f8fafc' }}>{statusCounts[s.key]}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                                {statusConfig[s.key].label}
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
                    placeholder={isRTL ? 'بحث بالمنتج أو رقم الحجز...' : 'Search by product or reservation ID...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {['all', 'pending', 'confirmed', 'completed', 'cancelled', 'expired'].map(s => (
                    <button
                        key={s}
                        className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
                        onClick={() => setStatusFilter(s)}
                    >
                        {s === 'all' ? (isRTL ? 'الكل' : 'All') : statusConfig[s]?.label || s}
                    </button>
                ))}
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
                                <th>{isRTL ? 'المنتج' : 'Product'}</th>
                                <th>{isRTL ? 'الكمية' : 'Qty'}</th>
                                <th>{isRTL ? 'موعد الاستلام' : 'Pickup Window'}</th>
                                <th>{isRTL ? 'ينتهي في' : 'Expires'}</th>
                                <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReservations.map(resv => {
                                const isActioning = actionLoading === resv.id;
                                return (
                                    <tr key={resv.id} style={{ opacity: isActioning ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {resv.products?.image_url && (
                                                    <img 
                                                        src={Array.isArray(resv.products.image_url) ? resv.products.image_url[0] : resv.products.image_url} 
                                                        alt="" 
                                                        style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #334155' }} 
                                                    />
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#f8fafc' }}>
                                                        {resv.products?.name || 'Unknown'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                        {resv.products?.brand} • ID: {resv.id.slice(0, 8)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ 
                                                fontWeight: '700', fontSize: '1rem', color: '#f8fafc',
                                                background: '#334155', padding: '4px 10px', borderRadius: '6px'
                                            }}>
                                                {resv.quantity}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                                                {new Date(resv.pickup_time_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {new Date(resv.pickup_time_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} – {new Date(resv.pickup_time_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.8rem', color: new Date(resv.expires_at) < new Date() ? '#f87171' : '#94a3b8' }}>
                                                {new Date(resv.expires_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td>{getStatusBadge(resv.status)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px' }}>
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
