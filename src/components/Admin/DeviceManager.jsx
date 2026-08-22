import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { 
    Smartphone, 
    Laptop, 
    Tablet, 
    Monitor, 
    ShieldCheck, 
    LogOut, 
    RefreshCw, 
    CheckCircle2, 
    AlertTriangle, 
    Globe, 
    Clock, 
    XCircle,
    KeyRound,
    UserCheck,
    Check
} from 'lucide-react';
import api from '../../utils/api_v1_0_2';

const DeviceManager = ({ isRTL }) => {
    const { user } = useContext(AuthContext);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });

    const isAuthorized = user && ['super_admin', 'admin', 'regional_admin', 'vendor'].includes(user.role);

    const fetchDevices = async () => {
        if (!isAuthorized) return;
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/auth/devices');
            if (response.data?.success) {
                setDevices(response.data.devices || []);
            }
        } catch (err) {
            setError(err.response?.data?.error || (isRTL ? 'فشل تحميل بيانات الأجهزة' : 'Failed to fetch device sessions'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthorized) {
            fetchDevices();
        }
    }, [user?.id]);

    const handleRevokeDevice = (device) => {
        setConfirmModal({
            isOpen: true,
            title: isRTL ? 'تسجيل خروج الجهاز' : 'Log Out Device',
            message: isRTL 
                ? `هل أنت متأكد من تسجيل خروج هذا الجهاز (${device.deviceName}) من حسابك؟`
                : `Are you sure you want to log out this device (${device.deviceName}) from your account?`,
            onConfirm: async () => {
                try {
                    setActionLoading(device.id);
                    await api.post('/auth/devices/revoke', { tokenId: device.id, sessionId: device.sessionId });
                    setSuccessMessage(isRTL ? 'تم تسجيل خروج الجهاز بنجاح' : 'Device session revoked successfully');
                    setTimeout(() => setSuccessMessage(''), 4000);
                    await fetchDevices();
                } catch (err) {
                    setError(err.response?.data?.error || (isRTL ? 'فشل تسجيل خروج الجهاز' : 'Failed to revoke device'));
                } finally {
                    setActionLoading(null);
                    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                }
            }
        });
    };

    const handleRevokeAllOthers = () => {
        setConfirmModal({
            isOpen: true,
            title: isRTL ? 'تسجيل الخروج من جميع الأجهزة الأخرى' : 'Log Out All Other Devices',
            message: isRTL 
                ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من كافة الأجهزة والمتصفحات الأخرى؟ ستبقى مسجلاً للدخول على هذا الجهاز فقط.'
                : 'Are you sure you want to log out of all other devices and active browsers? You will remain logged in on this current device only.',
            onConfirm: async () => {
                try {
                    setActionLoading('all-others');
                    await api.post('/auth/devices/revoke-all-others');
                    setSuccessMessage(isRTL ? 'تم تسجيل الخروج من كافة الأجهزة الأخرى بنجاح' : 'All other device sessions have been logged out successfully');
                    setTimeout(() => setSuccessMessage(''), 4000);
                    await fetchDevices();
                } catch (err) {
                    setError(err.response?.data?.error || (isRTL ? 'فشل تسجيل الخروج من الأجهزة الأخرى' : 'Failed to log out all other devices'));
                } finally {
                    setActionLoading(null);
                    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                }
            }
        });
    };

    const getDeviceIcon = (deviceType) => {
        switch (deviceType) {
            case 'mobile':
                return <Smartphone size={24} color="#c8a951" />;
            case 'tablet':
                return <Tablet size={24} color="#c8a951" />;
            default:
                return <Laptop size={24} color="#c8a951" />;
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString(isRTL ? 'ar-QA' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    };

    if (!isAuthorized) {
        return (
            <div className="admin-card" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                <AlertTriangle size={36} color="#ef4444" style={{ marginBottom: '12px' }} />
                <p>{isRTL ? 'عذراً، هذه الميزة متاحة فقط للمسؤولين وأصحاب المتاجر.' : 'Access restricted to authorized Super Admins, Regional Admins, and Vendor Admins.'}</p>
            </div>
        );
    }

    const currentDevice = devices.find(d => d.isCurrent);
    const otherDevices = devices.filter(d => !d.isCurrent);

    return (
        <div className="admin-section animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div className="manager-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#f8fafc' }}>
                        <ShieldCheck size={26} color="#c8a951" />
                        {isRTL ? 'إدارة الأجهزة والجلسات المسجلة' : 'Manage Connected Devices & Logins'}
                    </h2>
                    <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                        {isRTL 
                            ? 'تحكم في كافة الأجهزة والمتصفحات النشطة التي تستخدم حسابك وقم بتسجيل الخروج منها فوراً لأمان حسابك.'
                            : 'Monitor and manage all active devices and browsers currently logged into your admin account.'}
                    </p>
                </div>
                <div className="manager-header-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={fetchDevices}
                        disabled={loading}
                        style={{ 
                            border: '1px solid rgba(255, 255, 255, 0.25)', 
                            color: '#f8fafc',
                            background: 'rgba(255, 255, 255, 0.08)',
                            padding: '9px 18px',
                            borderRadius: '10px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#c8a951';
                            e.currentTarget.style.color = '#c8a951';
                            e.currentTarget.style.background = 'rgba(200, 169, 81, 0.12)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                            e.currentTarget.style.color = '#f8fafc';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        }}
                    >
                        <RefreshCw size={15} color="#c8a951" className={loading ? 'spin' : ''} />
                        {isRTL ? 'تحديث' : 'Refresh'}
                    </button>

                    {otherDevices.length > 0 && (
                        <button 
                            onClick={handleRevokeAllOthers}
                            disabled={actionLoading === 'all-others'}
                            style={{
                                border: '1px solid rgba(239, 68, 68, 0.6)',
                                color: '#ffffff',
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.85) 0%, rgba(220, 38, 38, 0.95) 100%)',
                                padding: '9px 20px',
                                borderRadius: '10px',
                                cursor: actionLoading === 'all-others' ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 18px rgba(239, 68, 68, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.35)';
                            }}
                        >
                            <LogOut size={16} />
                            {actionLoading === 'all-others' 
                                ? (isRTL ? 'جاري تسجيل الخروج...' : 'Logging out...') 
                                : (isRTL ? 'تسجيل الخروج من باقي الأجهزة' : 'Log Out All Other Devices')}
                        </button>
                    )}
                </div>
            </div>

            {/* Notification Messages */}
            {successMessage && (
                <div style={{
                    padding: '12px 18px',
                    borderRadius: '8px',
                    background: 'rgba(52, 211, 153, 0.15)',
                    border: '1px solid #34d399',
                    color: '#34d399',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                }}>
                    <CheckCircle2 size={18} />
                    {successMessage}
                </div>
            )}

            {error && (
                <div style={{
                    padding: '12px 18px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                }}>
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {/* Stats Overview */}
            <div className="admin-stats-grid" style={{ marginBottom: '28px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div className="admin-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(200, 169, 81, 0.15)', padding: '14px', borderRadius: '12px', color: '#c8a951' }}>
                        <Smartphone size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff' }}>{devices.length}</div>
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                            {isRTL ? 'إجمالي الأجهزة النشطة' : 'Total Active Devices'}
                        </div>
                    </div>
                </div>

                <div className="admin-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '14px', borderRadius: '12px', color: '#34d399' }}>
                        <UserCheck size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                            {user.role === 'super_admin' ? 'Super Admin (SA)' : user.role === 'regional_admin' ? 'Regional Admin (RA)' : 'Vendor Admin'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                            {user.email}
                        </div>
                    </div>
                </div>

                <div className="admin-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '14px', borderRadius: '12px', color: '#818cf8' }}>
                        <KeyRound size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>
                            {isRTL ? 'حماية الجلسات الذكية' : 'Session Protection Active'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                            {isRTL ? 'تدوير التوكن الفوري مفعّل' : 'Instant Token Revocation'}
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="admin-card" style={{ padding: '60px', textAlign: 'center' }}>
                    <RefreshCw size={32} className="spin" color="#c8a951" style={{ marginBottom: '12px' }} />
                    <p style={{ color: '#94a3b8', margin: 0 }}>{isRTL ? 'جاري فحص الأجهزة والجلسات...' : 'Scanning device sessions...'}</p>
                </div>
            ) : (
                <>
                    {/* Current Device Section */}
                    {currentDevice && (
                        <div style={{ marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={18} color="#34d399" />
                                {isRTL ? 'الجهاز الحالي المستخدم الآن' : 'Current Active Device'}
                            </h3>
                            <div className="admin-card" style={{
                                padding: '20px 24px',
                                border: '1px solid rgba(52, 211, 153, 0.4)',
                                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
                                borderRadius: '14px',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{ 
                                            background: 'rgba(52, 211, 153, 0.15)', 
                                            border: '1px solid rgba(52, 211, 153, 0.3)',
                                            borderRadius: '12px', 
                                            padding: '14px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}>
                                            {getDeviceIcon(currentDevice.deviceType)}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: '700' }}>
                                                    {currentDevice.deviceName}
                                                </h4>
                                                <span style={{
                                                    background: 'rgba(52, 211, 153, 0.2)',
                                                    color: '#34d399',
                                                    border: '1px solid rgba(52, 211, 153, 0.4)',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                                                    {isRTL ? 'هذا الجهاز (نشط الآن)' : 'This Device (Active Now)'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', color: '#94a3b8', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Globe size={14} color="#c8a951" /> IP: <strong style={{ color: '#cbd5e1' }}>{currentDevice.ip}</strong>
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Clock size={14} color="#c8a951" /> {isRTL ? 'وقت الدخول:' : 'Logged in:'} {formatDate(currentDevice.createdAt)}
                                                </span>
                                                <span>
                                                    OS: <strong style={{ color: '#cbd5e1' }}>{currentDevice.os}</strong>
                                                </span>
                                                <span>
                                                    Browser: <strong style={{ color: '#cbd5e1' }}>{currentDevice.browser}</strong>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Other Devices Section */}
                    <div>
                        <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Smartphone size={18} color="#c8a951" />
                            {isRTL ? `الأجهزة والجلسات الأخرى المسجلة (${otherDevices.length})` : `Other Connected Devices (${otherDevices.length})`}
                        </h3>

                        {otherDevices.length === 0 ? (
                            <div className="admin-card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                <ShieldCheck size={36} color="#34d399" style={{ marginBottom: '10px' }} />
                                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                                    {isRTL 
                                        ? 'لا توجد أجهزة أخرى مسجلة الدخول لحسابك حالياً. حسابك آمن تماماً!'
                                        : 'No other devices are currently logged into your account. Your login footprint is fully secure!'}
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {otherDevices.map(device => (
                                    <div 
                                        key={device.id} 
                                        className="admin-card"
                                        style={{
                                            padding: '18px 22px',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '16px',
                                            background: '#1e293b',
                                            border: '1px solid #334155',
                                            transition: 'border-color 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ 
                                                background: '#0f172a', 
                                                border: '1px solid #334155',
                                                borderRadius: '10px', 
                                                padding: '12px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center' 
                                            }}>
                                                {getDeviceIcon(device.deviceType)}
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: '600' }}>
                                                        {device.deviceName}
                                                    </h4>
                                                    <span style={{
                                                        background: '#334155',
                                                        color: '#94a3b8',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.72rem',
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        {device.deviceType}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '14px', marginTop: '6px', color: '#94a3b8', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Globe size={13} color="#94a3b8" /> IP: <strong style={{ color: '#cbd5e1' }}>{device.ip}</strong>
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={13} color="#94a3b8" /> {isRTL ? 'تاريخ الدخول:' : 'Logged in:'} {formatDate(device.createdAt)}
                                                    </span>
                                                    <span>
                                                        OS: <strong style={{ color: '#cbd5e1' }}>{device.os}</strong>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <button
                                                onClick={() => handleRevokeDevice(device)}
                                                disabled={actionLoading === device.id}
                                                style={{
                                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                                    color: '#fca5a5',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    padding: '9px 18px',
                                                    fontSize: '0.82rem',
                                                    fontWeight: '700',
                                                    letterSpacing: '0.5px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '7px',
                                                    cursor: actionLoading === device.id ? 'not-allowed' : 'pointer',
                                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.18)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                                                    e.currentTarget.style.borderColor = '#ef4444';
                                                    e.currentTarget.style.color = '#ffffff';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.35)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                                                    e.currentTarget.style.color = '#fca5a5';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.18)';
                                                }}
                                            >
                                                <LogOut size={14} color="#f87171" />
                                                {actionLoading === device.id 
                                                    ? (isRTL ? 'جاري الخروج...' : 'Logging out...') 
                                                    : (isRTL ? 'تسجيل الخروج' : 'LOG OUT')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '460px',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '10px', color: '#ef4444' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem' }}>{confirmModal.title}</h3>
                        </div>
                        <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '24px' }}>
                            {confirmModal.message}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
                                style={{ padding: '8px 18px', borderColor: '#334155', color: '#94a3b8', background: 'transparent' }}
                            >
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                className="btn"
                                onClick={confirmModal.onConfirm}
                                style={{
                                    padding: '8px 20px',
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                {isRTL ? 'تأكيد تسجيل الخروج' : 'Confirm Log Out'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeviceManager;
