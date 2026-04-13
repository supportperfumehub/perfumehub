import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ShopContext } from '../../context/ShopContext';
import { CartContext } from '../../context/CartContext';
import { WishlistContext } from '../../context/WishlistContext';
import { ShoppingBag, Heart, Share2, ShieldCheck, Truck, RotateCcw, Gift, Check, Store, MapPin } from 'lucide-react';
import './ProductDetails.css';

// Haversine formula to calculate distance between two lat/lng pairs in km
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const ProductDetails = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const { isRTL } = useOutletContext();
    const { products: mockProducts, placeOrder } = useContext(ShopContext);
    const { addToCart } = useContext(CartContext);
    const { toggleWishlist, isInWishlist } = useContext(WishlistContext);
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState(null);
    const [isGiftWrapped, setIsGiftWrapped] = useState(false);
    const [orderStatus, setOrderStatus] = useState(null);
    const [addedToCart, setAddedToCart] = useState(false);
    const [activeImageIdx, setActiveImageIdx] = useState(0);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [shopsData, setShopsData] = useState([]);
    const [relatedShopItems, setRelatedShopItems] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const DESCRIPTION_LIMIT = 200;

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const response = await fetch('/api/shops?status=active');
                if (response.ok) {
                    const data = await response.json();
                    setShopsData(data);
                }
            } catch (error) {
                console.error("Failed to fetch shops:", error);
            }
        };
        fetchShops();
    }, []);

    const detectLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
            }, (error) => {
                console.error("Error getting location:", error);
            });
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        const foundProduct = mockProducts.find(p => String(p.id) === String(id));
        if (foundProduct) {
            setProduct(foundProduct);
            // Default to the first variant if available
            const defaultSize = Array.isArray(foundProduct.size) && foundProduct.size.length > 0 
                ? (typeof foundProduct.size[0] === 'object' ? foundProduct.size[0].name : foundProduct.size[0])
                : foundProduct.size;
            setSelectedSize(defaultSize);

            // Find shared items dynamically by matching name, but deduplicate by shop to ensure a shop only appears once
            const related = mockProducts.filter(p => p.name === foundProduct.name);
            const uniqueRelated = [];
            const seenShops = new Set();
            related.forEach(p => {
                const shopKey = p.shop_id || 'global';
                if (!seenShops.has(shopKey)) {
                    seenShops.add(shopKey);
                    uniqueRelated.push(p);
                }
            });
            setRelatedShopItems(uniqueRelated);
        }
    }, [id, mockProducts]);

    if (!product) return <div className="container section text-center" style={{ paddingTop: '150px' }}>Loading...</div>;

    const productImageUrl = Array.isArray(product.image) ? product.image[activeImageIdx] : product.image;
    const metaDescription = product.description
        ? product.description.substring(0, 155)
        : t('product.meta_desc', { name: product.name, brand: product.brand });

    const jsonLd = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": productImageUrl,
        "description": metaDescription,
        "brand": {
            "@type": "Brand",
            "name": product.brand
        },
        "sku": product.sku || `PH-${product.id}-24`,
        "offers": {
            "@type": "Offer",
            "url": window.location.href,
            "priceCurrency": "QAR",
            "price": product.price,
            "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition"
        }
    };

    const selectedVariant = Array.isArray(product.size) 
        ? product.size.find(s => (typeof s === 'object' ? s.name : s) === selectedSize)
        : null;
    
    const displayPrice = selectedVariant && typeof selectedVariant === 'object' 
        ? selectedVariant.price 
        : product.price;
    
    const displayOldPrice = selectedVariant && typeof selectedVariant === 'object' 
        ? selectedVariant.oldPrice 
        : product.oldPrice;

    const displayDiscount = displayOldPrice && displayOldPrice > displayPrice 
        ? Math.round((1 - displayPrice / displayOldPrice) * 100)
        : product.discount;

    return (
        <div className="product-details-page">
            <Helmet>
                <title>{product.name} | {product.brand} - PerfumeHub</title>
                <meta name="description" content={metaDescription} />
                <meta property="og:title" content={`${product.name} | ${product.brand} - PerfumeHub`} />
                <meta property="og:description" content={metaDescription} />
                <meta property="og:image" content={productImageUrl} />
                <meta property="og:url" content={window.location.href} />
                <meta property="og:type" content="product" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${product.name} | ${product.brand}`} />
                <meta name="twitter:description" content={metaDescription} />
                <meta name="twitter:image" content={productImageUrl} />
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            </Helmet>

            <div className="product-page-top-accent animate-fade-in">
                <div className="container">
                    <div className="top-branding-bar">
                        <span className="branding-text">
                            {isRTL ? (
                                <>مجموعة <span className="text-gold">بيرفيوم هوب</span> الفاخرة</>
                            ) : (
                                <>PERFUMEHUB <span className="text-gold">LUXURY</span> SELECTION</>
                            )}
                        </span>
                        <div className="branding-line"></div>
                        <div className="breadcrumbs-minimal">
                            <Link to="/">{isRTL ? 'الرئيسية' : 'Home'}</Link> /
                            <Link to="/shop">{isRTL ? 'التسوق' : 'Shop'}</Link> /
                            <span>{product.name}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container section details-container">

                {/* Left Column: Media + Trust Badges */}
                <div className="product-media-column">
                    <div className="product-gallery animate-fade-in">
                        <div className="main-image-wrapper">
                            <img 
                                key={activeImageIdx}
                                src={productImageUrl} 
                                alt={product.name} 
                                className="main-image-display"
                            />
                        </div>
                        <div className="thumbnail-track">
                            {Array.isArray(product.image) ? (
                                product.image.map((img, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`thumbnail-card ${idx === activeImageIdx ? 'active' : ''}`}
                                        onClick={() => setActiveImageIdx(idx)}
                                    >
                                        <img src={img} alt={`Thumbnail ${idx + 1}`} />
                                    </div>
                                ))
                            ) : (
                                <div className="thumbnail-card active">
                                    <img src={product.image} alt="Thumbnail 1" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {orderStatus && (
                    <div className={`alert ${orderStatus.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '20px', padding: '15px', borderRadius: '8px', backgroundColor: orderStatus.type === 'success' ? '#d4edda' : '#f8d7da', color: orderStatus.type === 'success' ? '#155724' : '#721c24' }}>
                        {orderStatus.message}
                    </div>
                )}

                {/* Right Column: Product Info */}
                <div className="product-info-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>

                    <div className="product-brand-group">
                        <span className="brand-name">{product.brand}</span>
                        <span className="product-gender-tag">{isRTL ? (
                            product.gender === 'men' ? 'للرجال' : product.gender === 'women' ? 'للنساء' : 'للجنسين'
                        ) : (
                            product.gender === 'men' ? "Men's Fragrance" : product.gender === 'women' ? "Women's Fragrance" : 'Unisex'
                        )}</span>
                    </div>
                    <h1 className="product-name">{product.name}</h1>
                    <p className="product-type-large">
                        {product.type}
                        {selectedSize && ` • ${selectedSize}`}
                    </p>

                    <div className="price-section">
                        <div className="price-container">
                            <span className="current-price">{Math.round(displayPrice)} {t('common.currency')}</span>
                            {displayOldPrice && displayOldPrice > displayPrice && (
                                <span className="old-price">{Math.round(displayOldPrice)} {t('common.currency')}</span>
                            )}
                            {displayDiscount > 0 && <span className="discount-tag">{t('product.save')} {displayDiscount}%</span>}
                        </div>
                    </div>

                    {Array.isArray(product.size) && product.size.length > 1 && (
                        <div className="size-selector" style={{ marginBottom: '20px' }}>
                            <h4 style={{ marginBottom: '10px', fontSize: '1rem', color: 'var(--text-secondary)' }}>{t('product.select_size')}</h4>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {product.size.map((s, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedSize(typeof s === 'object' ? s.name : s)}
                                        style={{
                                            padding: '8px 16px',
                                            border: `1px solid ${selectedSize === (typeof s === 'object' ? s.name : s) ? 'var(--primary, #000)' : '#ccc'}`,
                                            backgroundColor: selectedSize === (typeof s === 'object' ? s.name : s) ? 'var(--primary, #000)' : 'transparent',
                                            color: selectedSize === (typeof s === 'object' ? s.name : s) ? '#fff' : 'inherit',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        className={selectedSize === (typeof s === 'object' ? s.name : s) ? 'active' : ''}
                                    >
                                        {typeof s === 'object' ? s.name : s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}


                    {(product.topNotes || product.middleNotes || product.baseNotes) && (
                        <div className="olfactory-pyramid">
                            <h3 className="notes-title">{isRTL ? 'مكونات العطر:' : 'Fragrance Notes:'}</h3>
                            <div className="notes-container">
                                {product.topNotes && (
                                    <div className="note-item">
                                        <span className="note-label">{isRTL ? 'إفتتاحية العطر:' : 'TOP NOTES:'}</span>
                                        <span className="note-value">{product.topNotes}</span>
                                    </div>
                                )}
                                {product.middleNotes && (
                                    <div className="note-item">
                                        <span className="note-label">{isRTL ? 'قلب العطر:' : 'MIDDLE NOTES:'}</span>
                                        <span className="note-value">{product.middleNotes}</span>
                                    </div>
                                )}
                                {product.baseNotes && (
                                    <div className="note-item">
                                        <span className="note-label">{isRTL ? 'قاعدة العطر:' : 'BASE NOTES:'}</span>
                                        <span className="note-value">{product.baseNotes}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Olfactory pyramid already shows the notes. Description removed as per user request to avoid overlap. */}

                    <div className="purchase-actions">
                        <div className="quantity-selector-wrapper">
                            <div className="quantity-selector">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={product.stock === 0}>-</button>
                                <span className="qty-value">{quantity}</span>
                                <button onClick={() => setQuantity(Math.min((product.stock !== undefined ? product.stock : 10), quantity + 1))} disabled={product.stock === 0}>+</button>
                            </div>
                            <button
                                className="btn-reserve-store"
                                onClick={() => {
                                    // Dynamically get the currently selected shop's whatsapp number
                                    let targetNumber = '97430301901'; // Default PerfumeHub Admin Number
                                    let targetShopName = isRTL ? 'المتجر الرئيسي' : 'Direct';
                                    
                                    if (product.shop_id) {
                                        const shop = shopsData.find(s => s.id === product.shop_id);
                                        if (shop) {
                                            targetShopName = shop.name;
                                            if (shop.whatsapp_number) {
                                                targetNumber = shop.whatsapp_number;
                                            }
                                        }
                                    }

                                    const message = isRTL 
                                        ? `مرحباً ${targetShopName}، أود حجز المنتج التالى في المتجر:\n${product.name}`
                                        : `Hello ${targetShopName}, I would like to reserve the following product in store:\n${product.name}`;
                                    window.open(`https://wa.me/${targetNumber.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                                }}
                            >
                                <span className="reserve-btn-text">{isRTL ? 'الحجز في المتجر' : 'Reserve in Store'}</span>
                                <Store size={16} className="reserve-btn-icon" />
                            </button>
                        </div>

                        <div className="options-card">
                            <div className="gift-wrap-option">
                                <div className="gift-wrap-content">
                                    <Gift size={18} className="gift-icon" />
                                    <div className="gift-text">
                                        <label htmlFor="giftWrapCheckbox">{t('product.gift_wrap')}</label>
                                        <span>{t('product.gift_wrap_desc')}</span>
                                    </div>
                                </div>
                                <div className="toggle-wrapper">
                                    <input
                                        type="checkbox"
                                        id="giftWrapCheckbox"
                                        checked={isGiftWrapped}
                                        onChange={(e) => setIsGiftWrapped(e.target.checked)}
                                        className="toggle-input"
                                    />
                                    <label htmlFor="giftWrapCheckbox" className="toggle-label"></label>
                                </div>
                            </div>
                        </div>

                        <div className="action-buttons-group">
                            <button
                                className={`btn add-to-cart-large ${addedToCart ? 'btn-success' : ''}`}
                                disabled={product.stock === 0}
                                onClick={() => {
                                    addToCart(product, quantity, isGiftWrapped, selectedSize, displayPrice);
                                    setAddedToCart(true);
                                    setTimeout(() => setAddedToCart(false), 2000);
                                }}
                                style={{ 
                                    backgroundColor: addedToCart ? 'var(--success, #28a745)' : 'var(--color-gold)', 
                                    border: 'none', 
                                    color: '#fff'
                                }}
                            >
                                {addedToCart ? (
                                    <><Check size={18} style={{ margin: isRTL ? '0 0 0 8px' : '0 8px 0 0' }} />{t('product.added')}</>
                                ) : (
                                    <><ShoppingBag size={18} style={{ margin: isRTL ? '0 0 0 8px' : '0 8px 0 0' }} />{t('product.add_to_cart')}</>
                                )}
                            </button>

                            <button
                                className="btn-buy-now"
                                disabled={product.stock === 0}
                                onClick={() => {
                                    navigate('/checkout', { state: { product, quantity, isGiftWrapped, selectedSize, selectedPrice: displayPrice } });
                                }}
                            >
                                {t('product.buy_now')}
                            </button>
                        </div>

                        <div className="action-row-meta">
                            <div
                                className={`icon-btn-large ${isInWishlist(product.id) ? 'active' : ''}`}
                                onClick={() => toggleWishlist(product)}
                                style={{ color: isInWishlist(product.id) ? 'var(--danger, #dc3545)' : '' }}
                            >
                                <Heart size={20} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
                                <span>{t('product.wishlist')}</span>
                            </div>
                            <div className="icon-btn-large">
                                <Share2 size={20} />
                                <span>{t('product.share')}</span>
                            </div>
                        </div>

                        <div className="product-authenticity-note animate-fade-in" style={{ animationDelay: '0.3s' }}>
                            <p>
                                {isRTL 
                                    ? 'ملاحظة: قد يختلف شكل العبوة والتغليف بناءً على تحديثات المصنع، ولكننا نضمن أن جميع المنتجات أصلية 100% ومن مصادرها الرسمية.'
                                    : 'Note: Product packaging and presentation may vary based on manufacturer updates. We guarantee that all products are 100% authentic and sourced from official channels.'}
                            </p>
                            <div className="product-status-tag">
                                <strong>{t('product.status')}</strong>
                                <span className={`status-indicator ${product.stock === 0 ? 'out-of-stock' : 'in-stock'}`}>
                                    {product.stock === 0 ? t('product.out_of_stock') : t('product.in_stock')}
                                </span>
                            </div>
                        </div>

                        {relatedShopItems.length > 1 && shopsData.length > 0 && (
                            <div className="shop-selection-panel" style={{ marginBottom: '25px', padding: '15px', borderRadius: '10px', backgroundColor: 'var(--bg-light, #f8f9fa)' }}>
                                <h4 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--text-secondary, #666)' }}>
                                    {isRTL ? 'متاح أيضاً في هذه المتاجر:' : 'Available in these shops:'}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {relatedShopItems.map(item => {
                                        const isOurShop = !item.shop_id;
                                        const shopInfo = shopsData.find(s => s.id === item.shop_id);
                                        if (!isOurShop && !shopInfo) return null; // Shop not active
                                        
                                        const isSelected = String(item.id) === String(product.id);
                                        let shopName = isOurShop ? (isRTL ? 'بيرفيوم هب (المتجر الرئيسي)' : 'PerfumeHub Direct') : shopInfo.name;
                                        
                                        let badge = null;
                                        if (isOurShop) badge = <span className="shop-badge badge-primary">{isRTL ? 'الرئيسي' : 'Direct'}</span>;
                                        else if (shopInfo.is_recommended) badge = <span className="shop-badge badge-gold">{isRTL ? 'موصى به' : 'Recommended'}</span>;

                                        let distanceStr = "";
                                        if (userLocation && shopInfo?.latitude && shopInfo?.longitude) {
                                            const dist = calculateDistance(userLocation.lat, userLocation.lng, shopInfo.latitude, shopInfo.longitude);
                                            distanceStr = ` (${dist.toFixed(1)} km)`;
                                        }

                                        return (
                                            <label key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '10px', border: isSelected ? '2px solid var(--color-gold, #C5A059)' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', backgroundColor: isSelected ? 'rgba(197, 160, 89, 0.05)' : '#fff', transition: 'all 0.2s' }}>
                                                <input 
                                                    type="radio" 
                                                    name="shopSelection" 
                                                    checked={isSelected} 
                                                    onChange={() => navigate(`/product/${item.id}`)}
                                                    style={{ marginRight: '10px', accentColor: 'var(--color-gold, #C5A059)' }}
                                                />
                                                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: isSelected ? '600' : '500', fontSize: '0.95rem' }}>
                                                        {shopName} <span style={{color: '#888', fontSize: '0.85rem'}}>{distanceStr}</span>
                                                    </span>
                                                    {badge}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                {!userLocation && (
                                    <button className="btn-link" onClick={detectLocation} style={{ marginTop: '12px', fontSize: '0.85rem', padding: '0', background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={14} />
                                        {isRTL ? 'اكتشف المتجر الأقرب إليك' : 'Allow location to find nearest shop'}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="product-description-section animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            <h3 className="section-title">{isRTL ? 'وصف المنتج' : 'Product Description'}</h3>
                            <p className="description-text">
                                {product.description ? (
                                    (product.description.length > DESCRIPTION_LIMIT && !isDescriptionExpanded)
                                        ? `${product.description.substring(0, DESCRIPTION_LIMIT)}...`
                                        : product.description
                                ) : t('product.no_description')}
                            </p>
                            {product.description && product.description.length > DESCRIPTION_LIMIT && (
                                <button 
                                    className="read-more-btn"
                                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                >
                                    {isDescriptionExpanded ? t('product.read_less') : t('product.read_more')}
                                </button>
                            )}
                        </div>

                        <div className="trust-badges-grid-right animate-fade-in" style={{ animationDelay: '0.4s' }}>
                            <div className="trust-item">
                                <ShieldCheck size={20} className="trust-icon" />
                                <div className="trust-content">
                                    <strong>{t('product.authentic')}</strong>
                                    <span>{t('product.authentic_desc')}</span>
                                </div>
                            </div>
                            <div className="trust-item">
                                <Truck size={20} className="trust-icon" />
                                <div className="trust-content">
                                    <strong>{t('product.fast_shipping')}</strong>
                                    <span>{t('product.fast_shipping_desc')}</span>
                                </div>
                            </div>
                            <div className="trust-item">
                                <RotateCcw size={20} className="trust-icon" />
                                <div className="trust-content">
                                    <strong>{t('product.easy_returns')}</strong>
                                    <span>{t('product.easy_returns_desc')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
