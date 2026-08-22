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
import ConfirmModal from '../Common/ConfirmModal';

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
            title: isRTL ? 'تسجيل خروج الجهاز' : 'LOG OUT DEVICE',
            message: (
                <span>
                    {isRTL ? 'هل أنت متأكد من تسجيل خروج ' : 'Are you sure you want to log out '}
                    <strong style={{ color: '#c8a951', background: 'rgba(200, 169, 81, 0.12)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(200, 169, 81, 0.3)', display: 'inline-block', margin: '0 4px' }}>
                        {device.deviceName || 'Web Browser'}
                    </strong>
                    {isRTL ? 'من حسابك؟' : 'from your account?'}
                </span>
            ),
            confirmText: isRTL ? 'تسجيل خروج' : 'LOG OUT',
            cancelText: isRTL ? 'إلغاء' : 'CANCEL',
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
            title: isRTL ? 'تسجيل الخروج من كافة الأجهزة' : 'LOG OUT ALL OTHER DEVICES',
            message: (
                <span>
                    {isRTL 
                        ? 'هل أنت متأكد من تسجيل الخروج من كافة الأجهزة والمتصفحات النشطة الأخرى؟ ستبقى مسجلاً للدخول على هذا الجهاز فقط.'
                        : 'Are you sure you want to log out of all other active devices and browser sessions? You will remain logged in on this current device only.'}
                </span>
            ),
            confirmText: isRTL ? 'تسجيل الخروج للكل' : 'LOG OUT ALL',
            cancelText: isRTL ? 'إلغاء' : 'CANCEL',
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
                            border: '1px solid rgba(200, 169, 81, 0.45)', 
                            color: '#ffffff',
                            background: 'rgba(200, 169, 81, 0.12)',
                            padding: '9px 20px',
                            borderRadius: '10px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            letterSpacing: '0.5px',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#c8a951';
                            e.currentTarget.style.color = '#c8a951';
                            e.currentTarget.style.background = 'rgba(200, 169, 81, 0.25)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(200, 169, 81, 0.45)';
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.background = 'rgba(200, 169, 81, 0.12)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <RefreshCw size={15} color="#c8a951" className={loading ? 'spin' : ''} />
                        {isRTL ? 'تحديث' : 'REFRESH'}
                    </button>

                    {otherDevices.length > 0 && (
                        <button 
                            onClick={handleRevokeAllOthers}
                            disabled={actionLoading === 'all-others'}
                            style={{
                                border: '1px solid rgba(239, 68, 68, 0.8)',
                                color: '#ffffff',
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                padding: '9px 22px',
                                borderRadius: '10px',
                                cursor: actionLoading === 'all-others' ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '800',
                                fontSize: '0.85rem',
                                letterSpacing: '0.5px',
                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.45)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.65)';
                                e.currentTarget.style.filter = 'brightness(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.45)';
                                e.currentTarget.style.filter = 'none';
                            }}
                        >
                            <LogOut size={16} color="#ffffff" />
                            {actionLoading === 'all-others' 
                                ? (isRTL ? 'جاري تسجيل الخروج...' : 'LOGGING OUT...') 
                                : (isRTL ? 'تسجيل الخروج من باقي الأجهزة' : 'LOG OUT ALL OTHER DEVICES')}
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

            {/* Luxury Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
                isRTL={isRTL}
                variant="danger"
                iconType="trash"
            />
        </div>
    );
};

export default DeviceManager;
