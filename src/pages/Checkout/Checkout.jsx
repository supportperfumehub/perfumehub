import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShopContext } from '../../context/ShopContext';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { CreditCard, Truck, AlertCircle } from 'lucide-react';
import './Checkout.css';

const Checkout = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { isRTL } = useOutletContext();
    const { placeOrder, coupons, showToast, incrementCouponUsage } = useContext(ShopContext);
    const { clearCart } = useContext(CartContext);
    const { user } = useContext(AuthContext);

    const orderData = location.state;

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        zone: '',
        street: '',
        building: '',
        city: 'Doha',
        pincode: '',
    });
    const [paymentMethod, setPaymentMethod] = useState('WhatsApp Confirmation');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [couponCode, setCouponCode] = useState(orderData?.couponCode || '');
    const [discount, setDiscount] = useState(orderData?.discount || 0);
    const [userIP, setUserIP] = useState('');

    useEffect(() => {
        const fetchIP = async () => {
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                const data = await res.json();
                setUserIP(data.ip);
            } catch (err) {
                console.error("Failed to fetch IP:", err);
            }
        };
        fetchIP();
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
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
    const singleSubtotal = !isCartMode && singleProduct ? parseFloat(singleProduct.price) * singleQty : 0;
    const giftWrapCost = !isCartMode && singleGiftWrap ? 10 * singleQty : 0;

    /* ── Shared totals ── */
    const baseSubtotal = isCartMode ? cartSubtotal : singleSubtotal;
    const cartTotalAfterDiscount = baseSubtotal - (baseSubtotal * (discount / 100));
    const shippingCost = 0;
    const total = cartTotalAfterDiscount + (isCartMode ? 0 : giftWrapCost) + shippingCost;

    /* ── Coupon ── */
    const applyCoupon = (e) => {
        e.preventDefault();
        if (!couponCode) return;

        const now = new Date();
        const validCoupon = coupons.find(c =>
            c.code.toUpperCase() === couponCode.toUpperCase() &&
            c.isActive &&
            new Date(c.expiryDate) >= now &&
            (!c.usageLimit || (c.usageCount || 0) < c.usageLimit) &&
            (!formData.email || !c.usedBy || !c.usedBy.includes(formData.email.toLowerCase())) &&
            (!user || !c.usedBy || !c.usedBy.includes(user.email.toLowerCase())) &&
            (!formData.phone || !c.usedByPhones || !c.usedByPhones.includes(formData.phone.trim())) &&
            (!userIP || !c.usedByIPs || !c.usedByIPs.includes(userIP))
        );

        if (validCoupon) {
            // Handle both percentage and fixed discounts
            if (validCoupon.discountType === 'percentage') {
                setDiscount(validCoupon.discountValue);
                showToast(t('cart.coupon_applied', { value: `${validCoupon.discountValue}%` }), 'success');
            } else {
                // For fixed discounts, we calculate the equivalent percentage for the current subtotal
                const subtotal = baseSubtotal;
                const equivalentPercentage = Math.round((validCoupon.discountValue / subtotal) * 100);
                setDiscount(equivalentPercentage);
                showToast(t('cart.coupon_applied', { value: `${validCoupon.discountValue} ${t('common.currency')}` }), 'success');
            }
        } else {
            const coupon = coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
            const isLimitReached = coupon && coupon.usageLimit && (coupon.usageCount >= coupon.usageLimit);
            const isAlreadyUsed = (formData.email && coupon && coupon.usedBy && coupon.usedBy.includes(formData.email.toLowerCase())) ||
                (user && coupon && coupon.usedBy && coupon.usedBy.includes(user.email.toLowerCase())) ||
                (formData.phone && coupon && coupon.usedByPhones && coupon.usedByPhones.includes(formData.phone.trim())) ||
                (userIP && coupon && coupon.usedByIPs && coupon.usedByIPs.includes(userIP));

            setDiscount(0);
            if (isAlreadyUsed) {
                showToast(t('cart.coupon_already_used'), 'error');
            } else if (isLimitReached) {
                showToast(t('cart.coupon_limit_reached'), 'error');
            } else {
                showToast(t('cart.coupon_invalid'), 'error');
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    /* ── Submit ── */
    /* ── Submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.fullName || !formData.zone || !formData.street || !formData.building || !formData.phone || !formData.city) {
            setError(t('checkout.error_required'));
            return;
        }

        // Final Coupon Check
        if (discount > 0 && couponCode) {
            const now = new Date();
            const finalCouponCheck = coupons.find(c =>
                c.code.toUpperCase() === couponCode.toUpperCase() &&
                c.isActive &&
                new Date(c.expiryDate) >= now &&
                (!c.usageLimit || (c.usageCount || 0) < c.usageLimit) &&
                (!formData.email || !c.usedBy || !c.usedBy.includes(formData.email.toLowerCase())) &&
                (!user || !c.usedBy || !c.usedBy.includes(user.email.toLowerCase())) &&
                (!formData.phone || !c.usedByPhones || !c.usedByPhones.includes(formData.phone.trim())) &&
                (!userIP || !c.usedByIPs || !c.usedByIPs.includes(userIP))
            );

            if (!finalCouponCheck) {
                setDiscount(0);
                setError(t('checkout.error_coupon_invalid'));
                showToast(t('cart.coupon_invalid'), 'error');
                return;
            }
        }

        setIsSubmitting(true);
        const shippingAddress = `${isRTL ? 'مبنى' : 'Building'} ${formData.building}, ${isRTL ? 'شارع' : 'Street'} ${formData.street}, ${isRTL ? 'منطقة' : 'Zone'} ${formData.zone}, ${formData.city}${formData.pincode ? `, ${formData.pincode}` : ''}`;

        let allSuccess = true;
        let generatedOrderId = `ORD-${Date.now()}`;

        // 1. PLACE ORDERS (Persist to Database)
        if (isCartMode) {
            for (const item of cartItems) {
                const ok = await placeOrder(
                    item.product,
                    item.quantity,
                    formData.fullName,
                    item.isGiftWrapped,
                    shippingAddress,
                    paymentMethod,
                    formData.email,
                    formData.phone,
                    item.selectedSize,
                    item.selectedPrice
                );
                if (!ok) allSuccess = false;
            }
        } else {
            const ok = await placeOrder(
                singleProduct,
                singleQty,
                formData.fullName,
                singleGiftWrap,
                shippingAddress,
                paymentMethod,
                formData.email,
                formData.phone,
                singleSize,
                orderData.selectedPrice
            );
            if (!ok) allSuccess = false;
        }

        if (allSuccess) {
            // 2. POST-ORDER LOGIC (Increment, Clear, Formspree)
            if (discount > 0 && couponCode) {
                incrementCouponUsage(couponCode, formData.email, formData.phone, userIP);
            }
            if (isCartMode) clearCart();

            // Send to Formspree in background
            const itemsSummary = isCartMode
                ? cartItems.map(item => `- ${item.product.name} (${item.product.brand})${item.selectedSize ? ` Size: ${item.selectedSize}` : ''} x${item.quantity}`).join('\n')
                : `- ${singleProduct.name} (${singleProduct.brand})${singleSize ? ` Size: ${singleSize}` : ''} x${singleQty}`;

            const formspreePayload = {
                "Full Name": formData.fullName,
                "Email": formData.email || 'N/A',
                "Phone": formData.phone,
                "Address": shippingAddress,
                "Payment": paymentMethod,
                "Items": itemsSummary,
                "Total": `${Math.round(total)} QAR`,
                "Coupon": couponCode || "None"
            };

            fetch("https://formspree.io/f/maqpbaro", {
                method: "POST",
                headers: { "Accept": "application/json", "Content-Type": "application/json" },
                body: JSON.stringify(formspreePayload)
            }).catch(e => console.error("Email backup failed", e));

            // 3. WHATSAPP OPENING
            if (paymentMethod === 'WhatsApp Confirmation') {
                const whatsappNumber = "97430301901";
                const itemsText = isCartMode
                    ? cartItems.map(item => `• ${item.product.name}${item.selectedSize ? ` (${item.selectedSize})` : ''} x${item.quantity}`).join('\n')
                    : `• ${singleProduct.name}${singleSize ? ` (${singleSize})` : ''} x${singleQty}`;

                const couponText = discount > 0 ? `\n\u{1F3AB} *${isRTL ? 'كوبون:' : 'Coupon:'}* ${couponCode}` : '';
                const messageText = isRTL
                    ? `\u{1F6CD} *طلب جديد: ${generatedOrderId}*${couponText}\n\u{1F464} *العميل:* ${formData.fullName}\n\u{1F4CD} *العنوان:* منطقة ${formData.zone}، شارع ${formData.street}، مبنى ${formData.building}، ${formData.city}\n\n*المنتجات:*\n${itemsText}\n\n\u{2705} *يرجى تأكيد طلبي.*`
                    : `\u{1F6CD} *New Order: ${generatedOrderId}*${couponText}\n\u{1F464} *Customer:* ${formData.fullName}\n\u{1F4CD} *Address:* Zone ${formData.zone}, Street ${formData.street}, Building ${formData.building}, ${formData.city}\n\n*Items:*\n${itemsText}\n\n\u{2705} *Please confirm my order.*`;

                const url = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(messageText)}`;
                window.open(url, '_blank');
            }

            // 4. NAVIGATE TO SUCCESS
            setIsSubmitting(false);
            navigate('/checkout-success', { state: { orderId: generatedOrderId } });
        } else {
            setIsSubmitting(false);
            setError(t('checkout.error_order'));
        }
    };

    return (
        <div className="checkout-page">
            <div className="container">
                <h1 className="section-title">{t('checkout.title')}</h1>

                <form onSubmit={handleSubmit} className="checkout-container">
                    <div className="checkout-main">

                        {error && (
                            <div className="alert alert-danger">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}

                        {/* Shipping Address */}
                        <div className="checkout-section">
                            <h3><Truck size={20} /> {t('checkout.shipping_address')}</h3>

                            <div className="form-group">
                                <label>{t('checkout.full_name')}</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('checkout.email')}</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>{t('checkout.phone')}</label>
                                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('checkout.zone')}</label>
                                    <input type="text" name="zone" value={formData.zone} onChange={handleInputChange} placeholder="e.g. 66" required />
                                </div>
                                <div className="form-group">
                                    <label>{t('checkout.street')}</label>
                                    <input type="text" name="street" value={formData.street} onChange={handleInputChange} placeholder="e.g. 850" required />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('checkout.building')}</label>
                                    <input type="text" name="building" value={formData.building} onChange={handleInputChange} placeholder="e.g. 12" required />
                                </div>
                                <div className="form-group">
                                    <label>{t('checkout.city')}</label>
                                    <select name="city" value={formData.city} onChange={handleInputChange} className="form-control" required style={{ width: '100%', height: '48px' }}>
                                        <option value="Doha">{t('checkout.cities.doha')}</option>
                                        <option value="Al Rayyan">{t('checkout.cities.rayyan')}</option>
                                        <option value="Al Wakrah">{t('checkout.cities.wakrah')}</option>
                                        <option value="Al Khor">{t('checkout.cities.khor')}</option>
                                        <option value="Lusail">{t('checkout.cities.lusail')}</option>
                                        <option value="Umm Salal">{t('checkout.cities.salal')}</option>
                                        <option value="Al Sheehaniya">{t('checkout.cities.sheehaniya')}</option>
                                        <option value="Madinat ash Shamal">{t('checkout.cities.shamal')}</option>
                                        <option value="Mesaieed">{t('checkout.cities.mesaieed')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="checkout-section">
                            <h3><CreditCard size={20} /> {t('checkout.payment_method')}</h3>
                            <div className="payment-options">
                                <label className={`payment-option recommended ${paymentMethod === 'WhatsApp Confirmation' ? 'active' : ''}`}>
                                    <input type="radio" name="paymentMethod" value="WhatsApp Confirmation" checked={paymentMethod === 'WhatsApp Confirmation'} onChange={e => setPaymentMethod(e.target.value)} />
                                    <div className="payment-option-content">
                                        <div className="payment-option-header">
                                            <span>{t('checkout.whatsapp')}</span>
                                            <span className="recommended-badge">{t('checkout.recommended')}</span>
                                        </div>
                                        <p className="payment-option-desc">{t('checkout.whatsapp_desc')}</p>
                                    </div>
                                </label>
                                <label className={`payment-option ${paymentMethod === 'Credit Card' ? 'active' : ''}`}>
                                    <input type="radio" name="paymentMethod" value="Credit Card" checked={paymentMethod === 'Credit Card'} onChange={e => setPaymentMethod(e.target.value)} />
                                    <span>{t('checkout.credit_card')}</span>
                                </label>
                                <label className={`payment-option ${paymentMethod === 'Cash on Delivery' ? 'active' : ''}`}>
                                    <input type="radio" name="paymentMethod" value="Cash on Delivery" checked={paymentMethod === 'Cash on Delivery'} onChange={e => setPaymentMethod(e.target.value)} />
                                    <span>{t('checkout.cod')}</span>
                                </label>
                            </div>
                        </div>
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
                                                <p>{item.product.brand}{item.selectedSize ? ` • ${item.selectedSize}` : ''}</p>
                                                <p>{t('checkout.qty')} {item.quantity} × {item.selectedPrice || item.product.price} {t('common.currency')}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="summary-product">
                                        <img src={Array.isArray(singleProduct.image) ? singleProduct.image[0] : singleProduct.image} alt={singleProduct.name} />
                                        <div className="summary-product-info">
                                            <h4>{singleProduct.name}</h4>
                                            <p>{singleProduct.brand} • {singleSize || (Array.isArray(singleProduct.size) ? (typeof singleProduct.size[0] === 'object' ? singleProduct.size[0].name : singleProduct.size[0]) : singleProduct.size)}</p>
                                            <p>{t('checkout.qty')} {singleQty} × {orderData.selectedPrice || singleProduct.price} {t('common.currency')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Coupon */}
                            <div className="cart-coupon" style={{ marginBottom: '20px', paddingTop: '20px', borderTop: '1px solid #f9f9f9' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="text" className="form-control" placeholder={t('cart.coupon_placeholder')} value={couponCode} onChange={e => setCouponCode(e.target.value)} style={{ flex: 1, marginBottom: 0, height: '38px', fontSize: '0.85rem' }} />
                                    <button className="btn btn-outline" type="button" onClick={applyCoupon} style={{ height: '38px', padding: '0 12px', fontSize: '0.8rem' }}>{t('cart.apply')}</button>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="summary-metrics">
                                <div className="summary-item">
                                    <span>{t('cart.subtotal')}</span>
                                    <span>{Math.round(baseSubtotal)} {t('common.currency')}</span>
                                </div>
                                {!isCartMode && singleGiftWrap && (
                                    <div className="summary-item">
                                        <span>{t('checkout.gift_wrapping')}</span>
                                        <span>{Math.round(giftWrapCost)} {t('common.currency')}</span>
                                    </div>
                                )}
                                {discount > 0 && (
                                    <div className="summary-item" style={{ color: '#2e7d32' }}>
                                        <span>{t('cart.discount')} ({discount}%)</span>
                                        <span>-{(baseSubtotal * (discount / 100)).toFixed(0)} {t('common.currency')}</span>
                                    </div>
                                )}
                                <div className="summary-item">
                                    <span>{t('cart.shipping')}</span>
                                    <span>{shippingCost === 0 ? t('cart.free') : `${shippingCost} ${t('common.currency')}`}</span>
                                </div>
                                <div className="summary-item total">
                                    <span>{t('cart.total')}</span>
                                    <span>{Math.round(total)} {t('common.currency')}</span>
                                </div>
                            </div>

                            <button type="submit" className="btn-confirm" disabled={isSubmitting}>
                                {isSubmitting ? t('checkout.processing') : t('checkout.confirm_order')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Checkout;
