import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api_v1_0_2';
import { ShopContext } from '../../context/ShopContext';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { RegionContext } from '../../context/RegionContext';
import { 
    CreditCard, 
    Truck, 
    AlertCircle, 
    CalendarDays, 
    Clock, 
    MapPin, 
    Store, 
    Tag, 
    Check, 
    User, 
    Mail, 
    Phone, 
    Sparkles, 
    ChevronDown, 
    ShieldCheck, 
    Award, 
    Navigation 
} from 'lucide-react';
import './Checkout.css';

const Checkout = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { isRTL = false } = useOutletContext() || {};
    const { activeRegion, formatPrice, currency } = useContext(RegionContext);
    const { placeConsolidatedOrder, showToast, validateCoupon } = useContext(ShopContext);
    const { clearCart } = useContext(CartContext);
    const { user } = useContext(AuthContext);

    const orderData = location.state;

    const [formData, setFormData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        country: 'QA',
        zone: '',
        street: '',
        building: '',
        unit: '', // Kahramaa / Blue Plate / Apartment
        city: 'Doha',
        landmark: '',
        notes: ''
    });

    const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [couponCode, setCouponCode] = useState(orderData?.couponCode || '');
    const [discount, setDiscount] = useState(orderData?.discount || 0);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponAppliedInfo, setCouponAppliedInfo] = useState(null);
    const [fulfillmentType, setFulfillmentType] = useState(orderData?.isReservation ? 'pickup' : 'delivery');
    const [pickupShopId, setPickupShopId] = useState(orderData?.shop_id || '');
    const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
    const [pickupDateTime, setPickupDateTime] = useState('');
    const [shops, setShops] = useState([]);

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const res = await api.get('/shops?status=active');
                const list = Array.isArray(res.data) ? res.data : [];
                setShops(list);
                if (list.length > 0 && !pickupShopId) {
                    setPickupShopId(list[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch shops:", err);
            }
        };
        fetchShops();
    }, []);

    useEffect(() => {
        if (!orderData) navigate('/shop');
    }, [orderData, navigate]);

    if (!orderData) return null;

    /* ── Determine mode ── */
    const isCartMode = orderData.fromCart === true;

    /* ── Cart mode values ── */
    const cartItems = isCartMode ? orderData.cartItems : [];
    const cartSubtotal = isCartMode ? orderData.cartTotal : 0;

    /* ── Single-product mode values ── */
    const singleProduct = !isCartMode ? orderData.product : null;
    const singleQty = !isCartMode ? (orderData.quantity || 1) : 1;
    const singleGiftWrap = !isCartMode ? (orderData.isGiftWrapped || false) : false;
    const singleSize = !isCartMode ? orderData.selectedSize : null;
    const singleUnitPrice = !isCartMode && singleProduct 
        ? parseFloat(orderData.selectedPrice || singleProduct.price) 
        : 0;
    const singleSubtotal = singleUnitPrice * singleQty;
    const giftWrapCost = !isCartMode && singleGiftWrap ? 10 * singleQty : 0;

    /* ── Shared totals ── */
    const baseSubtotal = isCartMode ? cartSubtotal : singleSubtotal;
    const discountAmount = baseSubtotal * (discount / 100);
    const cartTotalAfterDiscount = baseSubtotal - discountAmount;
    const shippingCost = 0; // Complimentary Qatar delivery
    const total = cartTotalAfterDiscount + (isCartMode ? 0 : giftWrapCost) + shippingCost;

    /* ── Dynamic WhatsApp Number Resolution ── */
    const resolveWhatsAppNumber = () => {
        const defaultConcierge = '97430301901';

        if (fulfillmentType === 'pickup' && pickupShopId) {
            const chosenShop = shops.find(s => String(s.id) === String(pickupShopId));
            if (chosenShop?.whatsapp_number) {
                return chosenShop.whatsapp_number.replace(/\D/g, '');
            }
        }

        if (isCartMode) {
            const uniqueShopIds = [...new Set(cartItems.map(i => i.shop_id || i.product?.shop_id).filter(Boolean))];
            if (uniqueShopIds.length === 1) {
                const singleShop = shops.find(s => String(s.id) === String(uniqueShopIds[0]));
                if (singleShop?.whatsapp_number) {
                    return singleShop.whatsapp_number.replace(/\D/g, '');
                }
            }
            return defaultConcierge;
        }

        // Single product mode
        const prodShopId = pickupShopId || singleProduct?.shop_id;
        const targetShop = shops.find(s => String(s.id) === String(prodShopId));
        return targetShop?.whatsapp_number ? targetShop.whatsapp_number.replace(/\D/g, '') : defaultConcierge;
    };

    /* ── Coupon Verification (Backend-enforced, zero PII exposure) ── */
    const applyCoupon = async (e) => {
        if (e) e.preventDefault();
        if (!couponCode.trim()) return;

        setCouponLoading(true);
        setError('');

        const res = await validateCoupon(
            couponCode.trim(),
            baseSubtotal,
            formData.email || user?.email || '',
            formData.phone || user?.phone || ''
        );

        setCouponLoading(false);

        if (res.valid) {
            if (res.discountType === 'percentage') {
                setDiscount(res.discountValue);
                setCouponAppliedInfo(`${res.discountValue}% OFF`);
                showToast(t('cart.coupon_applied', { value: `${res.discountValue}%` }), 'success');
            } else {
                const pct = Math.min(100, Math.round((res.discountValue / baseSubtotal) * 100));
                setDiscount(pct);
                setCouponAppliedInfo(`${res.discountValue} QAR OFF`);
                showToast(t('cart.coupon_applied', { value: `${res.discountValue} QAR` }), 'success');
            }
        } else {
            setDiscount(0);
            setCouponAppliedInfo(null);
            showToast(res.error || t('cart.coupon_invalid'), 'error');
            setError(res.error || t('cart.coupon_invalid'));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'country' && value !== 'QA' && fulfillmentType === 'pickup') {
            setFulfillmentType('delivery');
        }
    };

    /* ── Submit Consolidated Order ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (orderData.isReservation) {
            if (!formData.fullName || !formData.phone || !pickupShopId || !pickupDateTime) {
                setError(t('checkout.error_required'));
                return;
            }
            
            setIsSubmitting(true);
            const startDate = new Date(pickupDateTime);
            const endDate = new Date(startDate.getTime() + 60*60*1000);

            try {
                const res = await api.post('/reservations', {
                    shop_id: pickupShopId,
                    product_id: singleProduct.id,
                    quantity: singleQty,
                    pickup_time_start: startDate.toISOString(),
                    pickup_time_end: endDate.toISOString()
                });
                
                setIsSubmitting(false);
                navigate('/checkout-success', { 
                    state: { 
                        orderId: 'RSV-' + Date.now(), 
                        isReservation: true,
                        shop: shops.find(s => String(s.id) === String(pickupShopId))
                    } 
                });
            } catch (err) {
                setError(err.response?.data?.error || err.message || 'Failed to create reservation');
                setIsSubmitting(false);
            }
            return;
        }

        // Validate Delivery Details (Strictly Qatar)
        if (fulfillmentType === 'delivery') {
            if (!formData.fullName.trim()) {
                setError(isRTL ? 'يرجى إدخال الاسم بالكامل' : 'Please enter your full name');
                return;
            }
            if (!formData.phone.trim()) {
                setError(isRTL ? 'يرجى إدخال رقم الهاتف للتواصل والتوصيل' : 'Please enter your contact phone number');
                return;
            }
            if (!formData.zone.trim() || !formData.street.trim() || !formData.building.trim()) {
                setError(isRTL ? 'يرجى إدخال بيانات العنوان الوطني القطري (المنطقة، الشارع، المبنى)' : 'Please complete the Qatar National Address (Zone, Street, Building Number)');
                return;
            }
        } else {
            if (!formData.fullName.trim() || !formData.phone.trim() || !pickupShopId) {
                setError(t('checkout.error_required'));
                return;
            }
        }

        setIsSubmitting(true);

        // Build Qatar Shipping Address
        let shippingAddress = '';
        if (fulfillmentType === 'pickup') {
            shippingAddress = `Store Pickup: ${shops.find(s => String(s.id) === String(pickupShopId))?.name || 'Selected Boutique'}`;
        } else {
            const unitPart = formData.unit?.trim() ? `, (${formData.unit.trim()})` : '';
            const landmarkPart = formData.landmark?.trim() ? ` [${isRTL ? 'أقرب معلم:' : 'Landmark:'} ${formData.landmark.trim()}]` : '';
            shippingAddress = `${isRTL ? 'منطقة' : 'Zone'} ${formData.zone.trim()}, ${isRTL ? 'شارع' : 'Street'} ${formData.street.trim()}, ${isRTL ? 'مبنى' : 'Building'} ${formData.building.trim()}${unitPart}, ${formData.city.trim()}, State of Qatar${landmarkPart}`;
        }

        // Construct normalized item objects
        const itemsPayload = isCartMode ? cartItems.map(item => ({
            id: item.product.id,
            product_id: item.product.id,
            shop_id: item.shop_id || item.product.shop_id || pickupShopId,
            name: item.product.name,
            brand: item.product.brand,
            quantity: item.quantity,
            price: parseFloat(item.selectedPrice || item.product.price) + (item.isGiftWrapped ? 10 : 0),
            selectedPrice: parseFloat(item.selectedPrice || item.product.price),
            isGiftWrapped: Boolean(item.isGiftWrapped),
            size: item.selectedSize && typeof item.selectedSize === 'object' ? item.selectedSize.name : (item.selectedSize || item.product.size)
        })) : [{
            id: singleProduct.id,
            product_id: singleProduct.id,
            shop_id: pickupShopId || singleProduct.shop_id,
            name: singleProduct.name,
            brand: singleProduct.brand,
            quantity: singleQty,
            price: singleUnitPrice + giftWrapCost,
            selectedPrice: singleUnitPrice,
            isGiftWrapped: Boolean(singleGiftWrap),
            size: singleSize || (Array.isArray(singleProduct.size) ? (typeof singleProduct.size[0] === 'object' ? singleProduct.size[0].name : singleProduct.size[0]) : singleProduct.size)
        }];

        // Single consolidated order submission to backend
        const result = await placeConsolidatedOrder({
            customerName: formData.fullName.trim(),
            email: (formData.email || user?.email || '').trim(),
            phone: formData.phone.trim(),
            shippingAddress,
            paymentMethod,
            items: itemsPayload,
            fulfillmentType,
            pickupShopId: fulfillmentType === 'pickup' ? pickupShopId : null,
            couponCode: discount > 0 ? couponCode.trim() : null,
            total
        });

        if (result.success) {
            if (isCartMode) clearCart();

            const generatedOrderId = result.orderId;
            const targetWhatsApp = resolveWhatsAppNumber();

            // Formulate WhatsApp message text
            const itemsText = itemsPayload.map(item => {
                const skuPart = item.id ? ` [REF: ${item.id}]` : '';
                return `• *${item.name}* (${item.brand})${skuPart}${item.size ? ` - ${item.size}` : ''} x${item.quantity} -> ${Math.round(item.price * item.quantity)} QAR`;
            }).join('\n');

            const couponText = discount > 0 ? `\n🎟️ *${isRTL ? 'كود الخصم:' : 'Coupon Code:'}* ${couponCode.trim()} (${discount}% OFF)` : '';
            const fulfillmentLabel = fulfillmentType === 'pickup' 
                ? (isRTL ? 'استلام من البوتيك' : 'Boutique Click & Collect') 
                : (isRTL ? 'توصيل محلي في قطر' : 'Qatar Courier Delivery');

            const messageText = isRTL
                ? `🛍️ *طلب جديد عبر PerfumeHub Qatar: ${generatedOrderId}*${couponText}\n\n` +
                  `👤 *العميل:* ${formData.fullName}\n` +
                  `📱 *الهاتف:* ${formData.phone}\n` +
                  `📍 *طريقة الاستلام:* ${fulfillmentLabel}\n` +
                  (fulfillmentType === 'delivery' ? `🏠 *العنوان الوطني القطري:* ${shippingAddress}\n` : '') +
                  `💵 *طريقة الدفع:* ${paymentMethod}\n` +
                  `💰 *الإجمالي المستحق:* ${Math.round(total)} QAR\n\n` +
                  `*تفاصيل العطور المختارة:*\n${itemsText}\n\n` +
                  `✅ *يرجى تأكيد تجهيز الطلب الفاخر.*`
                : `🛍️ *New Order on PerfumeHub Qatar: ${generatedOrderId}*${couponText}\n\n` +
                  `👤 *Customer:* ${formData.fullName}\n` +
                  `📱 *Phone:* ${formData.phone}\n` +
                  `📍 *Fulfillment:* ${fulfillmentLabel}\n` +
                  (fulfillmentType === 'delivery' ? `🏠 *Qatar National Address:* ${shippingAddress}\n` : '') +
                  `💵 *Payment:* ${paymentMethod}\n` +
                  `💰 *Total Amount:* ${Math.round(total)} QAR\n\n` +
                  `*Selected Luxury Fragrances:*\n${itemsText}\n\n` +
                  `✅ *Please confirm my order preparation.*`;

            const waUrl = `https://api.whatsapp.com/send?phone=${targetWhatsApp}&text=${encodeURIComponent(messageText)}`;
            window.open(waUrl, '_blank');

            setIsSubmitting(false);
            navigate('/checkout-success', { 
                state: { 
                    orderId: generatedOrderId, 
                    id: result.id,
                    fulfillmentType,
                    pickupShop: shops.find(s => String(s.id) === String(pickupShopId)),
                    items: itemsPayload,
                    total
                } 
            });
        } else {
            setIsSubmitting(false);
            setError(result.error || t('checkout.error_order'));
        }
    };

    return (
        <div className="checkout-page animate-fade-in">
            <div className="container">
                <h1 className="section-title">{t('checkout.title')}</h1>

                <form onSubmit={handleSubmit} className="checkout-container">
                    <div className="checkout-main">

                        {error && (
                            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Fulfillment Selection */}
                        {!orderData.isReservation && (
                            <div className="checkout-section">
                                <h3><Store size={20} /> {isRTL ? 'طريقة الاستلام' : 'Fulfillment Method'}</h3>
                                <div className="payment-options">
                                    <label className={`payment-option ${fulfillmentType === 'delivery' ? 'active recommended' : ''}`}>
                                        <input 
                                            type="radio" 
                                            name="fulfillmentType" 
                                            value="delivery" 
                                            checked={fulfillmentType === 'delivery'} 
                                            onChange={e => setFulfillmentType(e.target.value)} 
                                        />
                                        <div className="payment-option-content">
                                            <div className="payment-option-header">
                                                <span>{isRTL ? 'توصيل لكافة مناطق قطر' : 'Doorstep Delivery Across Qatar'}</span>
                                                <span className="recommended-badge">{isRTL ? 'شحن سريع' : 'Fast Courier'}</span>
                                            </div>
                                            <p className="payment-option-desc">
                                                {isRTL 
                                                    ? 'توصيل آمن إلى منزلك في الدوحة، لوسيل، الريان، والوكرة خلال ساعات.' 
                                                    : 'Complimentary premium white-glove courier delivery across Doha, Lusail & Qatar.'}
                                            </p>
                                        </div>
                                    </label>
                                    <label className={`payment-option ${fulfillmentType === 'pickup' ? 'active' : ''}`}>
                                        <input 
                                            type="radio" 
                                            name="fulfillmentType" 
                                            value="pickup" 
                                            checked={fulfillmentType === 'pickup'} 
                                            onChange={e => setFulfillmentType(e.target.value)} 
                                        />
                                        <div className="payment-option-content">
                                            <div className="payment-option-header">
                                                <span>{isRTL ? 'الاستلام المباشر من البوتيك' : 'Click & Collect from Boutique'}</span>
                                            </div>
                                            <p className="payment-option-desc">
                                                {isRTL 
                                                    ? 'تجهيز عطرك الفاخر للاستلام الفوري من فروعنا المعتمدة مع بطاقة VIP.' 
                                                    : 'Pick up immediately at your preferred Qatar boutique with VIP pass.'}
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Customer & Address Details */}
                        <div className="checkout-section">
                            {fulfillmentType === 'delivery' ? (
                                <h3><Truck size={20} /> {isRTL ? 'بيانات التوصيل والعنوان' : 'Delivery & Destination Address'}</h3>
                            ) : (
                                <h3><User size={20} /> {isRTL ? 'معلومات العميل واختيار البوتيك' : 'Customer & Boutique Details'}</h3>
                            )}

                            {/* Exclusive Qatar Delivery Confirmation Badge */}
                            {fulfillmentType === 'delivery' && !orderData.isReservation && (
                                <div className="qatar-address-hint" style={{ marginBottom: '18px' }}>
                                    <Navigation size={16} />
                                    <span>
                                        {isRTL 
                                            ? '🇶🇦 التوصيل متاح حصرياً داخل دولة قطر — العنوان الوطني: رقم المنطقة، رقم الشارع، ورقم المبنى (اللوحة الزرقاء) لضمان سرعة الوصول.' 
                                            : '🇶🇦 Exclusive Doorstep Delivery Across the State of Qatar: Zone, Street, and Building Number (Blue Plate) ensure rapid dispatch.'}
                                    </span>
                                </div>
                            )}

                            <div className="form-group">
                                <label><User size={15} /> {t('checkout.full_name')}</label>
                                <input 
                                    type="text" 
                                    name="fullName" 
                                    value={formData.fullName} 
                                    onChange={handleInputChange} 
                                    placeholder={isRTL ? 'مثال: محمد بن ناصر' : 'e.g. Mohammed Al-Kuwari'}
                                    required 
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label><Mail size={15} /> {t('checkout.email')}</label>
                                    <input 
                                        type="email" 
                                        name="email" 
                                        value={formData.email} 
                                        onChange={handleInputChange} 
                                        placeholder="customer@example.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>
                                        <Phone size={15} /> {t('checkout.phone')} (+974)
                                    </label>
                                    <input 
                                        type="tel" 
                                        name="phone" 
                                        value={formData.phone} 
                                        onChange={handleInputChange} 
                                        placeholder="+974 5500 0000"
                                        required 
                                    />
                                </div>
                            </div>

                            {/* Boutique Selection for Pickup (Qatar Only) */}
                            {(fulfillmentType === 'pickup' || orderData.isReservation) && (
                                <div className="shop-select-group">
                                    <label className="form-group-label">
                                        <Store size={15} /> {isRTL ? 'اختر بوتيك الاستلام في قطر' : 'Select Boutique Location in Qatar'}
                                    </label>
                                    
                                    <div className="custom-shop-dropdown">
                                        <button
                                            type="button"
                                            className={`custom-shop-trigger ${isShopDropdownOpen ? 'open' : ''}`}
                                            onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                                        >
                                            <div className="selected-shop-info">
                                                <MapPin size={16} className="shop-icon" />
                                                <span className="selected-shop-name">
                                                    {shops.find(s => String(s.id) === String(pickupShopId))?.name || (isRTL ? 'اختر الفرع' : 'Select Boutique')}
                                                </span>
                                                {shops.find(s => String(s.id) === String(pickupShopId))?.address && (
                                                    <span className="selected-shop-addr">
                                                        ({shops.find(s => String(s.id) === String(pickupShopId))?.address})
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronDown size={18} className={`chevron-icon ${isShopDropdownOpen ? 'rotated' : ''}`} />
                                        </button>

                                        {isShopDropdownOpen && (
                                            <div className="custom-shop-options">
                                                {shops.map(shop => {
                                                    const isSelected = String(pickupShopId) === String(shop.id);
                                                    return (
                                                        <div
                                                            key={shop.id}
                                                            className={`shop-option-item ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => {
                                                                setPickupShopId(shop.id);
                                                                setIsShopDropdownOpen(false);
                                                            }}
                                                        >
                                                            <div className="option-main-info">
                                                                <span className="option-name">{shop.name}</span>
                                                                <span className="option-address">{shop.address}</span>
                                                            </div>
                                                            {isSelected && <Check size={16} className="option-check-icon" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Qatar National Address Fields */}
                            {fulfillmentType === 'delivery' && !orderData.isReservation && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>{isRTL ? 'رقم المنطقة (Zone)' : 'Zone Number'}</label>
                                            <input 
                                                type="text" 
                                                name="zone" 
                                                value={formData.zone} 
                                                onChange={handleInputChange} 
                                                placeholder={isRTL ? 'مثال: 66 (الدفنة / عنيزة)' : 'e.g. 66 (Onaiza)'} 
                                                required 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>{isRTL ? 'رقم / اسم الشارع (Street)' : 'Street Number / Name'}</label>
                                            <input 
                                                type="text" 
                                                name="street" 
                                                value={formData.street} 
                                                onChange={handleInputChange} 
                                                placeholder={isRTL ? 'مثال: 850' : 'e.g. 850'} 
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>{isRTL ? 'رقم المبنى / الفيلا (Building)' : 'Building / Villa Number'}</label>
                                            <input 
                                                type="text" 
                                                name="building" 
                                                value={formData.building} 
                                                onChange={handleInputChange} 
                                                placeholder={isRTL ? 'مثال: 12' : 'e.g. 12'} 
                                                required 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>{isRTL ? 'البلدية / المدينة' : 'City / Municipality'}</label>
                                            <select 
                                                name="city" 
                                                value={formData.city} 
                                                onChange={handleInputChange} 
                                                required
                                            >
                                                <option value="Doha">{isRTL ? 'الدوحة' : 'Doha'}</option>
                                                <option value="Lusail">{isRTL ? 'مدينة لوسيل' : 'Lusail'}</option>
                                                <option value="Al Rayyan">{isRTL ? 'الريان' : 'Al Rayyan'}</option>
                                                <option value="Al Wakrah">{isRTL ? 'الوكرة' : 'Al Wakrah'}</option>
                                                <option value="Al Khor">{isRTL ? 'الخور' : 'Al Khor'}</option>
                                                <option value="Umm Salal">{isRTL ? 'أم صلال' : 'Umm Salal'}</option>
                                                <option value="Al Daayen">{isRTL ? 'الظعاين' : 'Al Daayen'}</option>
                                                <option value="Al Sheehaniya">{isRTL ? 'الشحانية' : 'Al Sheehaniya'}</option>
                                                <option value="Madinat ash Shamal">{isRTL ? 'مدينة الشمال' : 'Madinat ash Shamal'}</option>
                                                <option value="Mesaieed">{isRTL ? 'مسيعيد' : 'Mesaieed'}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>{isRTL ? 'رقم الشقة / لوحة كهرماء الزرقاء (اختياري)' : 'Unit / Kahramaa Blue Plate ID (Optional)'}</label>
                                        <input 
                                            type="text" 
                                            name="unit" 
                                            value={formData.unit} 
                                            onChange={handleInputChange} 
                                            placeholder={isRTL ? 'مثال: شقة 402 أو رقم لوحة كهرماء' : 'e.g. Apt 402 or Blue Plate ID'} 
                                        />
                                    </div>

                                    {/* Qatar National Address Live Blue Plate Preview */}
                                    <div className="qatar-blue-plate-wrapper">
                                        <div className="blue-plate-badge-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Navigation size={15} color="#0a3366" />
                                                <span>{isRTL ? 'معاينة اللوحة الزرقاء للعنوان الوطني' : 'Qatar National Address Plate Preview'}</span>
                                            </div>
                                            <span className="blue-plate-live-tag">
                                                <Sparkles size={12} /> {isRTL ? 'تحديث فوري' : 'Live Formatted'}
                                            </span>
                                        </div>

                                        <div className="qatar-blue-plate-card">
                                            <div className="blue-plate-header-strip">
                                                <span>{isRTL ? 'دولة قطر' : 'STATE OF QATAR'}</span>
                                                <span style={{ fontWeight: '800', letterSpacing: '0.5px' }}>
                                                    {isRTL ? 'العنوان الوطني' : 'NATIONAL ADDRESS'}
                                                </span>
                                                <span>{formData.city || 'DOHA'}</span>
                                            </div>

                                            <div className="blue-plate-grid">
                                                <div className="blue-plate-col">
                                                    <span className="blue-plate-label-ar">مبنى</span>
                                                    <span className={`blue-plate-val ${!formData.building ? 'placeholder' : ''}`}>
                                                        {formData.building || '—'}
                                                    </span>
                                                    <span className="blue-plate-label-en">BUILDING</span>
                                                </div>

                                                <div className="blue-plate-col">
                                                    <span className="blue-plate-label-ar">شارع</span>
                                                    <span className={`blue-plate-val ${!formData.street ? 'placeholder' : ''}`}>
                                                        {formData.street || '—'}
                                                    </span>
                                                    <span className="blue-plate-label-en">STREET</span>
                                                </div>

                                                <div className="blue-plate-col">
                                                    <span className="blue-plate-label-ar">منطقة</span>
                                                    <span className={`blue-plate-val ${!formData.zone ? 'placeholder' : ''}`}>
                                                        {formData.zone || '—'}
                                                    </span>
                                                    <span className="blue-plate-label-en">ZONE</span>
                                                </div>
                                            </div>

                                            <div className="blue-plate-footer">
                                                <span>
                                                    {formData.unit 
                                                        ? (isRTL ? `الوحدة / كهرماء: ${formData.unit}` : `Unit / Kahramaa: ${formData.unit}`) 
                                                        : (isRTL ? 'توصيل مبرد VIP حتى باب منزلك' : 'VIP Climate-Controlled Doorstep Delivery')}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <ShieldCheck size={14} color="#d4af37" />
                                                    <span>{isRTL ? 'عنوان موثق' : 'Verified Format'}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Payment Method */}
                        {!orderData.isReservation && (
                            <div className="checkout-section">
                                <h3><CreditCard size={20} /> {t('checkout.payment_method')}</h3>
                                <div className="payment-options">
                                    <div className="payment-option active recommended">
                                        <div className="payment-option-content">
                                            <div className="payment-option-header">
                                                <span>{isRTL ? 'الدفع عند الاستلام كاش / بطاقة (COD)' : 'Cash / Card on Delivery (COD)'}</span>
                                                <span className="recommended-badge">{isRTL ? 'الأكثر طلباً' : 'Popular in Qatar'}</span>
                                            </div>
                                            <p className="payment-option-desc">
                                                {isRTL 
                                                    ? 'ادفع نقداً أو بالبطاقة البنكية لمندوب التوصيل عند فحص واستلام عطورك.' 
                                                    : 'Pay securely upon arrival after inspecting your luxury fragrance packaging.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="checkout-sidebar">
                        <div className="order-summary">
                            <h3>{t('cart.order_summary')}</h3>

                            <div className="summary-product-list">
                                {isCartMode ? (
                                    cartItems.map((item, idx) => (
                                        <div key={idx} className="summary-product">
                                            <img src={Array.isArray(item.product.image) ? item.product.image[0] : item.product.image} alt={item.product.name} />
                                            <div className="summary-product-info">
                                                <h4>{item.product.name}</h4>
                                                <p>{item.product.brand}{item.selectedSize ? ` • ${typeof item.selectedSize === 'object' ? item.selectedSize.name : item.selectedSize}` : ''}</p>
                                                <p style={{ fontSize: '0.85rem' }}>
                                                    {t('checkout.qty')} {item.quantity} × {formatPrice(item.selectedPrice || item.product.price, currency, isRTL)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="summary-product">
                                        <img src={Array.isArray(singleProduct.image) ? singleProduct.image[0] : singleProduct.image} alt={singleProduct.name} />
                                        <div className="summary-product-info">
                                            <h4>{singleProduct.name}</h4>
                                            <p>{singleProduct.brand} • {singleSize || (Array.isArray(singleProduct.size) ? (typeof singleProduct.size[0] === 'object' ? singleProduct.size[0].name : singleProduct.size[0]) : singleProduct.size)}</p>
                                            <p style={{ fontSize: '0.85rem' }}>
                                                {t('checkout.qty')} {singleQty} × {formatPrice(singleUnitPrice, currency, isRTL)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Coupon Section */}
                            <div className="checkout-coupon-section">
                                <label className="coupon-label">
                                    <Tag size={15} /> {isRTL ? 'رمز الخصم / الكوبون' : 'Have a Promo Code?'}
                                </label>
                                <div className="coupon-input-group">
                                    <input 
                                        type="text" 
                                        className="coupon-input" 
                                        placeholder={isRTL ? 'أدخل كود الخصم' : 'Enter coupon code'} 
                                        value={couponCode} 
                                        onChange={e => setCouponCode(e.target.value)} 
                                        disabled={couponLoading}
                                    />
                                    <button 
                                        className="coupon-apply-btn" 
                                        type="button" 
                                        onClick={applyCoupon}
                                        disabled={couponLoading}
                                    >
                                        {couponLoading ? (isRTL ? 'جاري التحقق...' : 'Checking...') : t('cart.apply')}
                                    </button>
                                </div>
                                {couponAppliedInfo && (
                                    <div className="coupon-success-pill">
                                        <Sparkles size={13} />
                                        <span>{couponAppliedInfo}</span>
                                    </div>
                                )}
                            </div>

                            {/* Totals */}
                            <div className="summary-metrics">
                                <div className="summary-item">
                                    <span>{t('cart.subtotal')}</span>
                                    <span>{formatPrice(baseSubtotal, currency, isRTL)}</span>
                                </div>
                                {!isCartMode && singleGiftWrap && (
                                    <div className="summary-item">
                                        <span>{t('checkout.gift_wrapping')}</span>
                                        <span>{formatPrice(giftWrapCost, currency, isRTL)}</span>
                                    </div>
                                )}
                                {discount > 0 && (
                                    <div className="summary-item" style={{ color: '#2e7d32' }}>
                                        <span>{t('cart.discount')} ({discount}%)</span>
                                        <span>-{formatPrice(discountAmount, currency, isRTL)}</span>
                                    </div>
                                )}
                                <div className="summary-item">
                                    <span>{t('cart.shipping')}</span>
                                    <span>{shippingCost === 0 ? (isRTL ? 'مجاني (قطر)' : 'Complimentary (Qatar)') : formatPrice(shippingCost, currency, isRTL)}</span>
                                </div>
                                <div className="summary-item total">
                                    <span>{t('cart.total')}</span>
                                    <span>{formatPrice(total, currency, isRTL)}</span>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="btn-confirm" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting 
                                    ? t('checkout.processing') 
                                    : (orderData.isReservation 
                                        ? (isRTL ? 'تأكيد الحجز في البوتيك' : 'Confirm Boutique Reservation') 
                                        : (isRTL ? 'تأكيد الطلب الفاخر عبر واتساب' : 'Confirm Luxury Order via WhatsApp'))}
                            </button>

                            {/* Trust Badges */}
                            <div className="checkout-trust-badges">
                                <div className="trust-badge-item">
                                    <ShieldCheck size={16} />
                                    <span>{isRTL ? 'عطور أصلية 100% مضمونة من المصدر' : '100% Authentic Guaranteed Niche Perfumes'}</span>
                                </div>
                                <div className="trust-badge-item">
                                    <Truck size={16} />
                                    <span>{isRTL ? 'شحن فوري وسريع داخل قطر' : 'Fast White-Glove Qatar Courier Delivery'}</span>
                                </div>
                                <div className="trust-badge-item">
                                    <Award size={16} />
                                    <span>{isRTL ? 'خدمة عملاء VIP وتواصل مباشر عبر واتساب' : 'Direct VIP Boutique WhatsApp Concierge'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Checkout;
