import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Sparkles } from 'lucide-react';
import './CheckoutSuccess.css';

const CheckoutSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const orderId = location.state?.orderId || `ORD-${Date.now().toString().slice(-10)}`;
    const isReservation = location.state?.isReservation || false;

    useEffect(() => {
        window.scrollTo(0, 0);
        // Hide navigation/header/footer if possible by setting body overflow
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <div className="checkout-success-page">
            <div className="success-content">
                <div className="success-icon-wrapper">
                    <div className="success-icon-bg"></div>
                    <CheckCircle size={80} color="#D4AF37" strokeWidth={1} style={{ position: 'relative', zIndex: 1 }} />
                </div>
                
                {isReservation ? (
                    <>
                        <h1 className="premium-title">Reservation Confirmed</h1>
                        <div className="premium-divider"></div>
                        <p className="premium-message">
                            Your luxury selection has been reserved in-store.<br />
                            The shop will confirm availability shortly.
                        </p>

                        {/* Status Timeline */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0', margin: '24px auto', maxWidth: '400px' }}>
                            {[
                                { label: 'Reserved', active: true },
                                { label: 'Shop Confirms', active: false },
                                { label: 'Pickup', active: false },
                            ].map((step, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < 2 ? 1 : 'none' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: step.active ? '#D4AF37' : 'rgba(212, 175, 55, 0.15)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: step.active ? '#000' : '#D4AF37', fontWeight: '700', fontSize: '0.8rem',
                                            border: '2px solid #D4AF37'
                                        }}>
                                            {idx + 1}
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: step.active ? '#D4AF37' : 'rgba(255,255,255,0.4)', fontWeight: '600', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                                            {step.label}
                                        </span>
                                    </div>
                                    {idx < 2 && (
                                        <div style={{ flex: 1, height: '2px', background: 'rgba(212, 175, 55, 0.2)', margin: '0 8px', marginBottom: '22px' }} />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="reservation-qr-mock" style={{ margin: '20px auto', width: '150px', height: '150px', background: '#fff', padding: '10px', borderRadius: '12px', border: '2px solid var(--color-gold)' }}>
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${orderId}&color=1a1a1a&bgcolor=fff`} alt="Reservation QR" style={{ width: '100%', height: '100%' }}/>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '8px', letterSpacing: '1px' }}>
                            SHOW THIS QR CODE AT THE STORE
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="premium-title">Order Processing</h1>
                        <div className="premium-divider"></div>
                        <p className="premium-message">
                            Your luxury selection is now being carefully processed.<br />
                            Our administrative team will verify and update your order status shortly.<br />
                            Prepare for a journey of scent and sophistication.
                        </p>
                    </>
                )}

                <div className="order-id-box">
                    <span className="order-id-label">{isReservation ? 'Reservation ID' : 'Internal Reference'}</span>
                    <span className="order-id-value">{orderId}</span>
                </div>

                <button 
                    className="btn btn-gold success-home-btn" 
                    onClick={() => navigate('/')}
                    style={{ marginTop: '30px', padding: '12px 40px', fontSize: '0.9rem', letterSpacing: '2px' }}
                >
                    RETURN TO GALLERY
                </button>
            </div>

            <div className="redirect-footer">
                <div className="redirect-text" style={{ opacity: 0.7 }}>
                    YOUR SELECTION IS SAVED AND PROTECTED
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
