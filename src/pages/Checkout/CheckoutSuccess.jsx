import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { CheckCircle, Sparkles, MapPin, Store, Clock, ArrowRight, ShieldCheck, Ticket } from 'lucide-react';
import './CheckoutSuccess.css';

const CheckoutSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [fallbackOrderId] = useState(`ORD-${Date.now().toString().slice(-8)}`);
    const orderId = location.state?.orderId || fallbackOrderId;
    const isReservation = location.state?.isReservation || false;
    const fulfillmentType = location.state?.fulfillmentType || (isReservation ? 'pickup' : 'delivery');
    const pickupShop = location.state?.pickupShop || null;
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    // Generate a reliable 6-digit VIP Verification Pass Code
    const vipPassCode = (orderId.replace(/\D/g, '') || '948271').slice(-6).padStart(6, '0');

    useEffect(() => {
        window.scrollTo(0, 0);
        document.body.style.overflow = 'auto';

        // Local high-contrast QR code generation (Zero external server leak)
        const qrPayload = JSON.stringify({
            orderId,
            vipPass: vipPassCode,
            type: fulfillmentType,
            ts: Date.now()
        });

        QRCode.toDataURL(qrPayload, {
            width: 180,
            margin: 1,
            color: {
                dark: '#111111',
                light: '#ffffff'
            }
        }).then(url => {
            setQrCodeUrl(url);
        }).catch(err => {
            console.error('Failed to generate local QR code:', err);
        });
    }, [orderId, vipPassCode, fulfillmentType]);

    const isPickup = fulfillmentType === 'pickup' || isReservation;

    return (
        <div className="checkout-success-page">
            <div className="success-content animate-fade-in">
                <div className="success-icon-wrapper">
                    <div className="success-icon-bg"></div>
                    <CheckCircle size={76} color="#D4AF37" strokeWidth={1.5} style={{ position: 'relative', zIndex: 1 }} />
                </div>
                
                {isPickup ? (
                    <>
                        <h1 className="premium-title">Boutique VIP Pass Confirmed</h1>
                        <div className="premium-divider"></div>
                        <p className="premium-message">
                            Your luxury fragrance selection is reserved at our Qatar boutique.<br />
                            Present your Digital VIP Pass or 6-digit code upon arrival.
                        </p>

                        {/* Digital VIP Pass Card */}
                        <div className="vip-pass-card" style={{
                            background: 'linear-gradient(145deg, #1f1d19 0%, #121212 100%)',
                            border: '1px solid rgba(212, 175, 55, 0.4)',
                            borderRadius: '16px',
                            padding: '24px',
                            margin: '24px auto',
                            maxWidth: '380px',
                            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                            textAlign: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#D4AF37', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>
                                <Ticket size={16} /> PerfumeHub Qatar • VIP Pass
                            </div>

                            {qrCodeUrl && (
                                <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', display: 'inline-block', marginBottom: '16px' }}>
                                    <img src={qrCodeUrl} alt="VIP Pass QR Code" style={{ width: '150px', height: '150px', display: 'block' }} />
                                </div>
                            )}

                            <div style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px dashed rgba(212, 175, 55, 0.5)', borderRadius: '10px', padding: '10px', marginBottom: '14px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>6-Digit Verification PIN</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#D4AF37', letterSpacing: '4px', fontFamily: 'monospace' }}>
                                    {vipPassCode}
                                </div>
                            </div>

                            {pickupShop && (
                                <div style={{ fontSize: '0.85rem', color: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <MapPin size={14} color="#D4AF37" />
                                    <span>{pickupShop.name} ({pickupShop.address || 'Qatar'})</span>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="premium-title">Order Confirmed & Processing</h1>
                        <div className="premium-divider"></div>
                        <p className="premium-message">
                            Your luxury order has been received and routed to our Qatar fulfillment center.<br />
                            Our white-glove courier will prepare your selection with signature packaging.
                        </p>
                    </>
                )}

                <div className="order-id-box">
                    <span className="order-id-label">{isPickup ? 'Boutique Reference' : 'Order Reference'}</span>
                    <span className="order-id-value">{orderId}</span>
                </div>

                <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '30px' }}>
                    <button 
                        className="btn btn-gold success-home-btn" 
                        onClick={() => navigate('/profile')}
                        style={{ padding: '12px 30px', fontSize: '0.88rem', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <span>VIEW IN PROFILE</span>
                        <ArrowRight size={16} />
                    </button>
                    <button 
                        className="btn btn-outline" 
                        onClick={() => navigate('/shop')}
                        style={{ padding: '12px 30px', fontSize: '0.88rem', letterSpacing: '1.5px', color: '#ccc', borderColor: 'rgba(255,255,255,0.2)' }}
                    >
                        EXPLORE MORE SCENTS
                    </button>
                </div>
            </div>

            <div className="redirect-footer">
                <div className="redirect-text" style={{ opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} color="#D4AF37" />
                    <span>YOUR LUXURY SELECTION IS SECURED & VERIFIED</span>
                </div>
            </div>
            
            <Sparkles 
                style={{ position: 'absolute', top: '10%', right: '10%', opacity: 0.3 }} 
                color="#D4AF37" 
                size={40} 
            />
            <Sparkles 
                style={{ position: 'absolute', bottom: '15%', left: '10%', opacity: 0.2 }} 
                color="#D4AF37" 
                size={30} 
            />
        </div>
    );
};

export default CheckoutSuccess;
