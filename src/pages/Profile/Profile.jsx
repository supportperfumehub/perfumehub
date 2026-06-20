import React, { useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api_v1_0_2';
import { User, Mail, Phone, MapPin, Package as PackageIcon, Clock, CheckCircle, Store, CalendarCheck, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
    const { t } = useTranslation();
    const { isRTL } = useOutletContext();
    const { orders } = useContext(ShopContext);
    const { user } = useContext(AuthContext);

    // Profile data from user object
    const profileData = {
        name: user?.name || t('profile.customer'),
        email: user?.email || '',
        phone: user?.phone || t('profile.not_provided'),
        address: user?.address || t('profile.not_provided')
    };

    // Filter orders to only show those for this user based on email
    const userOrders = orders.filter(o => o.email === user?.email).reverse();

    // Fetch user reservations
    const [reservations, setReservations] = useState([]);
    const [resvLoading, setResvLoading] = useState(true);

    useEffect(() => {
        const fetchReservations = async () => {
            if (!user?.id) return;
            try {
                const res = await api.get('/reservations');
                setReservations(res.data);
            } catch (e) { console.error(e); }
            finally { setResvLoading(false); }
        };
        fetchReservations();
    }, [user?.id]);

    const cancelReservation = async (id) => {
        if (!user?.id) return;
        if (!window.confirm(isRTL ? 'هل تريد إلغاء هذا الحجز؟' : 'Cancel this reservation?')) return;
        try {
            await api.post(`/reservations/${id}/cancel`);
            setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
        } catch (e) { console.error(e); }
    };

    const statusStyles = {
        pending:   { bg: '#fef3c7', color: '#92400e', label: isRTL ? 'قيد الانتظار' : 'Pending' },
        confirmed: { bg: '#d1fae5', color: '#065f46', label: isRTL ? 'مؤكد' : 'Confirmed' },
        completed: { bg: '#e0e7ff', color: '#3730a3', label: isRTL ? 'تم الاستلام' : 'Picked Up' },
        cancelled: { bg: '#fee2e2', color: '#b91c1c', label: isRTL ? 'ملغى' : 'Cancelled' },
        expired:   { bg: '#f3f4f6', color: '#6b7280', label: isRTL ? 'منتهي' : 'Expired' },
    };

    return (
        <div className="profile-page">
            <div className="profile-header text-center">
                <div className="container">
                    <h1>{t('profile.title')}</h1>
                    <p className="profile-subtitle">
                        {t('profile.subtitle')}
                    </p>
                </div>
            </div>

            <div className="container section profile-container">
                <div className="profile-sidebar">
                    <div className="profile-card">
                        <div className="profile-avatar text-center">
                            <div className="avatar-circle">
                                <User size={40} color="var(--color-gold)" />
                            </div>
                            <h3>{profileData.name}</h3>
                            <p className="text-muted">{t('profile.premium_member')}</p>
                        </div>

                        <div className="profile-details">
                            <div className="detail-item">
                                <Mail size={18} />
                                <span>{profileData.email}</span>
                            </div>
                            <div className="detail-item">
                                <Phone size={18} />
                                <span>{profileData.phone}</span>
                            </div>
                            <div className="detail-item">
                                <MapPin size={18} />
                                <span>{profileData.address}</span>
                            </div>
                        </div>
                        
                        {user && user.role === 'customer' && (
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <hr style={{ borderTop: '1px solid #eee', marginBottom: '20px' }} />
                                <Link to="/vendor-signup" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                                    <Store size={18} />
                                    {isRTL ? 'كن بائعاً معنا' : 'Become a Vendor'}
                                </Link>
                                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '10px' }}>
                                    {isRTL ? 'ابدأ ببيع منتجاتك الخاصة' : 'Start selling your own products'}
                                </p>
                            </div>
                        )}
                        {user && (user.role === 'super_admin' || user.role === 'admin') && (
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <hr style={{ borderTop: '1px solid #eee', marginBottom: '20px' }} />
                                <Link to="/admin" className="btn btn-gold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                                    <Store size={18} />
                                    {isRTL ? 'لوحة الإدارة' : 'Admin Dashboard'}
                                </Link>
                            </div>
                        )}
                        {user && user.role === 'regional_admin' && (
                            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center' }}>
                                <hr style={{ borderTop: '1px solid #eee', marginBottom: '10px' }} />
                                <Link to="/admin" className="btn btn-gold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                                    <Store size={18} />
                                    {isRTL ? 'لوحة الإدارة' : 'Admin Dashboard'}
                                </Link>
                                <Link to="/vendor" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}>
                                    <Store size={18} />
                                    {isRTL ? 'لوحة البائع والاشتراكات' : 'Vendor & Subscriptions'}
                                </Link>
                            </div>
                        )}
                        {user && user.role === 'vendor' && (
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <hr style={{ borderTop: '1px solid #eee', marginBottom: '20px' }} />
                                <Link to="/vendor" className="btn btn-gold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                                    <Store size={18} />
                                    {isRTL ? 'لوحة تحكم البائع' : 'Vendor Dashboard'}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className="profile-content">
                    {/* My Reservations */}
                    <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CalendarCheck size={22} style={{ color: 'var(--color-gold)' }} />
                        {isRTL ? 'حجوزاتي' : 'My Reservations'}
                    </h2>

                    {resvLoading ? (
                        <div className="no-orders text-center" style={{ padding: '30px' }}>
                            <p>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                        </div>
                    ) : reservations.length > 0 ? (
                        <div className="orders-list" style={{ marginBottom: '40px' }}>
                            {reservations.map(resv => {
                                const sty = statusStyles[resv.status] || statusStyles.pending;
                                return (
                                    <div key={resv.id} className="order-card" style={{ position: 'relative' }}>
                                        <div className="order-header">
                                            <div className="order-id">
                                                <Store size={18} className="gold-icon" />
                                                <span>{resv.shops?.name || (isRTL ? 'متجر' : 'Shop')}</span>
                                            </div>
                                            <span style={{
                                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem',
                                                fontWeight: '700', background: sty.bg, color: sty.color,
                                                textTransform: 'uppercase', letterSpacing: '0.5px'
                                            }}>
                                                {sty.label}
                                            </span>
                                        </div>
                                        <div className="order-body">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                {resv.products?.image_url && (
                                                    <img 
                                                        src={Array.isArray(resv.products.image_url) ? resv.products.image_url[0] : resv.products.image_url} 
                                                        alt="" 
                                                        style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} 
                                                    />
                                                )}
                                                <div>
                                                    <strong style={{ fontSize: '0.95rem' }}>{resv.products?.name}</strong>
                                                    <p style={{ fontSize: '0.8rem', color: '#888', margin: 0 }}>
                                                        {resv.products?.brand} • Qty: {resv.quantity}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="order-date" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={14} style={{ color: 'var(--color-gold)' }} />
                                                <span>
                                                    {new Date(resv.pickup_time_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                                                    {new Date(resv.pickup_time_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(resv.pickup_time_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {/* NEW: Verification Code for Pickup */}
                                            {(resv.status === 'pending' || resv.status === 'confirmed') && resv.verification_code && (
                                                <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(200, 169, 81, 0.05)', borderRadius: '8px', border: '1px dashed var(--color-gold)', textAlign: 'center' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>
                                                        {isRTL ? 'رمز الاستلام' : 'Pickup Code'}
                                                    </p>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '4px', color: 'var(--color-gold)' }}>
                                                        {resv.verification_code}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {(resv.status === 'pending' || resv.status === 'confirmed') && (
                                            <div className="order-footer" style={{ justifyContent: 'flex-end' }}>
                                                <button 
                                                    onClick={() => cancelReservation(resv.id)}
                                                    style={{
                                                        background: 'none', border: '1px solid #e5e5e5', borderRadius: '8px',
                                                        padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer',
                                                        color: '#dc2626', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}
                                                >
                                                    <XCircle size={14} /> {isRTL ? 'إلغاء' : 'Cancel'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="no-orders text-center" style={{ marginBottom: '40px' }}>
                            <CalendarCheck size={40} color="var(--color-gray)" style={{ opacity: 0.4 }} />
                            <p>{isRTL ? 'لا توجد حجوزات حالياً' : 'No reservations yet'}</p>
                        </div>
                    )}

                    {/* Order History */}
                    <h2 className="section-title">
                        {t('profile.order_history')}
                    </h2>

                    {userOrders.length > 0 ? (
                        <div className="orders-list">
                            {userOrders.map(order => (
                                <div key={order.id} className="order-card">
                                    <div className="order-header">
                                        <div className="order-id">
                                            <PackageIcon size={18} className="gold-icon" />
                                            <span>{order.id}</span>
                                        </div>
                                        <div className={`order-status status-${order.status.toLowerCase()}`}>
                                            {order.status === 'Pending' && <Clock size={16} />}
                                            {order.status === 'Shipped' && <CheckCircle size={16} />}
                                            <span>
                                                {order.status === 'Shipped' ? t('profile.status_shipped') : t('profile.status_pending')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="order-body">
                                        <div className="order-date">
                                            <strong>{t('profile.date')}</strong> {order.date}
                                        </div>
                                        <div className="order-items">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="order-item-line">
                                                    <span>{item.quantity}x {item.name}</span>
                                                    <span>{item.price} {t('common.currency')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="order-footer">
                                        <strong>{t('profile.total')}</strong>
                                        <span className="order-total">{order.total} {t('common.currency')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-orders text-center">
                            <PackageIcon size={48} color="var(--color-gray)" />
                            <p>{t('profile.no_orders')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
