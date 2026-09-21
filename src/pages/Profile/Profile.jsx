import React, { useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import { RegionContext } from '../../context/RegionContext';
import api from '../../utils/api_v1_0_2';
import { 
    User, Mail, Phone, MapPin, Package as PackageIcon, Clock, CheckCircle, 
    Store, CalendarCheck, XCircle, ShieldCheck, Smartphone, Crown, Sparkles, 
    ArrowRight, ArrowLeft, KeyRound, Ticket, ChevronDown, ChevronUp,
    MessageCircle, ExternalLink, Flame, Droplets, Compass, Camera, Trash2, Upload
} from 'lucide-react';
import './Profile.css';

const Profile = () => {
    const { t } = useTranslation();
    const { isRTL = false } = useOutletContext() || {};
    const { products, showToast } = useContext(ShopContext);
    const { user, updateUser } = useContext(AuthContext);
    const { formatPrice, currency } = useContext(RegionContext);

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

    // User Orders from Backend
    const [userOrders, setUserOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());
    const [vipQRCodes, setVipQRCodes] = useState({});

    // Scent DNA
    const [scentDNA, setScentDNA] = useState(null);

    // Fetch user reservations
    const [reservations, setReservations] = useState([]);
    const [resvLoading, setResvLoading] = useState(true);

    // Two-Factor Authentication (2FA) State & Operations
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled || false);
    const [setup2FAData, setSetup2FAData] = useState(null);
    const [otpVerifyCode, setOtpVerifyCode] = useState('');
    const [is2FALoading, setIs2FALoading] = useState(false);

    // Profile Avatar Upload & Management
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const handleAvatarUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            if (showToast) showToast(isRTL ? 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)' : 'Image is too large (max 5MB)', 'error');
            return;
        }

        setIsUploadingAvatar(true);
        const reader = new FileReader();
        reader.onload = () => {
            const img = new window.Image();
            img.onload = async () => {
                try {
                    const canvas = document.createElement('canvas');
                    const maxDim = 400;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxDim) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressed = canvas.toDataURL('image/jpeg', 0.85);

                    const res = await api.put(`/users/${user.id}`, { avatar_url: compressed });
                    const newAvatar = res.data?.user?.avatar_url || compressed;
                    if (updateUser) updateUser({ avatar_url: newAvatar });
                    if (showToast) showToast(isRTL ? 'تم تحديث صورتك الشخصية بنجاح!' : 'Profile photo updated successfully!', 'success');
                } catch (err) {
                    console.error('Failed to update avatar:', err);
                    if (showToast) showToast(isRTL ? 'فشل تحديث الصورة الشخصية' : 'Failed to update profile photo', 'error');
                } finally {
                    setIsUploadingAvatar(false);
                    e.target.value = '';
                }
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAvatar = async () => {
        if (!window.confirm(isRTL ? 'هل أنت متأكد من رغبتك في حذف الصورة الشخصية؟' : 'Are you sure you want to remove your profile photo?')) return;
        setIsUploadingAvatar(true);
        try {
            await api.put(`/users/${user.id}`, { avatar_url: '' });
            if (updateUser) updateUser({ avatar_url: '' });
            if (showToast) showToast(isRTL ? 'تم حذف الصورة الشخصية' : 'Profile photo removed', 'info');
        } catch (err) {
            console.error('Failed to remove avatar:', err);
            if (showToast) showToast(isRTL ? 'فشل حذف الصورة' : 'Failed to remove photo', 'error');
        } finally {
            setIsUploadingAvatar(false);
        }
    };
    const [show2FAForm, setShow2FAForm] = useState(false);

    // Load Scent DNA from localStorage
    useEffect(() => {
        try {
            const savedDNA = localStorage.getItem('perfumehub_scent_dna');
            if (savedDNA) {
                setScentDNA(JSON.parse(savedDNA));
            }
        } catch (e) {
            console.error("Failed to parse scent DNA:", e);
        }
    }, []);

    // Fetch Authenticated Customer Orders & Sub-Orders
    useEffect(() => {
        const fetchOrders = async () => {
            if (!user) {
                setOrdersLoading(false);
                return;
            }
            try {
                const res = await api.get('/orders');
                const list = Array.isArray(res.data) ? res.data : [];
                setUserOrders(list);

                // Generate local QR codes for any pickup orders
                list.forEach(order => {
                    const isPickup = order.fulfillment_type === 'pickup';
                    if (isPickup) {
                        const passCode = (String(order.id).replace(/\D/g, '') || '948271').slice(-6).padStart(6, '0');
                        QRCode.toDataURL(JSON.stringify({ orderId: order.order_id || `ORD-${order.id}`, passCode }), {
                            width: 120,
                            margin: 1,
                            color: { dark: '#111111', light: '#ffffff' }
                        }).then(url => {
                            setVipQRCodes(prev => ({ ...prev, [order.id]: url }));
                        }).catch(console.error);
                    }
                });
            } catch (err) {
                console.error("Failed to load customer orders:", err);
            } finally {
                setOrdersLoading(false);
            }
        };

        fetchOrders();
    }, [user]);

    // Fetch user reservations
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

    const toggleExpandOrder = (orderId) => {
        setExpandedOrderIds(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

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

    // 5-Stage Stepper configuration for delivery & pickup
    const getDeliverySteps = () => [
        { key: 'placed', label: isRTL ? 'تم تقديم الطلب' : 'Order Placed' },
        { key: 'confirmed', label: isRTL ? 'تأكيد البوتيك' : 'Boutique Confirmed' },
        { key: 'prepared', label: isRTL ? 'تجهيز وتغليف العطر' : 'Fragrance Packaged' },
        { key: 'shipping', label: isRTL ? 'خرج للتوصيل' : 'Out for Delivery' },
        { key: 'delivered', label: isRTL ? 'تم التوصيل بنجاح' : 'Delivered' }
    ];

    const getPickupSteps = () => [
        { key: 'placed', label: isRTL ? 'تم الحجز' : 'Reserved' },
        { key: 'confirmed', label: isRTL ? 'تأكيد البوتيك' : 'Boutique Confirmed' },
        { key: 'prepared', label: isRTL ? 'جاهز بالفرع' : 'Ready in Shop' },
        { key: 'collected', label: isRTL ? 'تم الاستلام' : 'Collected' }
    ];

    const getOrderActiveStepIndex = (status, isPickup) => {
        const s = (status || '').toLowerCase();
        if (s === 'cancelled') return -1;
        if (isPickup) {
            if (s === 'delivered' || s === 'completed' || s === 'collected') return 3;
            if (s === 'ready' || s === 'packaged' || s === 'prepared') return 2;
            if (s === 'confirmed' || s === 'accepted' || s === 'processing') return 1;
            return 0;
        } else {
            if (s === 'delivered' || s === 'completed') return 4;
            if (s === 'shipped' || s === 'out_for_delivery') return 3;
            if (s === 'ready' || s === 'packaged' || s === 'prepared') return 2;
            if (s === 'confirmed' || s === 'accepted' || s === 'processing') return 1;
            return 0;
        }
    };

    // Filter products matching Scent DNA for "Handpicked For Your Profile" carousel
    const handpickedProducts = React.useMemo(() => {
        if (!scentDNA || !Array.isArray(products) || products.length === 0) return [];
        return products.filter(p => {
            const family = scentDNA.primaryFamily?.toLowerCase();
            const cat = Array.isArray(p.category) ? p.category.join(' ').toLowerCase() : String(p.category || '').toLowerCase();
            const notes = Array.isArray(p.notes) ? p.notes.join(' ').toLowerCase() : String(p.notes || '').toLowerCase();
            const name = String(p.name || '').toLowerCase();

            const familyMatch = family && (cat.includes(family) || name.includes(family));
            const noteMatch = scentDNA.keyNotes?.some(k => notes.includes(k.toLowerCase()) || name.includes(k.toLowerCase()));
            return familyMatch || noteMatch;
        }).slice(0, 4);
    }, [scentDNA, products]);

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
                            <div className="avatar-circle" style={{ position: 'relative' }}>
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt={profileData.name} className="avatar-img" />
                                ) : (
                                    <span className="avatar-initials">{getUserInitials(profileData.name)}</span>
                                )}
                                {user?.role === 'super_admin' && (
                                    <div className="avatar-badge-crown" title="Super Admin" style={{ top: '-4px', right: '-4px', bottom: 'auto' }}>
                                        <Crown size={13} fill="#000000" color="#000000" />
                                    </div>
                                )}
                                <label 
                                    htmlFor="profile-avatar-upload-input" 
                                    className="avatar-edit-trigger" 
                                    title={isRTL ? 'تعديل / رفع الصورة الشخصية' : 'Upload or change profile photo'}
                                >
                                    <Camera size={13} />
                                </label>
                                <input 
                                    type="file" 
                                    id="profile-avatar-upload-input" 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                    onChange={handleAvatarUpload} 
                                    disabled={isUploadingAvatar}
                                />
                            </div>

                            {user?.avatar_url && (
                                <div className="avatar-actions-row">
                                    <button 
                                        type="button" 
                                        className="btn-avatar-remove" 
                                        onClick={handleRemoveAvatar}
                                        disabled={isUploadingAvatar}
                                    >
                                        <Trash2 size={12} />
                                        <span>{isRTL ? 'حذف الصورة' : 'Remove Photo'}</span>
                                    </button>
                                </div>
                            )}

                            <h3 className="profile-user-name" style={{ marginTop: user?.avatar_url ? '4px' : '0' }}>{profileData.name}</h3>
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
                    {/* ═══════════════════════════════════════════════════════════
                        SCENT GENIE OLFACTIVE DNA HUB
                        ═══════════════════════════════════════════════════════════ */}
                    {scentDNA ? (
                        <div className="scent-dna-container animate-fade-in">
                            <div className="scent-dna-header">
                                <div className="scent-dna-title">
                                    <Sparkles size={22} />
                                    <h3>{isRTL ? 'بصمتك العطرية الخاصة (Olfactive DNA)' : 'Your Olfactive DNA Signature'}</h3>
                                </div>
                                <span className="dna-family-badge">
                                    {scentDNA.primaryFamily}
                                </span>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                                {isRTL 
                                    ? 'تم تحليل ذوقك العطري بناءً على اختياراتك في جني العطور. إليك توزيع النفحات وتوصياتنا الخاصة.' 
                                    : 'Analyzed by PerfumeHub Scent Genie based on your personal fragrance notes & lifestyle.'}
                            </p>

                            {/* Breakdown Progress Bars */}
                            {scentDNA.breakdown && (
                                <div className="dna-breakdown-grid">
                                    {Object.entries(scentDNA.breakdown).map(([family, pct]) => (
                                        <div key={family} className="dna-bar-item">
                                            <div className="dna-bar-labels">
                                                <span>{family}</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="dna-progress-track">
                                                <div className="dna-progress-fill" style={{ width: `${pct}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Preferred Notes Tags */}
                            {scentDNA.keyNotes && scentDNA.keyNotes.length > 0 && (
                                <div className="dna-notes-row">
                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                                        {isRTL ? 'النوتات المفضلة:' : 'Dominant Accords:'}
                                    </span>
                                    {scentDNA.keyNotes.map(n => (
                                        <span key={n} className="dna-note-pill">✨ {n}</span>
                                    ))}
                                </div>
                            )}

                            {/* Handpicked For Your Profile Carousel */}
                            {handpickedProducts.length > 0 && (
                                <div>
                                    <div className="handpicked-heading">
                                        <Flame size={18} />
                                        <span>{isRTL ? 'مختارات مصممة خصيصاً لذوقك' : 'Handpicked For Your Profile'}</span>
                                    </div>
                                    <div className="handpicked-grid">
                                        {handpickedProducts.map(p => (
                                            <Link key={p.id} to={`/product/${p.id}`} className="handpicked-item">
                                                <img src={Array.isArray(p.image) ? p.image[0] : p.image} alt={p.name} />
                                                <h4>{p.name}</h4>
                                                <p>{p.brand}</p>
                                                <div className="handpicked-price">
                                                    {formatPrice(p.price, currency, isRTL)}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="scent-dna-invite animate-fade-in">
                            <div>
                                <h3>{isRTL ? 'اكتشف بصمتك العطرية (Olfactive DNA)' : 'Unlock Your Olfactive DNA'}</h3>
                                <p>
                                    {isRTL 
                                        ? 'خض تجربة جني العطور التفاعلية لتحليل ذوقك وتوليد خريطة عطرية مخصصة لك مع ترشيحات نادرة.' 
                                        : 'Take our 60-second Scent Genie quiz to discover your olfactive archetype and get handpicked fragrance matches.'}
                                </p>
                            </div>
                            <Link to="/scent-genie" className="btn-start-dna">
                                <Sparkles size={16} />
                                <span>{isRTL ? 'ابدأ الاستكشاف الآن' : 'Start Scent Genie'}</span>
                            </Link>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        MY RESERVATIONS
                        ═══════════════════════════════════════════════════════════ */}
                    <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CalendarCheck size={22} style={{ color: 'var(--color-gold)' }} />
                        {isRTL ? 'حجوزاتي في البوتيك' : 'Boutique Reservations'}
                    </h2>

                    {resvLoading ? (
                        <div className="no-orders text-center" style={{ padding: '30px' }}>
                            <p>{isRTL ? 'جاري التحميل...' : 'Loading reservations...'}</p>
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
                                                <span>{resv.shops?.name || (isRTL ? 'بوتيك قطري' : 'Boutique')}</span>
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

                                            {/* Verification Code for Pickup */}
                                            {(resv.status === 'pending' || resv.status === 'confirmed') && resv.verification_code && (
                                                <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(200, 169, 81, 0.05)', borderRadius: '8px', border: '1px dashed var(--color-gold)', textAlign: 'center' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>
                                                        {isRTL ? 'رمز الاستلام VIP' : 'VIP Pickup Pass Code'}
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
                                                    <XCircle size={14} /> {isRTL ? 'إلغاء الحجز' : 'Cancel Reservation'}
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
                            <p>{isRTL ? 'لا توجد حجوزات حالياً' : 'No boutique reservations found'}</p>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        LIVE ORDER TRACKING & HISTORY (5-STAGE TRACKER)
                        ═══════════════════════════════════════════════════════════ */}
                    <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PackageIcon size={22} style={{ color: 'var(--color-gold)' }} />
                        {isRTL ? 'طلباتي ومتابعة التوصيل المباشر' : 'My Orders & Live Courier Tracker'}
                    </h2>

                    {ordersLoading ? (
                        <div className="no-orders text-center">
                            <p>{isRTL ? 'جاري جلب الطلبات...' : 'Loading your luxury orders...'}</p>
                        </div>
                    ) : userOrders.length > 0 ? (
                        <div className="orders-list">
                            {userOrders.map(order => {
                                const isPickup = order.fulfillment_type === 'pickup';
                                const steps = isPickup ? getPickupSteps() : getDeliverySteps();
                                const activeIndex = getOrderActiveStepIndex(order.status, isPickup);
                                const isExpanded = expandedOrderIds.has(order.id);
                                const passCode = (String(order.id).replace(/\D/g, '') || '948271').slice(-6).padStart(6, '0');
                                const qrImg = vipQRCodes[order.id];

                                return (
                                    <div key={order.id} className="order-card">
                                        <div className="order-header">
                                            <div className="order-id">
                                                <PackageIcon size={18} className="gold-icon" />
                                                <span>{order.order_id || `ORD-${order.id}`}</span>
                                            </div>
                                            <div className={`order-status status-${(order.status || 'pending').toLowerCase()}`}>
                                                {order.status === 'delivered' || order.status === 'completed' ? (
                                                    <CheckCircle size={15} />
                                                ) : (
                                                    <Clock size={15} />
                                                )}
                                                <span>{order.status || 'Pending'}</span>
                                            </div>
                                        </div>

                                        {/* 5-Stage Visual Progress Stepper */}
                                        <div className="order-stepper-wrapper">
                                            <div className="order-stepper">
                                                {/* Connector Background Line */}
                                                <div className="stepper-connector">
                                                    <div 
                                                        className="stepper-connector-fill" 
                                                        style={{ 
                                                            width: activeIndex >= 0 
                                                                ? `${Math.min(100, (activeIndex / (steps.length - 1)) * 100)}%` 
                                                                : '0%' 
                                                        }}
                                                    />
                                                </div>

                                                {/* Step Nodes */}
                                                {steps.map((step, idx) => {
                                                    const isCompleted = activeIndex > idx;
                                                    const isCurrent = activeIndex === idx;
                                                    return (
                                                        <div key={step.key} className="stepper-step-item">
                                                            <div className={`step-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                                                                {isCompleted ? '✓' : idx + 1}
                                                            </div>
                                                            <span className={`step-label ${isCurrent ? 'active' : ''}`}>
                                                                {step.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Click & Collect Digital VIP Pass Preview (If Pickup) */}
                                        {isPickup && (
                                            <div className="profile-vip-pass">
                                                <div className="vip-pass-details">
                                                    <div className="vip-pass-title">
                                                        <Ticket size={16} />
                                                        <span>{isRTL ? 'بطاقة استلام VIP الرقمية' : 'Digital VIP Pickup Pass'}</span>
                                                    </div>
                                                    <div className="vip-pass-code">{passCode}</div>
                                                    <div className="vip-pass-instruction">
                                                        {isRTL 
                                                            ? 'أبرز الرمز أو امسح الباركود عند زيارة البوتيك لاستلام عطرك فوراً.' 
                                                            : 'Present this 6-digit PIN or QR code at the boutique counter.'}
                                                    </div>
                                                </div>
                                                {qrImg && (
                                                    <div className="vip-pass-qr">
                                                        <img src={qrImg} alt="VIP Pass QR" />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="order-body">
                                            <div className="order-date">
                                                <strong>{t('profile.date')}</strong> {order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB') : order.date || 'Recent'}
                                                {order.shipping_address && (
                                                    <div style={{ marginTop: '4px', color: '#475569' }}>
                                                        <strong>{isRTL ? 'العنوان:' : 'Address:'}</strong> {order.shipping_address}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Primary Order Items */}
                                            <div className="order-items">
                                                {(order.items || []).map((item, idx) => (
                                                    <div key={idx} className="order-item-line">
                                                        <span>
                                                            {item.quantity}x {item.name || item.product?.name}
                                                            {item.size ? ` (${typeof item.size === 'object' ? item.size.name : item.size})` : ''}
                                                        </span>
                                                        <span>{formatPrice((item.price || item.selectedPrice || 0) * (item.quantity || 1), currency, isRTL)}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Multi-Vendor Sub-Orders Breakdown */}
                                            {order.sub_orders && order.sub_orders.length > 0 && (
                                                <div className="sub-orders-section">
                                                    <div 
                                                        className="sub-orders-header" 
                                                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                                        onClick={() => toggleExpandOrder(order.id)}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Store size={16} color="#c8a951" />
                                                            <span>
                                                                {isRTL ? `المتاجر المنفذة للطلب (${order.sub_orders.length} فروع)` : `Fulfilling Boutiques (${order.sub_orders.length} Shops)`}
                                                            </span>
                                                        </div>
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>

                                                    {isExpanded && (
                                                        <div style={{ marginTop: '10px' }}>
                                                            {order.sub_orders.map(sub => {
                                                                const shopWa = sub.shops?.whatsapp_number?.replace(/\D/g, '');
                                                                return (
                                                                    <div key={sub.id} className="sub-order-card">
                                                                        <div className="sub-order-top">
                                                                            <div className="sub-order-shop-info">
                                                                                <Store size={15} />
                                                                                <span>{sub.shops?.name || 'PerfumeHub Qatar Boutique'}</span>
                                                                            </div>
                                                                            <span className={`order-status status-${(sub.status || 'pending').toLowerCase()}`}>
                                                                                {sub.status || 'Pending'}
                                                                            </span>
                                                                        </div>
                                                                        {sub.shops?.address && (
                                                                            <div className="sub-order-shop-addr">
                                                                                {sub.shops.address}
                                                                            </div>
                                                                        )}
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                                                Sub-order Total: <strong>{formatPrice(sub.total_amount, currency, isRTL)}</strong>
                                                                            </span>
                                                                            {shopWa && (
                                                                                <a 
                                                                                    href={`https://api.whatsapp.com/send?phone=${shopWa}&text=${encodeURIComponent(`Hello ${sub.shops?.name}, regarding my PerfumeHub order ${order.order_id || order.id}`)}`}
                                                                                    target="_blank" 
                                                                                    rel="noopener noreferrer"
                                                                                    className="btn-boutique-wa"
                                                                                >
                                                                                    <MessageCircle size={14} />
                                                                                    <span>{isRTL ? 'مراسلة البوتيك' : 'Chat with Boutique'}</span>
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="order-footer">
                                            <strong>{t('profile.total')}</strong>
                                            <span className="order-total">{formatPrice(order.total, currency, isRTL)}</span>
                                        </div>
                                    </div>
                                );
                            })}
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
