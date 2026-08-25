import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ShopContext } from '../../context/ShopContext';
import { CartContext } from '../../context/CartContext';
import { WishlistContext } from '../../context/WishlistContext';
import { RegionContext } from '../../context/RegionContext';
import { ShoppingBag, Zap, Heart, Share2, ShieldCheck, Truck, RotateCcw, Gift, Check, Store, MapPin } from 'lucide-react';
import { PrimaryCTA, ReserveCTA } from '../../components/UI/Atoms';
import { getLocationWithFallback } from '../../utils/geolocation';
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
    const { activeRegion } = useContext(RegionContext);
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState(null);
    const [isGiftWrapped, setIsGiftWrapped] = useState(false);
    const [orderStatus, setOrderStatus] = useState(null);
    const [addedToCart, setAddedToCart] = useState(false);
    const [activeImageIdx, setActiveImageIdx] = useState(0);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isVendorsExpanded, setIsVendorsExpanded] = useState(false);
    const [shopsData, setShopsData] = useState([]);
    const [selectedInventoryId, setSelectedInventoryId] = useState(null);
    const [userLocation, setUserLocation] = useState(() => {
        try {
            const saved = localStorage.getItem('ph_user_location');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const DESCRIPTION_LIMIT = 200;

    const [recommendedVendors, setRecommendedVendors] = useState([]);

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!product) return;
            try {
                const lat = userLocation?.lat || 25.2854;
                const lon = userLocation?.lng || 51.5310;
                const response = await fetch(`/api/recommendations/vendors/${product.id}?lat=${lat}&lon=${lon}`);
                if (response.ok) {
                    const result = await response.json();
                    setRecommendedVendors(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch recommendations:", error);
            }
        };
        fetchRecommendations();
    }, [product, userLocation]);

    const detectLocation = async () => {
        const loc = await getLocationWithFallback();
        setUserLocation({ lat: loc.lat, lng: loc.lng });
    };

    // Auto-detect on mount if no saved location
    useEffect(() => {
        if (!userLocation) { detectLocation(); }
    }, []);

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

            // Default to cheapest active inventory
            if (foundProduct.inventories && foundProduct.inventories.length > 0) {
                const cheapest = [...foundProduct.inventories].sort((a,b)=>a.price-b.price)[0];
                setSelectedInventoryId(cheapest.id);
            }
        }
    }, [id, mockProducts]);

    if (!product) return <div className="container section text-center" style={{ paddingTop: '150px' }}>Loading...</div>;

    const productImageUrl = Array.isArray(product.image) ? product.image[activeImageIdx] : product.image;
    const metaDescription = product.description
        ? product.description.substring(0, 155)
        : t('product.meta_desc', { name: product.name, brand: product.brand });

    const selectedVariant = Array.isArray(product.size) 
        ? product.size.find(s => (typeof s === 'object' ? s.name : s) === selectedSize)
        : null;
    
    // Fallbacks
    const productSku = product.sku || (product.id ? `PH-${product.id}-24` : '');
    let displayPrice = product.price;
    let orderStock = product.stock;
    
    const selectedInventory = product.inventories?.find(i => i.id === selectedInventoryId);
    const isReservationAvailable = selectedInventory ? selectedInventory.pickup_available !== false : false;
    if (selectedInventory) {
        displayPrice = selectedInventory.price;
        orderStock = selectedInventory.stock;
    } else if (selectedVariant && typeof selectedVariant === 'object') {
        displayPrice = selectedVariant.price;
    }
    
    let displayOldPrice = product.oldPrice;
    if (selectedVariant && typeof selectedVariant === 'object' && selectedVariant.oldPrice) {
        displayOldPrice = selectedVariant.oldPrice;
    }

    const displayDiscount = displayOldPrice && displayOldPrice > displayPrice 
        ? Math.round((1 - displayPrice / displayOldPrice) * 100)
        : product.discount;

    const handleAddToCart = () => {
        addToCart({
            ...product, 
            price: displayPrice,
            inventory_id: selectedInventoryId, 
            shop_id: selectedInventory?.shop_id 
        }, quantity, isGiftWrapped, selectedSize, displayPrice);
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    const handleBuyNow = () => {
        navigate('/checkout', { 
            state: { 
                product: { 
                    ...product, 
                    price: displayPrice,
                    inventory_id: selectedInventoryId, 
                    shop_id: selectedInventory?.shop_id 
                }, 
                quantity, 
                isGiftWrapped, 
                selectedSize, 
                selectedPrice: displayPrice, 
                isReservation: false 
            } 
        });
    };

    const handleReserve = () => {
        navigate('/checkout', { 
            state: { 
                product: { 
                    ...product, 
                    price: displayPrice,
                    inventory_id: selectedInventoryId, 
                    shop_id: selectedInventory?.shop_id 
                }, 
                quantity, 
                isGiftWrapped, 
                selectedSize, 
                selectedPrice: displayPrice, 
                isReservation: true 
            } 
        });
    };

    const regionName = activeRegion?.name || 'Qatar';
    const dynamicTitle = `${product.name} | ${product.brand} - Buy Online in ${regionName}`;
    const dynamicDesc = product.description
        ? `${product.description.substring(0, 140)}... Buy ${product.name} by ${product.brand} in ${regionName} at PerfumeHub.`
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
        "sku": productSku,
        "offers": {
            "@type": "Offer",
            "url": window.location.href,
            "priceCurrency": activeRegion?.currency_code || "QAR",
            "price": displayPrice,
            "availability": orderStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition"
        }
    };

    return (
        <div className="product-details-page">
            <Helmet>
                <title>{dynamicTitle}</title>
                <meta name="description" content={dynamicDesc} />
                <meta property="og:title" content={dynamicTitle} />
                <meta property="og:description" content={dynamicDesc} />
                <meta property="og:image" content={productImageUrl} />
                <meta property="og:url" content={window.location.href} />
                <meta property="og:type" content="product" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={dynamicTitle} />
                <meta name="twitter:description" content={dynamicDesc} />
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
                        <span className="product-gender-tag">
                            {product.gender === 'men' ? t('navbar.men') : 
                             product.gender === 'women' ? t('navbar.women') : 
                             product.gender === 'arabic' ? t('navbar.arabic') : 
                             t('categories.unisex')}
                        </span>
                    </div>
                    <h1 className="product-name">{product.name}</h1>
                    <p className="product-type-large" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{product.type}</span>
                        {selectedSize && <span>• {selectedSize}</span>}
                        {productSku && (
                            <span className="product-sku-tag" style={{ 
                                fontSize: '0.75rem', 
                                color: 'var(--text-secondary, #94a3b8)', 
                                padding: '2px 8px', 
                                background: 'rgba(255, 255, 255, 0.05)', 
                                borderRadius: '4px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                marginLeft: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                letterSpacing: '0.5px'
                            }}>
                                {isRTL ? 'رمز المنتج:' : 'Code:'} {productSku}
                            </span>
                        )}
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


                    {/* Specifications or Olfactory Pyramid */}
                    {product && (!product.category?.includes('fashion') && !product.category?.includes('jewellery') && !product.category?.includes('giftbox') && !product.category?.includes('gift-box')) ? (
                        (product.topNotes || product.middleNotes || product.baseNotes) && (
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
                        )
                    ) : (
                        product && product.attributes && Object.keys(product.attributes).length > 0 && (
                            <div className="product-specifications" style={{ marginBottom: '25px', padding: '15px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff' }}>
                                <h3 className="notes-title" style={{ fontSize: '1rem', color: 'var(--color-black)', margin: '0 0 12px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>
                                    {isRTL ? 'المواصفات والتفاصيل:' : 'Specifications & Details:'}
                                </h3>
                                <div className="specs-container" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                    {Object.entries(product.attributes).map(([key, val]) => (
                                        <div className="spec-item" key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed rgba(0,0,0,0.04)', fontSize: '0.9rem' }}>
                                            <span className="spec-label" style={{ fontWeight: '600', color: 'var(--color-text-light)', textTransform: 'capitalize' }}>
                                                {isRTL ? (
                                                    key === 'material' ? 'المادة' :
                                                    key === 'color' ? 'اللون' :
                                                    key === 'stone' ? 'الحجر' :
                                                    key === 'purity' ? 'النقاء / العيار' :
                                                    key === 'theme' ? 'الموضوع' :
                                                    key === 'contents' ? 'المحتويات' :
                                                    key === 'size' ? 'الحجم / المقاس' : key
                                                ) : key.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                            <span className="spec-value" style={{ color: 'var(--color-black)', fontWeight: '500' }}>
                                                {Array.isArray(val) ? val.join(', ') : String(val)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    )}

                    {/* Olfactory pyramid already shows the notes. Description removed as per user request to avoid overlap. */}

                    <div className="purchase-actions">
                        <div className="quantity-selector-wrapper">
                            <div className="quantity-selector">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={orderStock === 0}>-</button>
                                <span className="qty-value">{quantity}</span>
                                <button onClick={() => setQuantity(Math.min((orderStock !== undefined ? orderStock : 10), quantity + 1))} disabled={orderStock === 0}>+</button>
                            </div>
                            {isReservationAvailable && (
                                <button
                                    className="btn-reserve-store"
                                    disabled={orderStock === 0}
                                    onClick={handleReserve}
                                >
                                    <span className="reserve-btn-text">{isRTL ? 'الحجز في المتجر' : 'Reserve in Store'}</span>
                                    <Store size={16} className="reserve-btn-icon" />
                                </button>
                            )}
                        </div>

                        <div className="product-action-buttons-grid" style={{ display: 'flex', gap: '12px', margin: '14px 0 16px 0' }}>
                            <button
                                className="btn btn-add-cart-main"
                                disabled={orderStock === 0}
                                onClick={handleAddToCart}
                                style={{
                                    flex: 1,
                                    height: '52px',
                                    borderRadius: '12px',
                                    background: '#1e293b',
                                    color: '#f8fafc',
                                    border: '1px solid rgba(200, 169, 81, 0.45)',
                                    fontWeight: '700',
                                    fontSize: '0.88rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}
                            >
                                {addedToCart ? (
                                    <><Check size={18} color="#34d399" />{isRTL ? 'تمت الإضافة' : 'ADDED'}</>
                                ) : (
                                    <><ShoppingBag size={18} color="#c8a951" />{isRTL ? 'أضف للسلة' : 'ADD TO CART'}</>
                                )}
                            </button>
                            <button
                                className="btn btn-buy-now-main"
                                disabled={orderStock === 0}
                                onClick={handleBuyNow}
                                style={{
                                    flex: 1.2,
                                    height: '52px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #c8a951 0%, #ebb637 100%)',
                                    color: '#000000',
                                    border: 'none',
                                    fontWeight: '800',
                                    fontSize: '0.92rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(200, 169, 81, 0.4)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Zap size={18} fill="#000000" color="#000000" />
                                <span>{isRTL ? 'اشتر الآن' : 'BUY NOW'}</span>
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

                        <div className="product-authenticity-note animate-fade-in" style={{ animationDelay: '0.3s' }}>
                            <p>
                                {isRTL 
                                    ? 'ملاحظة: قد يختلف شكل العبوة والتغليف بناءً على تحديثات المصنع، ولكننا نضمن أن جميع المنتجات أصلية 100% ومن مصادرها الرسمية.'
                                    : 'Note: Product packaging and presentation may vary based on manufacturer updates. We guarantee that all products are 100% authentic and sourced from official channels.'}
                            </p>
                            <div className="product-status-tag">
                                <strong>{t('product.status')}</strong>
                                <span className={`status-indicator ${orderStock === 0 ? 'out-of-stock' : 'in-stock'}`}>
                                    {orderStock === 0 ? t('product.out_of_stock') : t('product.in_stock')}
                                </span>
                            </div>
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

                        {recommendedVendors.length > 0 && (
                            <div className="shop-selection-accordion premium-card" style={{ marginBottom: '25px', padding: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h4 style={{ fontSize: '1rem', color: 'var(--color-black)', margin: 0 }}>
                                        {isRTL ? 'أفضل العروض:' : 'Best Offers:'}
                                    </h4>
                                    {recommendedVendors.length > 1 && (
                                        <button 
                                            className="btn-link" 
                                            onClick={() => setIsVendorsExpanded(!isVendorsExpanded)}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-gold-dark)', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            {isVendorsExpanded ? (isRTL ? 'إخفاء' : 'View Less') : (isRTL ? `عرض ${recommendedVendors.length - 1} عروض أخرى` : `View ${recommendedVendors.length - 1} other offers`)}
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {recommendedVendors
                                        .filter((_, idx) => isVendorsExpanded || idx === 0)
                                        .map((vendor) => {
                                            const isSelected = vendor.inventory_id === selectedInventoryId;
                                            
                                            return (
                                                <label key={vendor.inventory_id} style={{ display: 'flex', alignItems: 'center', padding: '12px', border: isSelected ? '2px solid var(--color-gold)' : '1px solid rgba(0,0,0,0.08)', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.05)' : '#fff', transition: 'all var(--transition-fast)' }}>
                                                    <input 
                                                        type="radio" 
                                                        name="shopSelection" 
                                                        checked={isSelected} 
                                                        onChange={() => setSelectedInventoryId(vendor.inventory_id)}
                                                        style={{ marginRight: '12px', width: '18px', height: '18px', accentColor: 'var(--color-gold)' }}
                                                    />
                                                    <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span style={{ fontWeight: isSelected ? '700' : '500', fontSize: '0.95rem', color: 'var(--color-black)' }}>
                                                                {vendor.shop_name} <span style={{color: 'var(--color-text-light)', fontSize: '0.85rem', fontWeight: '400'}}>({vendor.dist_km.toFixed(1)} km)</span>
                                                            </span>
                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                {vendor.badges.map((badge, idx) => {
                                                                    let badgeClass = 'best-price';
                                                                    if(badge.includes('Premium')) badgeClass = 'premium';
                                                                    if(badge.includes('Nearest')) badgeClass = 'nearest';
                                                                    return <span key={idx} className={`ui-badge ${badgeClass}`}>{badge}</span>;
                                                                })}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.85rem' }}>
                                                            <span style={{ fontWeight: '600', color: 'var(--color-black)' }}>{vendor.price} {vendor.currency}</span>
                                                            <span style={{ color: '#2E7D32', fontWeight: '500' }}>{t('product.in_stock')}</span>
                                                        </div>
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
