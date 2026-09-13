import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { 
    Scan, CheckCircle, AlertCircle, ShoppingBag, User, Clock, 
    ArrowRight, RefreshCw, Camera, Keyboard, MessageSquare, 
    ExternalLink, Sparkles, Store, ShieldCheck, MapPin, Phone
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../utils/api_v1_0_2';

const VerificationPortal = () => {
    const { isRTL } = useOutletContext();
    const { user } = useContext(AuthContext);
    const [mode, setMode] = useState('camera'); // 'camera' | 'manual'
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [reservation, setReservation] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [completedReceipt, setCompletedReceipt] = useState(null);
    const [cameraError, setCameraError] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    const html5QrCodeRef = useRef(null);

    // Luxury Web Audio Synthesizer Chime + Device Haptic Feedback
    const playChimeAndHaptic = () => {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            
            // Luxury harmonic chord (A5, C#6, E6)
            const freqs = [880, 1108.73, 1318.51];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
                gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.8);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.08);
                osc.stop(ctx.currentTime + idx * 0.08 + 0.85);
            });
        } catch (e) {
            console.warn('Chime / Haptic error:', e);
        }
    };

    const verifyCodeDirect = async (codeToVerify) => {
        if (!codeToVerify) return;
        setLoading(true);
        setError('');
        setReservation(null);
        setSuccess('');
        setCompletedReceipt(null);

        try {
            const res = await api.post('/reservations/verify', { code: codeToVerify });
            playChimeAndHaptic();
            setReservation(res.data.reservation);
        } catch (err) {
            setError(err.response?.data?.error || (isRTL ? 'رمز الحجز غير صالح أو منتهي الصلاحية' : 'Invalid or expired reservation code'));
        } finally {
            setLoading(false);
        }
    };

    const handleManualVerify = (e) => {
        if (e) e.preventDefault();
        verifyCodeDirect(code);
    };

    // Camera Lifecycle
    useEffect(() => {
        let scanner = null;
        let isMounted = true;

        if (mode === 'camera' && !reservation && !completedReceipt) {
            setCameraError('');
            const timer = setTimeout(() => {
                if (!isMounted) return;
                const element = document.getElementById('interactive-qr-reader');
                if (!element) return;

                try {
                    scanner = new Html5Qrcode('interactive-qr-reader');
                    html5QrCodeRef.current = scanner;

                    scanner.start(
                        { facingMode: 'environment' },
                        { fps: 10, qrbox: { width: 240, height: 240 } },
                        (decodedText) => {
                            let clean = decodedText.trim();
                            const match = clean.match(/\b\d{6}\b/);
                            if (match) clean = match[0];
                            setCode(clean);
                            verifyCodeDirect(clean);
                            if (scanner && scanner.isScanning) {
                                scanner.stop().catch(() => {});
                                setIsScanning(false);
                            }
                        },
                        () => {} // Silent non-matches
                    ).then(() => {
                        if (isMounted) setIsScanning(true);
                    }).catch(err => {
                        console.warn('Camera launch failed:', err);
                        if (isMounted) {
                            setCameraError(isRTL ? 'تعذر فتح الكاميرا، يرجى استخدام الإدخال اليدوي أو منح إذن الكاميرا' : 'Unable to access camera. Please allow permissions or switch to manual entry.');
                            setIsScanning(false);
                        }
                    });
                } catch (err) {
                    console.warn('Scanner init failed:', err);
                }
            }, 250);

            return () => {
                clearTimeout(timer);
                isMounted = false;
                if (scanner && scanner.isScanning) {
                    scanner.stop().catch(() => {});
                }
                html5QrCodeRef.current = null;
                setIsScanning(false);
            };
        } else {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                html5QrCodeRef.current.stop().catch(() => {});
            }
            html5QrCodeRef.current = null;
            setIsScanning(false);
        }
    }, [mode, reservation, completedReceipt]);

    const handleComplete = async () => {
        if (!reservation || !user?.id) return;
        setVerifying(true);
        try {
            await api.post(`/reservations/${reservation.id}/complete`);
            playChimeAndHaptic();
            setSuccess(isRTL ? 'تم تأكيد الاستلام وتسليم العطر للعميل بنجاح!' : 'Pickup verified! Fragrance successfully handed over.');
            
            // Store receipt details for 1-click WhatsApp customer message
            setCompletedReceipt({
                id: reservation.id,
                code: code || reservation.verification_code || 'VERIFIED',
                customerName: reservation.customers?.name || (isRTL ? 'العميل الفاخر' : 'VIP Customer'),
                phone: reservation.customers?.phone || reservation.phone || '',
                productName: reservation.products?.name || (isRTL ? 'عطر فاخر' : 'Luxury Fragrance'),
                quantity: reservation.quantity || 1,
                price: reservation.products?.price || 0,
                shopName: reservation.shops?.name || user?.shop_name || 'PerfumeHub Luxury Boutique',
                timestamp: new Date().toLocaleString()
            });

            setReservation(null);
            setCode('');
        } catch (err) {
            setError(err.response?.data?.error || (isRTL ? 'فشل تأكيد الاستلام' : 'Failed to complete pickup handover'));
        } finally {
            setVerifying(false);
        }
    };

    const sendWhatsAppReceipt = () => {
        if (!completedReceipt) return;
        const phone = (completedReceipt.phone || '').replace(/[^0-9]/g, '');
        const text = encodeURIComponent(
            isRTL
                ? `إيصال استلام رسمي - بيرفيوم هب (Click & Collect VIP)\n\nعزيزي/عزيزتي ${completedReceipt.customerName}،\nنؤكد استلامك بنجاح لطلبك من بوتيك ${completedReceipt.shopName}:\n\n- المنتج: ${completedReceipt.productName} (${completedReceipt.quantity}x)\n- السعر: ${completedReceipt.price} ر.ق\n- رمز التأكيد: #${completedReceipt.code}\n- وقت الاستلام: ${completedReceipt.timestamp}\n\nنتمنى لك تجربة عطرية لا تُنسى! عطورنا أصلية 100% وموثقة من بيرفيوم هب.`
                : `Official Pickup Receipt - PerfumeHub (Click & Collect VIP)\n\nDear ${completedReceipt.customerName},\nThis confirms the successful collection & handover of your fragrance at ${completedReceipt.shopName}:\n\n- Fragrance: ${completedReceipt.productName} (${completedReceipt.quantity}x)\n- Price: ${completedReceipt.price} QAR\n- Verification Ref: #${completedReceipt.code}\n- Handover Timestamp: ${completedReceipt.timestamp}\n\nThank you for choosing PerfumeHub Luxury Boutiques Network. 100% Authentic Guaranteed.`
        );

        if (phone) {
            window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
        } else {
            window.open(`https://wa.me/?text=${text}`, '_blank');
        }
    };

    const resetTerminal = () => {
        setReservation(null);
        setCompletedReceipt(null);
        setError('');
        setSuccess('');
        setCode('');
        setMode('camera');
    };

    return (
        <div className="container" style={{ maxWidth: '580px', padding: '60px 16px', minHeight: '85vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="admin-card" style={{ padding: '32px 24px', textAlign: 'center', background: '#1e293b', borderRadius: '18px', border: '1px solid rgba(200, 169, 81, 0.3)', boxShadow: '0 20px 45px rgba(0,0,0,0.5)' }}>
                
                {/* VIP Terminal Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Sparkles size={18} color="#c8a951" />
                    <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#c8a951', fontWeight: '800' }}>
                        In-Store Click & Collect Terminal
                    </span>
                    <Sparkles size={18} color="#c8a951" />
                </div>

                <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#ffffff', margin: '0 0 8px 0' }}>
                    {isRTL ? 'نقطة التحقق وتسليم العطور' : 'VIP Fragrance Verification Terminal'}
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 auto 24px auto', maxWidth: '420px', lineHeight: '1.5' }}>
                    {isRTL 
                        ? 'امسح رمز الاستجابة السريعة (QR) من هاتف العميل مباشرة بالكاميرا أو أدخل رمز التأكيد يدوياً.'
                        : 'Scan customer QR code directly with high-speed camera scanner, or enter 6-digit confirmation code.'}
                </p>

                {/* Mode Selector Toggle */}
                {!reservation && !completedReceipt && (
                    <div style={{ display: 'flex', background: '#0f172a', padding: '4px', borderRadius: '10px', marginBottom: '24px', border: '1px solid #334155' }}>
                        <button
                            type="button"
                            onClick={() => setMode('camera')}
                            style={{
                                flex: 1,
                                padding: '9px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                background: mode === 'camera' ? 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)' : 'transparent',
                                color: mode === 'camera' ? '#000000' : '#94a3b8',
                                fontWeight: mode === 'camera' ? '800' : '600',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Camera size={16} />
                            <span>{isRTL ? 'مسح الكاميرا (QR)' : 'Camera QR Scan'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMode('manual')}
                            style={{
                                flex: 1,
                                padding: '9px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                background: mode === 'manual' ? 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)' : 'transparent',
                                color: mode === 'manual' ? '#000000' : '#94a3b8',
                                fontWeight: mode === 'manual' ? '800' : '600',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Keyboard size={16} />
                            <span>{isRTL ? 'إدخال يدوي للرمز' : 'Manual Code Entry'}</span>
                        </button>
                    </div>
                )}

                {/* 1. Camera Scan Mode */}
                {mode === 'camera' && !reservation && !completedReceipt && (
                    <div style={{ marginBottom: '20px' }}>
                        <div 
                            style={{ 
                                position: 'relative', 
                                background: '#0f172a', 
                                borderRadius: '14px', 
                                overflow: 'hidden', 
                                border: '2px dashed rgba(200, 169, 81, 0.4)',
                                minHeight: '280px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <div id="interactive-qr-reader" style={{ width: '100%' }}></div>
                            
                            {cameraError && (
                                <div style={{ padding: '20px', color: '#f87171', fontSize: '0.86rem' }}>
                                    <AlertCircle size={24} style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px auto' }} />
                                    {cameraError}
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#64748b' }}>
                            {isRTL ? 'وجّه كاميرا الهاتف أو جهاز البوتيك نحو كود QR في بريد العميل' : 'Position customer reservation QR code within the viewfinder frame'}
                        </div>
                    </div>
                )}

                {/* 2. Manual Entry Mode */}
                {mode === 'manual' && !reservation && !completedReceipt && (
                    <form onSubmit={handleManualVerify} style={{ marginBottom: '16px' }}>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="000000"
                            maxLength="6"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            style={{ 
                                width: '100%', 
                                boxSizing: 'border-box', 
                                fontSize: '2.2rem', 
                                textAlign: 'center', 
                                letterSpacing: '10px', 
                                fontWeight: '900', 
                                height: '76px', 
                                marginBottom: '18px', 
                                background: '#0f172a', 
                                color: '#c8a951', 
                                border: '1px solid rgba(200, 169, 81, 0.45)', 
                                borderRadius: '12px', 
                                outline: 'none'
                            }}
                        />
                        <button 
                            type="submit" 
                            className="btn btn-gold" 
                            style={{ width: '100%', height: '52px', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                            disabled={loading || code.length < 6}
                        >
                            {loading ? <RefreshCw className="spin" size={18} /> : (isRTL ? 'تحقق من الحجز' : 'Verify Reservation')}
                        </button>
                    </form>
                )}

                {/* Error Banner */}
                {error && (
                    <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                        <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0 }} /> 
                        <span style={{ textAlign: isRTL ? 'right' : 'left' }}>{error}</span>
                    </div>
                )}

                {/* Success Banner */}
                {success && (
                    <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                        <CheckCircle size={20} color="#34d399" style={{ flexShrink: 0 }} /> 
                        <span style={{ textAlign: isRTL ? 'right' : 'left', fontWeight: '600' }}>{success}</span>
                    </div>
                )}

                {/* 3. Found Reservation Card */}
                {reservation && (
                    <div className="animate-fade-in" style={{ marginTop: '24px', textAlign: isRTL ? 'right' : 'left', borderTop: '1px solid #334155', paddingTop: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <span style={{ fontSize: '0.78rem', background: 'rgba(200, 169, 81, 0.15)', color: '#c8a951', border: '1px solid rgba(200, 169, 81, 0.4)', padding: '3px 10px', borderRadius: '20px', fontWeight: '700' }}>
                                ✓ {isRTL ? 'حجز معتمد ومطابق' : 'VIP Verified Match'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                Ref: #{String(reservation.id).slice(0, 8)}
                            </span>
                        </div>
                        
                        <div style={{ background: '#0f172a', padding: '18px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Customer Profile */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ background: 'rgba(200, 169, 81, 0.15)', color: '#c8a951', padding: '10px', borderRadius: '50%', flexShrink: 0 }}>
                                    <User size={18} />
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: '800', color: '#fff', fontSize: '1.05rem' }}>
                                        {reservation.customers?.name || (isRTL ? 'عميل كليك آند كوليكت' : 'VIP Customer')}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                                        {reservation.customers?.phone && <span>📞 {reservation.customers.phone} • </span>}
                                        <span>{reservation.customers?.email}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

                            {/* Fragrance Item */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '10px', borderRadius: '50%', flexShrink: 0 }}>
                                    <ShoppingBag size={18} />
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontWeight: '800', color: '#f8fafc', fontSize: '0.98rem' }}>
                                        {reservation.quantity}x {reservation.products?.name}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#c8a951', fontWeight: '700', marginTop: '2px' }}>
                                        {reservation.products?.price} QAR
                                    </div>
                                </div>
                            </div>

                            {/* Branch Info */}
                            {reservation.shops?.name && (
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Store size={14} color="#c8a951" />
                                    <span>{reservation.shops.name}</span>
                                </div>
                            )}
                        </div>

                        {/* 1-Click Handover Action */}
                        <button 
                            className="btn btn-gold" 
                            onClick={handleComplete} 
                            style={{ 
                                width: '100%', 
                                height: '56px', 
                                fontWeight: '900', 
                                fontSize: '1.02rem',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                border: 'none',
                                color: '#ffffff',
                                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }} 
                            disabled={verifying}
                        >
                            {verifying ? (
                                <RefreshCw className="spin" size={20} />
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    <span>{isRTL ? 'تأكيد الاستلام وتسليم العطر للعميل' : 'Confirm Pickup & Hand Over Fragrance'}</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* 4. Completed Receipt & WhatsApp Receipt Action */}
                {completedReceipt && (
                    <div className="animate-fade-in" style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #334155', paddingTop: '24px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto', color: '#34d399' }}>
                            <ShieldCheck size={32} />
                        </div>
                        <h3 style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: '800', margin: '0 0 6px 0' }}>
                            {isRTL ? 'تم تسليم العطر بنجاح!' : 'Fragrance Handover Confirmed!'}
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '20px' }}>
                            {isRTL ? 'تم تحرير الحجز وتحديث حالة الطلب والمخزون في النظام.' : 'Reservation fulfilled and stock balance adjusted automatically.'}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* 1-Click WhatsApp Pickup Receipt Button */}
                            <button
                                type="button"
                                onClick={sendWhatsAppReceipt}
                                style={{
                                    width: '100%',
                                    height: '52px',
                                    background: '#25D366',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '800',
                                    fontSize: '0.94rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)'
                                }}
                            >
                                <MessageSquare size={18} />
                                <span>{isRTL ? 'إرسال إيصال الاستلام للعميل عبر الواتساب' : 'Send VIP WhatsApp Pickup Receipt'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={resetTerminal}
                                style={{
                                    width: '100%',
                                    height: '46px',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: '#f8fafc',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {isRTL ? 'التحقق من حجز آخر' : 'Verify Another Reservation'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerificationPortal;
