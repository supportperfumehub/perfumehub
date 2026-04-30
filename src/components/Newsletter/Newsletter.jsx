import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import './Newsletter.css';

const Newsletter = ({ isRTL }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');

        // Simulate API call
        setTimeout(() => {
            setStatus('success');
            setEmail('');

            // Reset after 3 seconds
            setTimeout(() => {
                setStatus('idle');
            }, 3000);
        }, 1200);
    };

    return (
        <section className="newsletter-section reveal">
            <div className="container">
                <div className="newsletter-container">
                    <div className="newsletter-content">
                        <h2 className="newsletter-title">
                            {isRTL ? 'انضم إلى عائلتنا' : 'Join Our Family'}
                        </h2>
                        <p className="newsletter-description">
                            {isRTL
                                ? 'اشترك في النشرة الإخبارية للحصول على أحدث العروض، العطور الجديدة، وخصم ١٠٪ على طلبك الأول.'
                                : 'Subscribe to our newsletter for the latest offers, new arrivals, and get 10% off your first order.'}
                        </p>

                        <form className={`newsletter-form ${isRTL ? 'rtl' : 'ltr'}`} onSubmit={handleSubmit}>
                            <div className="input-group">
                                <input
                                    type="email"
                                    placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={status === 'loading' || status === 'success'}
                                    required
                                />
                                <button
                                    type="submit"
                                    className={`btn btn-gold submit-btn ${status}`}
                                    disabled={status === 'loading' || status === 'success'}
                                >
                                    {status === 'loading' ? (
                                        <div className="spinner"></div>
                                    ) : status === 'success' ? (
                                        <CheckCircle2 size={20} />
                                    ) : (
                                        <>
                                            <span>{isRTL ? 'اشتراك' : 'Subscribe'}</span>
                                            <Send size={18} className="send-icon" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {status === 'success' && (
                                <div className="success-message animate-fade-in">
                                    {isRTL ? 'شكراً لاشتراكك! تفقد بريدك الإلكتروني قريباً.' : 'Thanks for subscribing! Check your email soon.'}
                                </div>
                            )}
                        </form>

                        <div className="newsletter-privacy">
                            {isRTL
                                ? 'بالاشتراك، أنت توافق على سياسة الخصوصية الخاصة بنا. يمكنك إلغاء الاشتراك في أي وقت.'
                                : 'By subscribing, you agree to our Privacy Policy. You can unsubscribe at any time.'}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Newsletter;
