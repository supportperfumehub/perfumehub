import React, { useContext, useEffect, useState } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CartContext } from '../../context/CartContext';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import { ShoppingBag, Trash2, ShieldCheck, Truck } from 'lucide-react';
import './Cart.css';

const Cart = () => {
    const { t } = useTranslation();
    const { isRTL } = useOutletContext();
    const navigate = useNavigate();
    const { cartItems, removeFromCart, updateQuantity, clearCart, getCartTotal } = useContext(CartContext);
    const { coupons, showToast } = useContext(ShopContext);
    const { user } = useContext(AuthContext);
    const [orderStatus, setOrderStatus] = useState(null);
    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState(0);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleCheckout = () => {
        if (cartItems.length === 0) return;
        navigate('/checkout', {
            state: {
                fromCart: true,
                cartItems,
                discount,
                couponCode,
                cartTotal: getCartTotal(),
                cartTotalAfterDiscount,
                shippingCost,
                finalTotal
            }
        });
    };

    const applyCoupon = () => {
        if (!couponCode) return;

        const now = new Date();
        const validCoupon = coupons.find(c =>
            c.code.toUpperCase() === couponCode.toUpperCase() &&
            c.isActive &&
            new Date(c.expiryDate) >= now &&
            (!c.usageLimit || (c.usageCount || 0) < c.usageLimit) &&
            (!user || !c.usedBy || !c.usedBy.includes(user.email.toLowerCase()))
        );

        if (validCoupon) {
            // Handle both percentage and fixed discounts
            if (validCoupon.discountType === 'percentage') {
                setDiscount(validCoupon.discountValue);
                showToast(t('cart.coupon_applied', { value: `${validCoupon.discountValue}%` }), 'success');
            } else {
                // For fixed discounts, we calculate the equivalent percentage for the current subtotal
                const subtotal = getCartTotal();
                const equivalentPercentage = Math.round((validCoupon.discountValue / subtotal) * 100);
                setDiscount(equivalentPercentage);
                showToast(t('cart.coupon_applied', { value: `${validCoupon.discountValue} ${t('common.currency')}` }), 'success');
            }
        } else {
            const coupon = coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
            const isLimitReached = coupon && coupon.usageLimit && (coupon.usageCount >= coupon.usageLimit);
            const isAlreadyUsed = user && coupon && coupon.usedBy && coupon.usedBy.includes(user.email.toLowerCase());

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

    const cartTotalAfterDiscount = getCartTotal() - (getCartTotal() * (discount / 100));
    const shippingCost = cartTotalAfterDiscount > 999 ? 0 : 30;
    const finalTotal = cartTotalAfterDiscount + shippingCost;

    return (
        <div className="cart-page animate-fade-in">
            <div className="container section cart-container">
                <h1 className="cart-title">{t('cart.title')}</h1>

                {orderStatus && (
                    <div className={`alert ${orderStatus.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '20px', padding: '15px', borderRadius: '8px', backgroundColor: orderStatus.type === 'success' ? '#d4edda' : '#f8d7da', color: orderStatus.type === 'success' ? '#155724' : '#721c24' }}>
                        {orderStatus.message}
                    </div>
                )}

                {cartItems.length === 0 ? (
                    <div className="empty-cart text-center">
                        <ShoppingBag size={64} className="empty-icon text-muted" style={{ margin: '0 auto 20px', display: 'block' }} />
                        <h2>{t('cart.empty')}</h2>
                        <p>{t('cart.empty_desc')}</p>
                        <Link to="/shop" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
                            {t('cart.continue_shopping')}
                        </Link>
                    </div>
                ) : (
                    <div className="cart-content">
                        <div className="cart-items-wrapper">
                            {cartItems.map((item, index) => (
                                <div key={`${item.product.id}-${index}`} className="cart-item">
                                    <div className="cart-item-image">
                                        <Link to={`/product/${item.product.id}`}>
                                            <img src={Array.isArray(item.product.image) ? item.product.image[0] : item.product.image} alt={item.product.name} />
                                        </Link>
                                    </div>
                                    <div className="cart-item-details">
                                        <div className="cart-item-header">
                                            <h3 className="cart-item-title">
                                                <Link to={`/product/${item.product.id}`}>{item.product.name} {item.selectedSize ? `(${item.selectedSize})` : ''}</Link>
                                            </h3>
                                            <button
                                                className="remove-btn"
                                                onClick={() => removeFromCart(item.product.id, item.isGiftWrapped, item.selectedSize)}
                                                title={t('cart.remove')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <p className="cart-item-brand text-muted">{item.product.brand}</p>
                                        {item.isGiftWrapped && (
                                            <p className="gift-badge">{t('cart.gift_wrap')}</p>
                                        )}

                                        <div className="cart-item-actions">
                                            <div className="quantity-selector cart-quantity">
                                                <button onClick={() => updateQuantity(item.product.id, item.isGiftWrapped, item.selectedSize, item.quantity - 1)} disabled={item.quantity <= 1}>-</button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.product.id, item.isGiftWrapped, item.selectedSize, item.quantity + 1)} disabled={item.quantity >= (item.product.stock !== undefined ? item.product.stock : 10)}>+</button>
                                            </div>
                                            <div className="cart-item-price">
                                                <span className="cart-item-price-current">{(parseFloat(item.product.price) + (item.isGiftWrapped ? 10 : 0)) * item.quantity} {t('common.currency')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="cart-summary-panel">
                            <div className="cart-summary">
                                <h3>{isRTL ? 'ملخص الطلب' : 'Order Summary'}</h3>
                                
                                <div className="cart-coupon" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fcfcfc', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder={t('cart.coupon_placeholder')}
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                            style={{ flex: 1, marginBottom: 0, fontSize: '0.85rem', height: '38px', borderRadius: '8px' }}
                                        />
                                        <button className="btn btn-outline" onClick={applyCoupon} style={{ height: '38px', padding: '0 15px', fontSize: '0.85rem', borderRadius: '8px' }}>{t('cart.apply')}</button>
                                    </div>
                                </div>

                                <div className="summary-row">
                                    <span>{t('cart.subtotal')}</span>
                                    <span>{getCartTotal()} {t('common.currency')}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="summary-row text-success">
                                        <span>{t('cart.discount')} ({discount}%)</span>
                                        <span>-{(getCartTotal() * (discount / 100)).toFixed(0)} {t('common.currency')}</span>
                                    </div>
                                )}
                                <div className="summary-row">
                                    <span>{t('cart.shipping')}</span>
                                    <span>{shippingCost === 0 ? t('cart.free') : `${shippingCost} ${t('common.currency')}`}</span>
                                </div>
                                <div className="summary-row total-row">
                                    <span>{t('cart.total')}</span>
                                    <span>{Math.round(finalTotal)} {t('common.currency')}</span>
                                </div>

                                <button className="checkout-btn" onClick={handleCheckout}>
                                    {t('cart.checkout')}
                                </button>

                                <div className="cart-badges">
                                    <div className="badge small" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ShieldCheck size={16} color="#444" />
                                        <span>{t('cart.secure_payment')}</span>
                                    </div>
                                    <div className="badge small" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Truck size={16} color="#444" />
                                        <span>{t('cart.free_delivery_threshold')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cart;
