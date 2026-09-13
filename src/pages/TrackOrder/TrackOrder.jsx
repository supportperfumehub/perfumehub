import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { 
    Search, Package, Truck, CheckCircle2, Clock, MapPin, 
    MessageCircle, AlertCircle, ShoppingBag, ArrowRight, ShieldCheck, QrCode
} from 'lucide-react';
import api from '../../utils/api_v1_0_2';
import './TrackOrder.css';

const TrackOrder = () => {
    const [searchParams] = useSearchParams();
    const outletCtx = useOutletContext();
    const { t, i18n } = useTranslation();
    const isRTL = outletCtx?.isRTL || i18n.language === 'ar' || document.documentElement.dir === 'rtl';

    const [orderId, setOrderId] = useState(searchParams.get('orderId') || searchParams.get('id') || '');
    const [identifier, setIdentifier] = useState(searchParams.get('identifier') || searchParams.get('phone') || searchParams.get('email') || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [trackResult, setTrackResult] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        setError('');

        if (!orderId.trim() || !identifier.trim()) {
            setError(isRTL ? 'يرجى إدخال رقم الطلب ورقم الهاتف أو البريد الإلكتروني' : 'Please enter both Order ID and Phone or Email');
            return;
        }

        try {
            setLoading(true);
            const res = await api.post('/orders/track', {
                orderId: orderId.trim(),
                identifier: identifier.trim()
            });

            if (res.data?.success) {
                setTrackResult(res.data);
                // Generate QR Code for order pickup verification
                const qrContent = res.data.type === 'reservation' 
                    ? `PERFUMEHUB-RESV-${res.data.reservation.id}-${res.data.reservation.code || 'VALID'}`
                    : `PERFUMEHUB-ORD-${res.data.order.id}`;

                QRCode.toDataURL(qrContent, {
                    width: 220,
                    margin: 1,
                    color: { dark: '#111827', light: '#ffffff' }
                }).then(url => setQrCodeUrl(url)).catch(() => {});
            } else {
                setError(res.data?.error || (isRTL ? 'لم يتم العثور على الطلب' : 'Order not found'));
            }
        } catch (err) {
            console.error('Track order error:', err);
            setError(err.response?.data?.error || (isRTL ? 'لم يتم العثور على أي طلب مطابق للبيانات المدخلة.' : 'No matching order found. Please check your Order ID and contact details.'));
        } finally {
            setLoading(false);
        }
    };

    // Auto-search if query params present
    useEffect(() => {
        if (orderId && identifier) {
            handleSearch();
        }
    }, []);

    // Helper for timeline steps
    const getTimelineState = (status, fulfillmentType) => {
        const normalized = String(status || '').toLowerCase();
        const isPickup = fulfillmentType === 'pickup';

        const steps = [
            { 
                id: 'placed', 
                titleEn: 'Order Confirmed', 
                titleAr: 'تم تأكيد الطلب',
                descEn: 'Payment verified & order logged',
                descAr: 'تم تسجيل الطلب وتأكيد الدفع'
            },
            { 
                id: 'preparing', 
                titleEn: 'Boutique Preparation', 
                titleAr: 'تجهيز الطلب بالبوتيك',
                descEn: 'Authenticity check & climate-control packing',
                descAr: 'فحص الجودة وتغليف مبرد فاخر'
            },
            { 
                id: 'transit', 
                titleEn: isPickup ? 'Ready for Collection' : 'Out for Delivery', 
                titleAr: isPickup ? 'جاهز للاستلام من البوتيك' : 'خرج مع مندوب التوصيل',
                descEn: isPickup ? 'Awaiting your visit with QR code' : 'Climate-controlled courier in transit',
                descAr: isPickup ? 'بانتظار زيارتكم الكريمة مع رمز الاستلام' : 'سيارة التوصيل المبردة في الطريق إليك'
            },
            { 
                id: 'completed', 
                titleEn: isPickup ? 'Collected from Boutique' : 'Delivered', 
                titleAr: isPickup ? 'تم الاستلام بنجاح' : 'تم التوصيل بنجاح',
                descEn: isPickup ? 'Handed over at boutique' : 'Delivered to your address',
                descAr: isPickup ? 'تم التسليم في البوتيك' : 'تم التسليم في عنوانك'
            }
        ];

        let activeIndex = 0;
        if (normalized === 'pending') activeIndex = 0;
        else if (normalized === 'preparing' || normalized === 'processing' || normalized === 'confirmed') activeIndex = 1;
        else if (normalized === 'ready_for_pickup' || normalized === 'dispatched' || normalized === 'shipped' || normalized === 'in_transit') activeIndex = 2;
        else if (normalized === 'completed' || normalized === 'delivered' || normalized === 'picked_up') activeIndex = 3;

        return { steps, activeIndex };
    };

    const isOrder = trackResult?.type === 'order';
    const orderData = trackResult?.order;
    const resvData = trackResult?.reservation;

    const currentStatus = isOrder ? orderData?.status : resvData?.status;
    const fulfillmentType = isOrder ? orderData?.fulfillment_type : 'pickup';
    const { steps, activeIndex } = getTimelineState(currentStatus, fulfillmentType);

    const whatsappConciergeUrl = `https://api.whatsapp.com/send?phone=97455555555&text=${encodeURIComponent(
        isRTL 
            ? `مرحباً كونسيرج PerfumeHub، استفسر عن طلبي رقم: ${orderId || 'غير محدد'}`
            : `Hello PerfumeHub Concierge, I am inquiring about my order: ${orderId || 'Not specified'}`
    )}`;

    return (
        <div className="track-order-page">
            {/* Header Hero */}
            <div className="track-hero">
                <div className="track-badge">
                    <ShieldCheck size={16} />
                    <span>{isRTL ? 'خدمة المتابعة الفورية' : 'Live Order & Boutique Tracker'}</span>
                </div>
                <h1>{isRTL ? 'تتبع طلبك وبصمتك العطرية' : 'Track Your Luxury Order'}</h1>
                <p>
                    {isRTL 
                        ? 'أدخل رقم الطلب ورقم الجوال أو البريد المسجل لمعرفة تفاصيل التوصيل المبرد أو استلام البوتيك الفوري.' 
                        : 'Enter your Order ID and registered Phone or Email for live dispatch updates and 1-hour boutique collection QR codes.'}
                </p>
            </div>

            {/* Tracking Search Card */}
            <div className="track-search-card">
                <form onSubmit={handleSearch} className="track-form">
                    <div className="track-input-group">
                        <label>{isRTL ? 'رقم الطلب / الحجز' : 'Order or Reservation ID'}</label>
                        <div className="input-with-icon">
                            <Package size={18} className="input-icon" />
                            <input 
                                type="text" 
                                placeholder={isRTL ? 'مثال: ORD-1024 أو 1024' : 'e.g. ORD-1024 or 1024'}
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="track-input-group">
                        <label>{isRTL ? 'رقم الجوال أو البريد الإلكتروني' : 'Phone Number or Email'}</label>
                        <div className="input-with-icon">
                            <Search size={18} className="input-icon" />
                            <input 
                                type="text" 
                                placeholder={isRTL ? 'رقم الهاتف المسجل بالطلب' : 'Registered phone or email'}
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-track-submit" disabled={loading}>
                        {loading ? (
                            <span>{isRTL ? 'جاري التحقق...' : 'Locating Order...'}</span>
                        ) : (
                            <>
                                <span>{isRTL ? 'تتبع الطلب الآن' : 'Track Order'}</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {error && (
                    <div className="track-error-alert">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Track Result View */}
            {trackResult && (
                <div className="track-result-container animate-fade-in">
                    {/* Status Header Banner */}
                    <div className="track-status-banner">
                        <div className="banner-left">
                            <span className="order-tag">
                                {isOrder ? orderData.orderNumber : `RES-${resvData.id}`}
                            </span>
                            <h2>
                                {isRTL ? 'حالة الطلب: ' : 'Status: '}
                                <span className="status-highlight">
                                    {String(currentStatus).toUpperCase().replace(/_/g, ' ')}
                                </span>
                            </h2>
                            <p className="order-timestamp">
                                {isOrder 
                                    ? new Date(orderData.created_at).toLocaleDateString(isRTL ? 'ar-QA' : 'en-US', { dateStyle: 'full', timeStyle: 'short' })
                                    : new Date(resvData.created_at).toLocaleDateString(isRTL ? 'ar-QA' : 'en-US', { dateStyle: 'full', timeStyle: 'short' })
                                }
                            </p>
                        </div>
                        <div className="banner-right">
                            <a 
                                href={whatsappConciergeUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn-concierge-chat"
                            >
                                <MessageCircle size={18} />
                                <span>{isRTL ? 'مساعدة كونسيرج الدوحة' : 'Doha Concierge Support'}</span>
                            </a>
                        </div>
                    </div>

                    {/* Timeline Tracker */}
                    <div className="track-timeline-card">
                        <h3 className="timeline-title">{isRTL ? 'مراحل تنفيذ وتجهيز الطلب' : 'Order Fulfillment Progress'}</h3>
                        <div className="timeline-steps">
                            {steps.map((step, idx) => {
                                const isDone = idx <= activeIndex;
                                const isCurrent = idx === activeIndex;

                                return (
                                    <div key={step.id} className={`timeline-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                                        <div className="step-circle">
                                            {isDone ? <CheckCircle2 size={20} /> : <Clock size={18} />}
                                        </div>
                                        <div className="step-content">
                                            <h4>{isRTL ? step.titleAr : step.titleEn}</h4>
                                            <p>{isRTL ? step.descAr : step.descEn}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pickup QR Code Card (if Click & Collect) */}
                    {fulfillmentType === 'pickup' && qrCodeUrl && (
                        <div className="pickup-qr-card">
                            <div className="qr-info">
                                <div className="qr-badge">
                                    <QrCode size={16} />
                                    <span>{isRTL ? 'رمز الاستلام السريع' : 'Contactless Pickup Pass'}</span>
                                </div>
                                <h3>{isRTL ? 'أظهر هذا الرمز لمستشار العطور في البوتيك' : 'Present this QR Pass at the Boutique'}</h3>
                                <p>
                                    {isRTL 
                                        ? 'تم تجهيز طلبك في عبوة مبردة خاصة. يمكنك استلامه فوراً من البوتيك عبر مسح هذا الرمز.'
                                        : 'Your items are packed in a climate-preserved luxury box. Scan this pass at the counter for instant priority collection.'}
                                </p>
                                <div className="pickup-location-box">
                                    <MapPin size={18} color="#d4af37" />
                                    <div>
                                        <strong>{isOrder ? (orderData.pickup_shop?.name || 'Souq Al Jabor Boutique') : (resvData.shop?.name || 'Souq Al Jabor Boutique')}</strong>
                                        <p>{isOrder ? (orderData.pickup_shop?.address || 'Building 14, Al Jabor St, Doha') : (resvData.shop?.address || 'Building 14, Al Jabor St, Doha')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="qr-image-wrapper">
                                <img src={qrCodeUrl} alt="Order Pickup QR Code" className="qr-code-img" />
                                <span className="qr-caption">{isOrder ? orderData.orderNumber : `CODE: ${resvData.code || 'READY'}`}</span>
                            </div>
                        </div>
                    )}

                    {/* Order Details & Summary */}
                    <div className="track-details-grid">
                        {/* Items Ordered */}
                        <div className="track-card items-card">
                            <h3>{isRTL ? 'المنتجات المطلوبة' : 'Items in this Order'}</h3>
                            <div className="order-items-list">
                                {isOrder ? (
                                    orderData.items?.map((item, idx) => (
                                        <div key={idx} className="track-item-row">
                                            <div className="item-meta">
                                                <h4>{item.name}</h4>
                                                <p className="item-brand">{item.brand} {item.size ? `• ${item.size}` : ''}</p>
                                                <span className="item-qty">{isRTL ? `الكمية: ${item.quantity}` : `Qty: ${item.quantity}`}</span>
                                            </div>
                                            <div className="item-price">
                                                {Math.round(item.price * item.quantity)} {isRTL ? 'ر.ق' : 'QAR'}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="track-item-row">
                                        <div className="item-meta">
                                            <h4>{resvData.product?.name}</h4>
                                            <p className="item-brand">{resvData.product?.brand}</p>
                                            <span className="item-qty">{isRTL ? 'حجز بوتيك مؤكد' : 'Confirmed Boutique Reservation'}</span>
                                        </div>
                                        <div className="item-price">
                                            {Math.round(resvData.product?.price || 0)} {isRTL ? 'ر.ق' : 'QAR'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Shipping & Delivery Address */}
                        <div className="track-card shipping-card">
                            <h3>{fulfillmentType === 'pickup' ? (isRTL ? 'تفاصيل الاستلام' : 'Collection Details') : (isRTL ? 'عنوان التوصيل' : 'Delivery Destination')}</h3>
                            {fulfillmentType === 'pickup' ? (
                                <div className="shipping-info-block">
                                    <p><strong>{isRTL ? 'طريقة الاستلام:' : 'Method:'}</strong> {isRTL ? 'استلام فوري من البوتيك' : '1-Hour Boutique Pickup'}</p>
                                    <p><strong>{isRTL ? 'البوتيك:' : 'Boutique:'}</strong> {isOrder ? (orderData.pickup_shop?.name || 'Souq Al Jabor Boutique') : (resvData.shop?.name || 'Souq Al Jabor Boutique')}</p>
                                    <p><strong>{isRTL ? 'ساعات العمل:' : 'Hours:'}</strong> {isRTL ? 'السبت - الخميس: 9:00 ص - 10:00 م' : 'Sat - Thu: 9:00 AM - 10:00 PM'}</p>
                                </div>
                            ) : (
                                <div className="shipping-info-block">
                                    <p><strong>{isRTL ? 'العميل:' : 'Recipient:'}</strong> {orderData.customer_name}</p>
                                    <p><strong>{isRTL ? 'العنوان:' : 'Address:'}</strong> {typeof orderData.shipping_address === 'string' ? orderData.shipping_address : (
                                        `${orderData.shipping_address?.building ? `Bldg ${orderData.shipping_address.building}, ` : ''}${orderData.shipping_address?.street ? `St ${orderData.shipping_address.street}, ` : ''}${orderData.shipping_address?.zone ? `Zone ${orderData.shipping_address.zone}, ` : ''}${orderData.shipping_address?.city || 'Doha'}`
                                    )}</p>
                                    <p><strong>{isRTL ? 'نوع الشحن:' : 'Service:'}</strong> {isRTL ? 'توصيل مبرد ومحمي للمناخ' : 'Climate-Controlled Luxury Courier'}</p>
                                </div>
                            )}

                            <div className="order-total-block">
                                <span>{isRTL ? 'المجموع الكلي:' : 'Total Amount:'}</span>
                                <strong>{isOrder ? Math.round(orderData.total) : Math.round(resvData.product?.price || 0)} {isRTL ? 'ر.ق' : 'QAR'}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrackOrder;
