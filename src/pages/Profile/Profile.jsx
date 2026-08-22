import React, { useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api_v1_0_2';
import { User, Mail, Phone, MapPin, Package as PackageIcon, Clock, CheckCircle, Store, CalendarCheck, XCircle, ShieldCheck, Smartphone } from 'lucide-react';
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

    // Two-Factor Authentication (2FA) State & Operations
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled || false);
    const [setup2FAData, setSetup2FAData] = useState(null);
    const [otpVerifyCode, setOtpVerifyCode] = useState('');
    const [is2FALoading, setIs2FALoading] = useState(false);
    const [show2FAForm, setShow2FAForm] = useState(false);

    const handleInitiate2FA = async () => {
        setIs2FALoading(true);
        try {
            const res = await api.post('/auth/2fa/setup');
            if (res.data.success) {
                setSetup2FAData({
                    secret: res.data.secret,
                    qrCodeUrl: res.data.qrCodeUrl
                });
                setShow2FAForm(true);
            }
        } catch (e) {
            console.error("2FA setup failed:", e);
            alert(isRTL ? "فشل بدء إعداد التحقق الثنائي." : "Failed to start 2FA setup.");
        } finally {
            setIs2FALoading(false);
        }
    };

    const handleConfirm2FA = async () => {
        if (!otpVerifyCode) return;
        setIs2FALoading(true);
        try {
            const res = await api.post('/auth/2fa/enable', { token: otpVerifyCode });
            if (res.data.success) {
                setTwoFactorEnabled(true);
                setShow2FAForm(false);
                setSetup2FAData(null);
                setOtpVerifyCode('');
                alert(isRTL ? "تم تفعيل التحقق الثنائي بنجاح!" : "Two-factor authentication enabled successfully!");
            }
        } catch (e) {
            console.error("2FA verification failed:", e);
            alert(e.response?.data?.error || (isRTL ? "رمز التحقق غير صحيح." : "Invalid verification code."));
        } finally {
            setIs2FALoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!window.confirm(isRTL ? "هل أنت متأكد من تعطيل التحقق الثنائي؟" : "Are you sure you want to disable 2FA?")) return;
        setIs2FALoading(true);
        try {
            await api.put(`/users/${user.id}`, { two_factor_enabled: false, two_factor_secret: null });
            setTwoFactorEnabled(false);
            alert(isRTL ? "تم تعطيل التحقق الثنائي." : "2FA disabled successfully.");
        } catch (e) {
            console.error("Failed to disable 2FA:", e);
            alert(isRTL ? "فشل تعطيل التحقق الثنائي." : "Failed to disable 2FA.");
        } finally {
            setIs2FALoading(false);
        }
    };

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

                        {/* Two-Factor Authentication (2FA) Setup */}
                        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'left', direction: isRTL ? 'rtl' : 'ltr' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
                                <ShieldCheck size={18} style={{ color: 'var(--color-gold)' }} />
                                {isRTL ? 'التحقق الثنائي (2FA)' : 'Two-Factor Authentication'}
                            </h4>
                            
                            {twoFactorEnabled ? (
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: '#16a34a', margin: '0 0 10px 0', fontWeight: '600' }}>
                                        ✓ {isRTL ? 'نشط ومفعل' : 'Enabled and protecting your account'}
                                    </p>
                                    <button 
                                        type="button" 
                                        className="btn btn-outline" 
                                        onClick={handleDisable2FA}
                                        disabled={is2FALoading}
                                        style={{ width: '100%', padding: '6px', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef444433' }}
                                    >
                                        {isRTL ? 'تعطيل التحقق الثنائي' : 'Disable 2FA'}
                                    </button>
                                </div>
                            ) : show2FAForm && setup2FAData ? (
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 10px 0' }}>
                                        {isRTL 
                                            ? 'امسح الرمز أدناه بتطبيق Google Authenticator ثم أدخل رمز التحقق.' 
                                            : 'Scan this QR code with Google Authenticator or custom TOTP app.'}
                                    </p>
                                    <div style={{ textAlign: 'center', margin: '10px 0' }}>
                                        <img src={setup2FAData.qrCodeUrl} alt="QR Code" style={{ width: '130px', height: '130px', background: '#fff', padding: '4px', border: '1px solid #cbd5e1', display: 'inline-block' }} />
                                    </div>
                                    <div style={{ marginBottom: '10px' }}>
                                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                            {isRTL ? 'أو أدخل المفتاح يدوياً:' : 'Or manual setup key:'}
                                        </label>
                                        <code style={{ fontSize: '0.75rem', display: 'block', background: '#e2e8f0', padding: '4px', borderRadius: '4px', wordBreak: 'break-all', textAlign: 'center' }}>
                                            {setup2FAData.secret}
                                        </code>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                        <input 
                                            type="text" 
                                            placeholder="123456" 
                                            maxLength="6"
                                            value={otpVerifyCode}
                                            onChange={(e) => setOtpVerifyCode(e.target.value)}
                                            style={{ flex: 1, padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', height: '32px', minWidth: 0 }}
                                        />
                                        <button 
                                            type="button" 
                                            className="btn btn-gold" 
                                            onClick={handleConfirm2FA}
                                            disabled={is2FALoading || !otpVerifyCode}
                                            style={{ padding: '0 10px', fontSize: '0.8rem', height: '32px' }}
                                        >
                                            {isRTL ? 'تفعيل' : 'Enable'}
                                        </button>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="text-link" 
                                        onClick={() => { setShow2FAForm(false); setSetup2FAData(null); }}
                                        style={{ fontSize: '0.75rem', marginTop: '8px', color: '#64748b', display: 'block', textAlign: 'center', width: '100%' }}
                                    >
                                        {isRTL ? 'إلغاء' : 'Cancel'}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 10px 0' }}>
                                        {isRTL 
                                            ? 'قم بحماية حسابك بإضافة خطوة أمان إضافية باستخدام تطبيق التحقق.' 
                                            : 'Add an extra layer of security to your account using a generator application.'}
                                    </p>
                                    <button 
                                        type="button" 
                                        className="btn btn-gold" 
                                        onClick={handleInitiate2FA}
                                        disabled={is2FALoading}
                                        style={{ width: '100%', padding: '6px', fontSize: '0.8rem' }}
                                    >
                                        {is2FALoading ? (isRTL ? 'جاري التحميل...' : 'Loading...') : (isRTL ? 'تفعيل التحقق الثنائي' : 'Setup 2FA')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Connected Devices Management for SA, RA, Vendor */}
                        {['super_admin', 'admin', 'regional_admin', 'vendor'].includes(user?.role) && (
                            <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'left', direction: isRTL ? 'rtl' : 'ltr' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
                                    <Smartphone size={18} style={{ color: 'var(--color-gold)' }} />
                                    {isRTL ? 'الأجهزة المسجلة لحسابك' : 'Connected Devices'}
                                </h4>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px 0' }}>
                                    {isRTL 
                                        ? 'تحكم في المتصفحات والأجهزة النشطة التي سجلت الدخول بحسابك.' 
                                        : 'Manage and monitor all active login sessions across your devices.'}
                                </p>
                                <Link 
                                    to={user?.role === 'vendor' ? '/vendor-panel' : '/admin'} 
                                    className="btn btn-outline" 
                                    style={{ width: '100%', padding: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', color: '#1e293b', borderColor: '#cbd5e1', fontWeight: '600' }}
                                >
                                    <Smartphone size={14} color="#c8a951" />
                                    {isRTL ? 'فتح إدارة الأجهزة في لوحة التحكم' : 'Manage Devices in Dashboard'}
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
