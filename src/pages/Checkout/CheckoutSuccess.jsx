import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { 
    CheckCircle, Sparkles, MapPin, Store, Clock, ArrowRight, 
    ShieldCheck, Ticket, Copy, Check, MessageSquare, ExternalLink, 
    Package, ShoppingBag, Truck, Phone, AlertCircle
} from 'lucide-react';
import './CheckoutSuccess.css';

const WhatsAppIcon = () => (
    <svg viewBox="0 0 448 512" width="20" height="20" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.2-3.2-5.6-.3-8.6 2.4-11.3 2.5-2.4 5.5-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.5-9.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.5 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
);

const CheckoutSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const outletCtx = useOutletContext();
    const isRTL = outletCtx?.isRTL || document.documentElement.dir === 'rtl';

    const [fallbackOrderId] = useState(`ORD-${Date.now().toString().slice(-6)}`);
    const orderId = location.state?.orderId || fallbackOrderId;
    const isReservation = location.state?.isReservation || false;
    const fulfillmentType = location.state?.fulfillmentType || (isReservation ? 'pickup' : 'delivery');
    const pickupShop = location.state?.pickupShop || location.state?.shop || null;
    const items = location.state?.items || [];
    const total = location.state?.total || 0;
    const customerName = location.state?.customerName || '';
    const customerPhone = location.state?.phone || '';
    const shippingAddress = location.state?.shippingAddress || '';
    const paymentMethod = location.state?.paymentMethod || (isReservation ? (isRTL ? 'الدفع في البوتيك' : 'Pay at Boutique') : (isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery'));

    const targetWhatsApp = location.state?.whatsappNumber || '97430301901';

    // WhatsApp Message formulation if not passed in location.state
    const defaultWaMessage = isRTL
        ? `🛍️ *تأكيد طلب من PerfumeHub Qatar: ${orderId}*\n\n` +
          `👤 *العميل:* ${customerName || 'عميل كريم'}\n` +
          (customerPhone ? `📱 *الهاتف:* ${customerPhone}\n` : '') +
          `📍 *طريقة الاستلام:* ${fulfillmentType === 'pickup' ? 'استلام من البوتيك' : 'توصيل محلي في قطر'}\n` +
          (shippingAddress ? `🏠 *العنوان:* ${shippingAddress}\n` : '') +
          (total ? `💰 *الإجمالي المستحق:* ${Math.round(total)} QAR\n\n` : '\n') +
          `✅ *يرجى تأكيد استلام الطلب وتجهيزه.*`
        : `🛍️ *PerfumeHub Qatar Order Confirmation: ${orderId}*\n\n` +
          `👤 *Customer:* ${customerName || 'Valued Customer'}\n` +
          (customerPhone ? `📱 *Phone:* ${customerPhone}\n` : '') +
          `📍 *Fulfillment:* ${fulfillmentType === 'pickup' ? 'Boutique Click & Collect' : 'Qatar Courier Delivery'}\n` +
          (shippingAddress ? `🏠 *Address:* ${shippingAddress}\n` : '') +
          (total ? `💰 *Total Amount:* ${Math.round(total)} QAR\n\n` : '\n') +
          `✅ *Please confirm my order preparation.*`;

    const whatsappUrl = location.state?.whatsappUrl || `https://wa.me/${targetWhatsApp}?text=${encodeURIComponent(defaultWaMessage)}`;

    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [autoRedirectCancelled, setAutoRedirectCancelled] = useState(false);

    // 6-digit VIP verification PIN
    const vipPassCode = (orderId.replace(/\D/g, '') || '948271').slice(-6).padStart(6, '0');

    // Auto-redirect timer for WhatsApp
    useEffect(() => {
        if (autoRedirectCancelled || countdown <= 0) return;

        const timer = setTimeout(() => {
            if (countdown === 1) {
                // Execute redirect to WhatsApp to send confirmation
                window.location.href = whatsappUrl;
            }
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown, autoRedirectCancelled, whatsappUrl]);

    useEffect(() => {
        window.scrollTo(0, 0);
        document.body.style.overflow = 'auto';

        if (fulfillmentType === 'pickup' || isReservation) {
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
        }
    }, [orderId, vipPassCode, fulfillmentType, isReservation]);

    const handleCopyOrderId = () => {
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(orderId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isPickup = fulfillmentType === 'pickup' || isReservation;

    return (
        <div className={`checkout-success-page ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="success-card animate-fade-in">
                
                {/* Checkmark Icon with pulsating gold halo */}
                <div className="success-icon-wrapper">
                    <div className="success-icon-bg"></div>
                    <div className="success-icon-inner">
                        <CheckCircle size={54} color="#D4AF37" strokeWidth={2} />
                    </div>
                </div>

                {/* Main Heading & Subtitle */}
                {isPickup ? (
                    <>
                        <h1 className="premium-title">
                            {isRTL ? 'تم تأكيد حجز البوتيك' : 'Boutique Reservation Confirmed'}
                        </h1>
                        <div className="premium-divider"></div>
                        <p className="premium-message">
                            {isRTL 
                                ? 'تم حجز اختيارك الفاخر بنجاح في بوتيك بيرفيوم هوب قطر. يرجى إبراز بطاقة VIP الرقمية أو الرمز عند الوصول.'
                                : 'Your luxury fragrance selection is reserved at our Qatar boutique. Present your Digital VIP Pass or 6-digit PIN upon arrival.'}
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="premium-title">
                            {isRTL ? 'تم تأكيد الطلب وجاري التجهيز' : 'Order Confirmed & Processing'}
                        </h1>
                        <div className="premium-divider"></div>
                        <p className="premium-message">
                            {isRTL 
                                ? 'تم استلام طلبك الفاخر وتوجيهه إلى مركز التجهيز في الدوحة. سيقوم فريقنا بتجهيز العطور وتغليفها بعناية فائقة.'
                                : 'Your luxury order has been received and routed to our Qatar fulfillment center. Our team is preparing your selection with signature white-glove packaging.'}
                        </p>
                    </>
                )}

                {/* Order Reference Number with 1-Click Copy */}
                <div className="order-reference-box">
                    <span className="order-reference-label">
                        {isPickup 
                            ? (isRTL ? 'الرقم المرجعي للبوتيك' : 'Boutique Reference') 
                            : (isRTL ? 'الرقم المرجعي للطلب' : 'Order Reference')}
                    </span>
                    <div className="order-reference-value-row">
                        <span className="order-reference-code">{orderId}</span>
                        <button 
                            type="button" 
                            className="copy-order-btn" 
                            onClick={handleCopyOrderId}
                            title={isRTL ? 'نسخ رقم الطلب' : 'Copy Order Reference'}
                            aria-label="Copy Order Reference"
                        >
                            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                            <span>{copied ? (isRTL ? 'تم النسخ' : 'Copied') : (isRTL ? 'نسخ' : 'Copy')}</span>
                        </button>
                    </div>
                </div>

                {/* Priority WhatsApp Confirmation Card */}
                <div className="whatsapp-confirmation-card">
                    <div className="whatsapp-card-header">
                        <div className="whatsapp-badge-icon">
                            <WhatsAppIcon />
                        </div>
                        <div className="whatsapp-card-title-group">
                            <h3>{isRTL ? 'تأكيد الطلب الفوري عبر واتساب' : 'Instant WhatsApp Confirmation'}</h3>
                            <p>
                                {isRTL 
                                    ? 'أرسل تفاصيل طلبك مباشرة إلى خدمة كبار العملاء في قطر لتسريع التجهيز الفوري وتحديث حالة الشحن.' 
                                    : 'Send your order details directly to our Qatar concierge for instant priority packing and tracking updates.'}
                            </p>
                        </div>
                    </div>

                    {countdown > 0 && !autoRedirectCancelled && (
                        <div className="whatsapp-countdown-pill">
                            <div className="countdown-pulse-dot"></div>
                            <span>
                                {isRTL 
                                    ? `جاري فتح واتساب تلقائياً خلال ${countdown} ثوانٍ...` 
                                    : `Opening WhatsApp in ${countdown}s to confirm order...`}
                            </span>
                            <button 
                                type="button" 
                                className="cancel-countdown-link" 
                                onClick={() => setAutoRedirectCancelled(true)}
                            >
                                {isRTL ? 'البقاء في الصفحة' : 'Stay Here'}
                            </button>
                        </div>
                    )}

                    <div className="whatsapp-action-row">
                        <a 
                            href={whatsappUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn-whatsapp-primary"
                            onClick={() => setAutoRedirectCancelled(true)}
                        >
                            <WhatsAppIcon />
                            <span>{isRTL ? 'تأكيد ومحادثة عبر واتساب الآن' : 'Confirm on WhatsApp Now'}</span>
                            <ExternalLink size={16} />
                        </a>
                    </div>
                </div>

                {/* Digital VIP Pass Card (for Click & Collect / Reservation) */}
                {isPickup && (
                    <div className="vip-pass-card">
                        <div className="vip-pass-header">
                            <Ticket size={16} color="#D4AF37" />
                            <span>PERFUMEHUB QATAR • VIP DIGITAL PASS</span>
                        </div>

                        {qrCodeUrl && (
                            <div className="vip-qr-wrapper">
                                <img src={qrCodeUrl} alt="VIP Pass QR Code" className="vip-qr-img" />
                            </div>
                        )}

                        <div className="vip-pin-box">
                            <div className="vip-pin-label">{isRTL ? 'رمز التحقق السريع (PIN)' : '6-Digit Verification PIN'}</div>
                            <div className="vip-pin-number">{vipPassCode}</div>
                        </div>

                        {pickupShop && (
                            <div className="vip-shop-info">
                                <MapPin size={16} color="#D4AF37" />
                                <span>{pickupShop.name} ({pickupShop.address || 'Doha, Qatar'})</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Order Summary Breakdown Card (if items passed) */}
                {items && items.length > 0 && (
                    <div className="order-summary-card">
                        <div className="order-summary-header">
                            <ShoppingBag size={18} color="#D4AF37" />
                            <h4>{isRTL ? 'تفاصيل العطور المختارة' : 'Order Summary'}</h4>
                            <span className="summary-items-count">
                                {items.length} {isRTL ? 'عطور' : (items.length === 1 ? 'Item' : 'Items')}
                            </span>
                        </div>

                        <div className="order-summary-items-list">
                            {items.map((item, idx) => (
                                <div key={idx} className="order-summary-item-row">
                                    <div className="summary-item-title-group">
                                        <span className="summary-item-name">{item.name}</span>
                                        <span className="summary-item-meta">
                                            {item.brand} {item.size ? `• ${item.size}` : ''}
                                        </span>
                                    </div>
                                    <div className="summary-item-price-group">
                                        <span className="summary-item-qty">x{item.quantity}</span>
                                        <span className="summary-item-amount">
                                            {Math.round((item.price || item.selectedPrice || 0) * item.quantity)} QAR
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="order-summary-meta-box">
                            <div className="meta-row">
                                <span>{isRTL ? 'طريقة الاستلام:' : 'Fulfillment:'}</span>
                                <span className="meta-value-highlight">
                                    {fulfillmentType === 'pickup' 
                                        ? (isRTL ? 'استلام من البوتيك' : 'Boutique Click & Collect') 
                                        : (isRTL ? 'توصيل مجاني في قطر' : 'Complimentary Qatar Delivery')}
                                </span>
                            </div>
                            {shippingAddress && fulfillmentType === 'delivery' && (
                                <div className="meta-row">
                                    <span>{isRTL ? 'عنوان التوصيل:' : 'Delivery Address:'}</span>
                                    <span className="meta-value address">{shippingAddress}</span>
                                </div>
                            )}
                            {paymentMethod && (
                                <div className="meta-row">
                                    <span>{isRTL ? 'طريقة الدفع:' : 'Payment Method:'}</span>
                                    <span className="meta-value">{paymentMethod}</span>
                                </div>
                            )}
                            {total > 0 && (
                                <div className="meta-row total-highlight-row">
                                    <span>{isRTL ? 'الإجمالي المستحق:' : 'Total Amount:'}</span>
                                    <span className="meta-total-price">{Math.round(total)} QAR</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Secondary Navigation Buttons */}
                <div className="success-action-buttons-row">
                    <button 
                        type="button"
                        className="btn btn-gold success-primary-nav-btn" 
                        onClick={() => navigate('/profile')}
                    >
                        <span>{isRTL ? 'عرض في حسابي' : 'VIEW IN MY ORDERS'}</span>
                        <ArrowRight size={16} />
                    </button>

                    <button 
                        type="button"
                        className="btn btn-outline success-secondary-nav-btn" 
                        onClick={() => navigate(`/track-order?orderId=${encodeURIComponent(orderId)}${customerPhone ? `&identifier=${encodeURIComponent(customerPhone)}` : ''}`)}
                    >
                        <Package size={16} />
                        <span>{isRTL ? 'تتبع مسار الطلب' : 'TRACK ORDER'}</span>
                    </button>

                    <button 
                        type="button"
                        className="btn btn-outline success-secondary-nav-btn" 
                        onClick={() => navigate('/shop')}
                    >
                        <span>{isRTL ? 'مواصلة التسوق' : 'CONTINUE SHOPPING'}</span>
                    </button>
                </div>

                {/* Luxury Authenticity Guarantee Footer */}
                <div className="success-security-strip">
                    <ShieldCheck size={16} color="#D4AF37" />
                    <span>
                        {isRTL 
                            ? 'أصالة مضمونة 100٪ • تغليف فاخر من مركز الدوحة • دعم مباشر عبر واتساب' 
                            : '100% Authentic Luxury Fragrances • Dispatched from Doha Fulfillment Center • White-Glove Support'}
                    </span>
                </div>

            </div>

            {/* Background Decorative Gold Stars */}
            <Sparkles 
                className="bg-sparkle top-right"
                color="#D4AF37" 
                size={36} 
            />
            <Sparkles 
                className="bg-sparkle bottom-left"
                color="#D4AF37" 
                size={30} 
            />
        </div>
    );
};

export default CheckoutSuccess;
