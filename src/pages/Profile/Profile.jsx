import React, { useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api_v1_0_2';
import { 
    User, Mail, Phone, MapPin, Package as PackageIcon, Clock, CheckCircle, 
    Store, CalendarCheck, XCircle, ShieldCheck, Smartphone, Crown, Sparkles, 
    ArrowRight, ArrowLeft, KeyRound, QrCode
} from 'lucide-react';
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
        phone: user?.phone || '',
        address: user?.address || ''
    };

    // Helper for Monogram Initials
    const getUserInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    // Helper for Role Tag Display
    const getRoleBadge = (role) => {
        switch(role) {
            case 'super_admin': 
                return { label: isRTL ? '👑 المدير العام' : '👑 Super Admin', className: 'role-pill super-admin' };
            case 'admin': 
                return { label: isRTL ? '🛡️ مسؤول النظام' : '🛡️ Administrator', className: 'role-pill admin' };
            case 'regional_admin': 
                return { label: isRTL ? '🌐 مسؤول إقليمي' : '🌐 Regional Admin', className: 'role-pill regional-admin' };
            case 'vendor': 
                return { label: isRTL ? '🏪 بائع معتمد' : '🏪 Verified Vendor', className: 'role-pill vendor' };
            default: 
                return { label: isRTL ? '💎 عضو مميز' : '💎 Premium Member', className: 'role-pill customer' };
        }
    };

    const roleInfo = getRoleBadge(user?.role);

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
                    <span className="luxury-eyebrow">
                        <Sparkles size={14} color="#c8a951" /> {isRTL ? 'الحساب الشخصي الفاخر' : 'Private Client Sanctuary'}
                    </span>
                    <h1>{t('profile.title')}</h1>
                    <p className="profile-subtitle">
                        {t('profile.subtitle')}
                    </p>
                </div>
            </div>

            <div className="container section profile-container">
                <div className="profile-sidebar">
                    <div className="profile-card">
                        {/* Luxury Profile Avatar Header */}
                        <div className="profile-avatar text-center">
                            <div className="avatar-circle">
                                <span className="avatar-initials">{getUserInitials(profileData.name)}</span>
                                {user?.role === 'super_admin' && (
                                    <div className="avatar-badge-crown" title="Super Admin">
                                        <Crown size={13} fill="#000000" color="#000000" />
                                    </div>
                                )}
                            </div>
                            <h3 className="profile-user-name">{profileData.name}</h3>
                            <div className="profile-role-wrapper">
                                <span className={roleInfo.className}>
                                    {roleInfo.label}
                                </span>
                            </div>
                        </div>

                        {/* Contact & Profile Info Capsules */}
                        <div className="profile-details">
                            <div className="profile-info-pill">
                                <div className="info-icon-bubble">
                                    <Mail size={16} />
                                </div>
                                <div className="info-text-group">
                                    <span className="info-label">{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</span>
                                    <span className="info-value">{profileData.email || '—'}</span>
                                </div>
                            </div>

                            <div className="profile-info-pill">
                                <div className="info-icon-bubble">
                                    <Phone size={16} />
                                </div>
                                <div className="info-text-group">
                                    <span className="info-label">{isRTL ? 'رقم الهاتف' : 'Phone Number'}</span>
                                    <span className={`info-value ${!profileData.phone ? 'muted-text' : ''}`}>
                                        {profileData.phone || (isRTL ? 'غير محدد' : 'Not provided')}
                                    </span>
                                </div>
                            </div>

                            <div className="profile-info-pill">
                                <div className="info-icon-bubble">
                                    <MapPin size={16} />
                                </div>
                                <div className="info-text-group">
                                    <span className="info-label">{isRTL ? 'عنوان التوصيل' : 'Delivery Address'}</span>
                                    <span className={`info-value ${!profileData.address ? 'muted-text' : ''}`}>
                                        {profileData.address || (isRTL ? 'غير محدد' : 'Not provided')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Role Based CTA Buttons */}
                        {user && user.role === 'customer' && (
                            <div className="profile-action-box">
                                <Link to="/vendor-signup" className="btn btn-profile-outline">
                                    <Store size={17} />
                                    <span>{isRTL ? 'كن بائعاً معنا' : 'Become a Partner Vendor'}</span>
                                </Link>
                            </div>
                        )}
                        {user && (user.role === 'super_admin' || user.role === 'admin') && (
                            <div className="profile-action-box">
                                <Link to="/admin" className="btn btn-profile-gold">
                                    <Store size={18} />
                                    <span>{isRTL ? 'لوحة التحكم الإدارية' : 'Admin Dashboard'}</span>
                                    {isRTL ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                                </Link>
                            </div>
                        )}
                        {user && user.role === 'regional_admin' && (
                            <div className="profile-action-box" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <Link to="/admin" className="btn btn-profile-gold">
                                    <Store size={18} />
                                    <span>{isRTL ? 'لوحة الإدارة' : 'Admin Dashboard'}</span>
                                    {isRTL ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                                </Link>
                                <Link to="/vendor" className="btn btn-profile-outline">
                                    <Store size={17} />
                                    <span>{isRTL ? 'لوحة البائع والاشتراكات' : 'Vendor & Subscriptions'}</span>
                                </Link>
                            </div>
                        )}
                        {user && user.role === 'vendor' && (
                            <div className="profile-action-box">
                                <Link to="/vendor" className="btn btn-profile-gold">
                                    <Store size={18} />
                                    <span>{isRTL ? 'لوحة تحكم البائع' : 'Vendor Dashboard'}</span>
                                    {isRTL ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                                </Link>
                            </div>
                        )}

                        {/* Security Feature Card: Two-Factor Authentication (2FA) */}
                        <div className="profile-feature-card">
                            <div className="feature-card-header">
                                <div className="feature-title-group">
                                    <ShieldCheck size={18} className="feature-icon" />
                                    <h4>{isRTL ? 'التحقق الثنائي (2FA)' : 'Two-Factor Auth'}</h4>
                                </div>
                                <span className={`security-status-badge ${twoFactorEnabled ? 'active' : 'inactive'}`}>
                                    {twoFactorEnabled ? (isRTL ? 'مفعل' : 'Active') : (isRTL ? 'غير مفعل' : 'Disabled')}
                                </span>
                            </div>
                            
                            {twoFactorEnabled ? (
                                <div className="feature-card-body">
                                    <p className="feature-desc success-desc">
                                        ✓ {isRTL ? 'حسابك محمي بطبقة أمان TOTP إضافية.' : 'Your account is secured with 2FA protection.'}
                                    </p>
                                    <button 
                                        type="button" 
                                        className="btn btn-profile-danger" 
                                        onClick={handleDisable2FA}
                                        disabled={is2FALoading}
                                    >
                                        {isRTL ? 'تعطيل التحقق الثنائي' : 'Disable 2FA'}
                                    </button>
                                </div>
                            ) : show2FAForm && setup2FAData ? (
                                <div className="setup-2fa-container">
                                    <p className="setup-2fa-hint">
                                        {isRTL 
                                            ? 'امسح رمز QR بتطبيق Google Authenticator ثم أدخل الرمز المكون من 6 أرقام.' 
                                            : 'Scan this QR code with Google Authenticator, then enter the 6-digit code.'}
                                    </p>
                                    <div className="qr-wrapper">
                                        <img src={setup2FAData.qrCodeUrl} alt="2FA QR Code" />
                                    </div>
                                    <div className="manual-key-box">
                                        <span className="manual-key-label">{isRTL ? 'المفتاح اليدوي:' : 'Secret Key:'}</span>
                                        <code>{setup2FAData.secret}</code>
                                    </div>
                                    <div className="otp-input-row">
                                        <input 
                                            type="text" 
                                            placeholder="123456" 
                                            maxLength="6"
                                            value={otpVerifyCode}
                                            onChange={(e) => setOtpVerifyCode(e.target.value)}
                                            className="otp-input"
                                        />
                                        <button 
                                            type="button" 
                                            className="btn btn-profile-gold-sm" 
                                            onClick={handleConfirm2FA}
                                            disabled={is2FALoading || !otpVerifyCode}
                                        >
                                            {isRTL ? 'تفعيل' : 'Enable'}
                                        </button>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="btn-cancel-link" 
                                        onClick={() => { setShow2FAForm(false); setSetup2FAData(null); }}
                                    >
                                        {isRTL ? 'إلغاء' : 'Cancel'}
                                    </button>
                                </div>
                            ) : (
                                <div className="feature-card-body">
                                    <p className="feature-desc">
                                        {isRTL 
                                            ? 'أضف طبقة أمان مشددة لحماية حسابك من الاختراق.' 
                                            : 'Protect your account with extra TOTP authenticator security.'}
                                    </p>
                                    <button 
                                        type="button" 
                                        className="btn btn-profile-subtle-gold" 
                                        onClick={handleInitiate2FA}
                                        disabled={is2FALoading}
                                    >
                                        <KeyRound size={14} />
                                        {is2FALoading ? (isRTL ? 'جاري التحميل...' : 'Loading...') : (isRTL ? 'إعداد التحقق الثنائي' : 'Setup 2FA')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Security Feature Card: Connected Devices Management */}
                        {['super_admin', 'admin', 'regional_admin', 'vendor'].includes(user?.role) && (
                            <div className="profile-feature-card">
                                <div className="feature-card-header">
                                    <div className="feature-title-group">
                                        <Smartphone size={18} className="feature-icon" />
                                        <h4>{isRTL ? 'الأجهزة المسجلة' : 'Connected Devices'}</h4>
                                    </div>
                                </div>
                                <div className="feature-card-body">
                                    <p className="feature-desc">
                                        {isRTL 
                                            ? 'راقب وتحكم بجميع الجلسات والأجهزة النشطة.' 
                                            : 'Monitor active browser sessions and trusted devices.'}
                                    </p>
                                    <Link 
                                        to={user?.role === 'vendor' ? '/vendor-panel' : '/admin'} 
                                        className="btn btn-profile-outline" 
                                    >
                                        <Smartphone size={14} />
                                        <span>{isRTL ? 'إدارة الأجهزة' : 'Manage Devices'}</span>
                                        {isRTL ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                                    </Link>
                                </div>
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
