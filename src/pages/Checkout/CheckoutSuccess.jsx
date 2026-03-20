import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Sparkles } from 'lucide-react';
import './CheckoutSuccess.css';

const CheckoutSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState(5);

    const orderId = location.state?.orderId || `ORD-${Date.now().toString().slice(-10)}`;

    useEffect(() => {
        window.scrollTo(0, 0);

        // Hide navigation/header/footer if possible by setting body overflow
        document.body.style.overflow = 'hidden';

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
            document.body.style.overflow = 'auto';
        };
    }, [navigate]);

    return (
        <div className="checkout-success-page">
            <div className="success-content">
                <div className="success-icon-wrapper">
                    <div className="success-icon-bg"></div>
                    <CheckCircle size={80} color="#D4AF37" strokeWidth={1} style={{ position: 'relative', zIndex: 1 }} />
                </div>
                
                <h1 className="premium-title">Order Confirmed</h1>
                <div className="premium-divider"></div>
                
                <p className="premium-message">
                    Your luxury selection has been reserved.<br />
                    Prepare for a journey of scent and sophistication.
                </p>

                <div className="order-id-box">
                    <span className="order-id-label">Tracking Number</span>
                    <span className="order-id-value">{orderId}</span>
                </div>
            </div>

            <div className="redirect-footer">
                <div className="redirect-text">
                    REDIRECTING TO HOME IN {timeLeft} SECONDS
                </div>
                <div className="progress-container">
                    <div className="progress-bar"></div>
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
