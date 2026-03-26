import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Sparkles } from 'lucide-react';
import './CheckoutSuccess.css';

const CheckoutSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const orderId = location.state?.orderId || `ORD-${Date.now().toString().slice(-10)}`;

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
                
                <h1 className="premium-title">Order Processing</h1>
                <div className="premium-divider"></div>
                
                <p className="premium-message">
                    Your luxury selection is now being carefully processed.<br />
                    Our administrative team will verify and update your order status shortly.<br />
                    Prepare for a journey of scent and sophistication.
                </p>

                <div className="order-id-box">
                    <span className="order-id-label">Internal Reference</span>
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
