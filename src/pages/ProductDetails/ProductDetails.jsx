import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ShopContext } from '../../context/ShopContext';
import { CartContext } from '../../context/CartContext';
import { WishlistContext } from '../../context/WishlistContext';
import { RegionContext } from '../../context/RegionContext';
import { AuthContext } from '../../context/AuthContext';
import { ShoppingBag, Zap, Heart, Share2, ShieldCheck, Truck, RotateCcw, Gift, Check, Store, MapPin, Star, CheckCircle2, X, MessageSquare, AlertCircle, Sparkles, ThumbsUp, Lock } from 'lucide-react';
import { PrimaryCTA, ReserveCTA } from '../../components/UI/Atoms';
import { getLocationWithFallback } from '../../utils/geolocation';
import TrustBadges from '../../components/TrustBadges/TrustBadges';
import api from '../../utils/api_v1_0_2';
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
    const { user } = useContext(AuthContext);
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
    const DESCRIPTION_LIMIT = 450;

    const [recommendedVendors, setRecommendedVendors] = useState([]);

    // Reviews & Verified Buyer System State
    const [reviewsData, setReviewsData] = useState({
        reviews: [],
        averageRating: 5.0,
        totalReviews: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    });
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [checkingEligibility, setCheckingEligibility] = useState(false);
    const [verificationState, setVerificationState] = useState(null); // 'REQUIRES_LOGIN' | 'NOT_PURCHASED' | 'VERIFIED_BUYER'
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewHoverRating, setReviewHoverRating] = useState(0);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewComment, setReviewComment] = useState('');
    const [reviewLongevity, setReviewLongevity] = useState('Long Lasting (8-10h)');
    const [reviewSillage, setReviewSillage] = useState('Moderate');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState(false);
    const [reviewError, setReviewError] = useState('');

    useEffect(() => {
        const fetchReviews = async () => {
            if (!id) return;
            try {
                setLoadingReviews(true);
                const res = await fetch(`/api/reviews/product/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setReviewsData(data);
                }
            } catch (err) {
                console.error('Error fetching reviews:', err);
            } finally {
                setLoadingReviews(false);
            }
        };
        fetchReviews();
    }, [id]);

    const handleWriteReviewClick = async () => {
        setReviewError('');
        setReviewSubmitSuccess(false);

        if (!user || !user.email) {
            setVerificationState('REQUIRES_LOGIN');
            setIsReviewModalOpen(true);
            return;
        }

        try {
            setCheckingEligibility(true);
            const token = localStorage.getItem('perfumehub_token');
            const res = await fetch(`/api/reviews/eligibility?productId=${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.eligible && data.isVerifiedBuyer) {
                setVerificationState('VERIFIED_BUYER');
            } else {
                setVerificationState('NOT_PURCHASED');
            }
        } catch (err) {
            console.error('Eligibility check error:', err);
            setVerificationState('NOT_PURCHASED');
        } finally {
            setCheckingEligibility(false);
            setIsReviewModalOpen(true);
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!reviewComment || reviewComment.trim().length < 10) {
            setReviewError(isRTL ? 'يرجى كتابة تعليق لا يقل عن 10 أحرف.' : 'Please enter a review of at least 10 characters.');
            return;
        }

        setSubmittingReview(true);
        setReviewError('');

        try {
            const token = localStorage.getItem('perfumehub_token');
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: id,
                    rating: reviewRating,
                    title: reviewTitle,
                    comment: reviewComment,
                    longevity: reviewLongevity,
                    sillage: reviewSillage
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setReviewSubmitSuccess(true);
                setReviewsData(prev => ({
                    ...prev,
                    totalReviews: (prev.totalReviews || 0) + 1,
                    reviews: [data.review, ...(prev.reviews || [])]
                }));
                setTimeout(() => {
                    setIsReviewModalOpen(false);
                    setReviewSubmitSuccess(false);
                    setReviewComment('');
                    setReviewTitle('');
                }, 2000);
            } else {
                setReviewError(data.error || 'Failed to submit review.');
            }
        } catch (err) {
            console.error('Submit review error:', err);
            setReviewError('Failed to connect to server. Please try again.');
        } finally {
            setSubmittingReview(false);
        }
    };

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
        let isMounted = true;

        const loadProductAndInventory = async () => {
            let currentProduct = mockProducts.find(p => String(p.id) === String(id));

            if (!currentProduct && id) {
                try {
                    const res = await api.get(`/products/${id}`);
                    if (res.data) {
                        currentProduct = {
                            ...res.data,
                            oldPrice: res.data.old_price !== null && res.data.old_price !== undefined ? Number(res.data.old_price) : null,
                            price: Number(res.data.price) || 0,
                            stock: res.data.stock !== undefined ? Number(res.data.stock) : 10,
                            isNew: res.data.is_new,
                            isFeatured: res.data.is_featured,
                            notes: typeof res.data.notes === 'string' ? JSON.parse(res.data.notes || '[]') : (res.data.notes || []),
                            topNotes: res.data.top_notes || '',
                            middleNotes: res.data.middle_notes || '',
                            baseNotes: res.data.base_notes || '',
                            attributes: typeof res.data.attributes === 'string' ? JSON.parse(res.data.attributes || '{}') : (res.data.attributes || {})
                        };
                    }
                } catch (err) {
                    console.error('Failed to fetch product details directly:', err);
                }
            }

            // Query inventory solely for that specific product_id (Returns in-stock boutique shops)
            if (id) {
                try {
                    const invRes = await api.get(`/inventory?product_id=${id}`);
                    const invList = Array.isArray(invRes.data) ? invRes.data : [];
                    if (currentProduct) {
                        currentProduct = {
                            ...currentProduct,
                            inventories: invList
                        };
                    }
                } catch (err) {
                    console.error('Failed to fetch product scoped inventory:', err);
                }
            }

            if (!isMounted || !currentProduct) return;

            setProduct(currentProduct);

            // Default to the first variant if available
            const defaultSize = Array.isArray(currentProduct.size) && currentProduct.size.length > 0 
                ? (typeof currentProduct.size[0] === 'object' ? currentProduct.size[0].name : currentProduct.size[0])
                : currentProduct.size;
            setSelectedSize(defaultSize);

            // Default to cheapest active inventory
            if (currentProduct.inventories && currentProduct.inventories.length > 0) {
                const cheapest = [...currentProduct.inventories].sort((a,b) => a.price - b.price)[0];
                if (cheapest) setSelectedInventoryId(cheapest.id);
            }
        };

        loadProductAndInventory();

        return () => { isMounted = false; };
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
        const vendorRec = recommendedVendors.find(v => v.inventory_id === selectedInventoryId);
        const vendorName = selectedInventory?.shops?.name || vendorRec?.shop_name || selectedInventory?.shop_name || product.shop_name || 'PerfumeHub Boutique';
        const vendorAddress = selectedInventory?.shops?.address || selectedInventory?.shop_address || 'Doha / Lusail';
        const shopId = selectedInventory?.shop_id || vendorRec?.s_id || product.shop_id || (product?.inventories && product.inventories[0]?.shop_id) || null;

        addToCart({
            ...product, 
            price: displayPrice,
            inventory_id: selectedInventoryId, 
            shop_id: shopId,
            vendor_name: vendorName,
            vendor_address: vendorAddress
        }, quantity, isGiftWrapped, selectedSize, displayPrice, shopId, selectedInventoryId, vendorName, vendorAddress);
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    const handleBuyNow = () => {
        const vendorRec = recommendedVendors.find(v => v.inventory_id === selectedInventoryId);
        const vendorName = selectedInventory?.shops?.name || vendorRec?.shop_name || selectedInventory?.shop_name || product.shop_name || 'PerfumeHub Boutique';
        const vendorAddress = selectedInventory?.shops?.address || selectedInventory?.shop_address || 'Doha / Lusail';
        const shopId = selectedInventory?.shop_id || vendorRec?.s_id || product.shop_id || (product?.inventories && product.inventories[0]?.shop_id) || null;

        navigate('/checkout', { 
            state: { 
                product: { 
                    ...product, 
                    price: displayPrice,
                    inventory_id: selectedInventoryId, 
                    shop_id: shopId,
                    vendor_name: vendorName,
                    vendor_address: vendorAddress
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
        const vendorRec = recommendedVendors.find(v => v.inventory_id === selectedInventoryId);
        const vendorName = selectedInventory?.shops?.name || vendorRec?.shop_name || selectedInventory?.shop_name || product.shop_name || 'PerfumeHub Boutique';
        const vendorAddress = selectedInventory?.shops?.address || selectedInventory?.shop_address || 'Doha / Lusail';
        const shopId = selectedInventory?.shop_id || vendorRec?.s_id || product.shop_id || (product?.inventories && product.inventories[0]?.shop_id) || null;

        navigate('/checkout', { 
            state: { 
                product: { 
                    ...product, 
                    price: displayPrice,
                    inventory_id: selectedInventoryId, 
                    shop_id: shopId,
                    vendor_name: vendorName,
                    vendor_address: vendorAddress
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
    const productCanonical = `https://perfumehubqa.com/product/${product.id}`;
    const dynamicTitle = `${product.name} by ${product.brand} | Buy Online in Qatar - PerfumeHub`;
    const dynamicDesc = product.description
        ? `${product.description.substring(0, 140)}... Buy original ${product.name} by ${product.brand} in Doha, Qatar with fast same-day delivery at PerfumeHub.`
        : t('product.meta_desc', { name: product.name, brand: product.brand });

    const jsonLd = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": productImageUrl,
        "description": metaDescription || dynamicDesc,
        "brand": {
            "@type": "Brand",
            "name": product.brand
        },
        "sku": productSku || `PH-QA-${product.id}`,
        "category": product.category || "Perfume",
        "offers": {
            "@type": "Offer",
            "url": productCanonical,
            "priceCurrency": activeRegion?.currency_code || "QAR",
            "price": displayPrice,
            "priceValidUntil": "2027-12-31",
            "availability": orderStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition",
            "seller": {
                "@type": "Organization",
                "name": "PerfumeHub Qatar",
                "url": "https://perfumehubqa.com/"
            }
        }
    };

    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://perfumehubqa.com/"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Shop",
                "item": "https://perfumehubqa.com/shop"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": product.name,
                "item": productCanonical
            }
        ]
    };

    return (
        <div className="product-details-page">
            <Helmet>
                <title>{dynamicTitle}</title>
                <meta name="description" content={dynamicDesc} />
                <meta name="keywords" content={`${product.name}, ${product.brand}, buy ${product.name} in qatar, perfume qatar, doha perfume, عطور قطر`} />
                <meta property="og:title" content={dynamicTitle} />
                <meta property="og:description" content={dynamicDesc} />
                <meta property="og:image" content={productImageUrl} />
                <meta property="og:url" content={productCanonical} />
                <meta property="og:type" content="product" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={dynamicTitle} />
                <meta name="twitter:description" content={dynamicDesc} />
                <meta name="twitter:image" content={productImageUrl} />
                <link rel="canonical" href={productCanonical} />
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
                <script type="application/ld+json">
                    {JSON.stringify(breadcrumbLd)}
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

                {/* Section 1: Media (Gallery & Thumbnails) */}
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

                {/* Section 2: Buy Box Panel */}
                <div className="product-buybox-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    {orderStatus && (
                        <div className={`alert ${orderStatus.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '20px', padding: '15px', borderRadius: '8px', backgroundColor: orderStatus.type === 'success' ? '#d4edda' : '#f8d7da', color: orderStatus.type === 'success' ? '#155724' : '#721c24' }}>
                            {orderStatus.message}
                        </div>
                    )}

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
                        <div className="luxury-price-cluster">
                            <div className="price-primary-row">
                                <div className="offer-price-wrap">
                                    <span className="price-amount-large">{Math.round(displayPrice)}</span>
                                    <span className="price-currency-unit">{t('common.currency')}</span>
                                </div>
                                {displayOldPrice && displayOldPrice > displayPrice && (
                                    <div className="original-price-wrap">
                                        <span className="original-price-prefix">{isRTL ? 'بدلاً من' : 'Was'}</span>
                                        <span className="original-price-amount">{Math.round(displayOldPrice)} {t('common.currency')}</span>
                                    </div>
                                )}
                                {displayDiscount > 0 && (
                                    <span className="luxury-discount-pill">
                                        <span className="discount-sparkle">✦</span>
                                        <span className="discount-text">{t('product.save')} {displayDiscount}%</span>
                                    </span>
                                )}
                            </div>
                            {displayOldPrice && displayOldPrice > displayPrice && (
                                <div className="price-savings-callout">
                                    <span className="savings-dot"></span>
                                    <span>
                                        {isRTL 
                                            ? `وفرت ${Math.round(displayOldPrice - displayPrice)} ${t('common.currency')} في هذا العرض الخاص`
                                            : `You save ${Math.round(displayOldPrice - displayPrice)} ${t('common.currency')} on this special offer`}
                                    </span>
                                </div>
                            )}
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
                    </div>
                </div>
            </div>

            {/* Full-width Product Editorial Section (Spans long side-to-side across container) */}
            <div className="container product-editorial-container">

                {/* Section: Product Description & Details (Full-width side-to-side) */}
                <div className="product-description-card-fullwidth animate-fade-in">
                    <div className="editorial-card-header">
                        <div className="editorial-title-badge">
                            <Sparkles size={18} className="editorial-header-icon" />
                            <h3 className="editorial-section-title">
                                {isRTL ? 'وصف المنتج وتفاصيله' : 'Product Description & Details'}
                            </h3>
                        </div>
                    </div>
                    <div className="editorial-body">
                        <p className="description-text">
                            {product.description ? (
                                (product.description.length > DESCRIPTION_LIMIT && !isDescriptionExpanded)
                                    ? `${product.description.substring(0, DESCRIPTION_LIMIT)}...`
                                    : product.description
                            ) : (t('product.default_description') || (isRTL ? 'عطر فاخر يجسد الأناقة الخالدة وأصالة النفحات العطرية.' : 'A luxurious fragrance that embodies timeless elegance and enduring sillage.'))}
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
                </div>

                {/* Non-fragrance specifications */}
                {product && product.attributes && Object.keys(product.attributes).length > 0 && (!product.topNotes && !product.middleNotes && !product.baseNotes) && (
                    <div className="product-specifications-card animate-fade-in" style={{ padding: '24px 28px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '18px', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <h3 className="notes-title" style={{ fontSize: '1.1rem', color: 'var(--color-black)', margin: '0 0 16px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '10px', fontFamily: "var(--font-heading, 'Playfair Display', serif)" }}>
                            {isRTL ? 'المواصفات والتفاصيل:' : 'Specifications & Details:'}
                        </h3>
                        <div className="specs-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                            {Object.entries(product.attributes).map(([key, val]) => (
                                <div className="spec-item" key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fafafa', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.04)', fontSize: '0.9rem' }}>
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
                                    <span className="spec-value" style={{ color: 'var(--color-black)', fontWeight: '600' }}>
                                        {Array.isArray(val) ? val.join(', ') : String(val)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section: Olfactory Notes Pyramid & Sensory Performance (Full-width side-to-side) */}
                {product && (!product.category?.includes('fashion') && !product.category?.includes('jewellery') && !product.category?.includes('giftbox') && !product.category?.includes('gift-box')) && (
                    (product.topNotes || product.middleNotes || product.baseNotes) && (() => {
                        const parseNotes = (notesVal) => {
                            if (!notesVal) return [];
                            if (Array.isArray(notesVal)) return notesVal;
                            return String(notesVal).split(/[,/•|\n]+/).map(s => s.trim()).filter(Boolean);
                        };
                        const isArabicScent = product.category?.includes('arabic') || product.category?.includes('oriental');
                        const longevityVal = product.attributes?.longevity || (
                            isArabicScent 
                                ? (isRTL ? '10 - 14 ساعة (تركيز استثنائي)' : '10 – 14 Hours (Imperial Extrait)') 
                                : (isRTL ? '8 - 12 ساعة (ثبات طويل)' : '8 – 12 Hours (Eau de Parfum)')
                        );
                        const longevityPct = isArabicScent ? 92 : 82;
                        const sillageVal = product.attributes?.sillage || (
                            isArabicScent
                                ? (isRTL ? 'فواح جداً (أثر عطري طاغي)' : 'Enveloping & Majestic')
                                : (isRTL ? 'قوي وملفت (حضور راقي)' : 'Strong & Radiant Aura')
                        );
                        const sillagePct = isArabicScent ? 88 : 78;
                        const activeSeasons = Array.isArray(product.seasons) && product.seasons.length > 0
                            ? product.seasons.map(s => String(s).toLowerCase())
                            : ['winter', 'autumn', 'spring'];

                        return (
                            <div className="product-olfactory-card-fullwidth animate-fade-in" style={{ animationDelay: '0.15s' }}>
                                <div className="olfactory-pyramid-card">
                                    <div className="pyramid-header">
                                        <Sparkles size={18} className="pyramid-header-icon" />
                                        <h3 className="pyramid-title">{isRTL ? 'الهرم العطري والأداء الحسي' : 'Olfactive Architecture & Sensory Performance'}</h3>
                                        <span className="pyramid-subtitle">{isRTL ? 'انقر لاكتشاف عطور مماثلة' : 'Click note to explore related scents'}</span>
                                    </div>

                                    <div className="olfactory-fullwidth-grid">
                                        {/* Left Column: 3-Tier Notes */}
                                        <div className="pyramid-tiers">
                                            {product.topNotes && (
                                                <div className="pyramid-tier top-tier">
                                                    <div className="tier-badge">
                                                        <span className="tier-timing">{isRTL ? 'أول 15 دقيقة' : 'First 15 Mins'}</span>
                                                        <span className="tier-name">{isRTL ? 'إفتتاحية العطر (Top Notes)' : 'Top Notes'}</span>
                                                    </div>
                                                    <div className="tier-chips">
                                                        {parseNotes(product.topNotes).map((n, i) => (
                                                            <Link 
                                                                key={i} 
                                                                to={`/shop?search=${encodeURIComponent(n)}`}
                                                                className="pyramid-chip"
                                                                title={isRTL ? `ابحث عن عطور تحتوي على ${n}` : `Find perfumes with ${n}`}
                                                            >
                                                                {n}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {product.middleNotes && (
                                                <div className="pyramid-tier heart-tier">
                                                    <div className="tier-badge">
                                                        <span className="tier-timing">{isRTL ? '2 - 4 ساعات' : '2 – 4 Hours'}</span>
                                                        <span className="tier-name">{isRTL ? 'قلب العطر (Heart Notes)' : 'Heart Notes'}</span>
                                                    </div>
                                                    <div className="tier-chips">
                                                        {parseNotes(product.middleNotes).map((n, i) => (
                                                            <Link 
                                                                key={i} 
                                                                to={`/shop?search=${encodeURIComponent(n)}`}
                                                                className="pyramid-chip"
                                                                title={isRTL ? `ابحث عن عطور تحتوي على ${n}` : `Find perfumes with ${n}`}
                                                            >
                                                                {n}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {product.baseNotes && (
                                                <div className="pyramid-tier base-tier">
                                                    <div className="tier-badge">
                                                        <span className="tier-timing">{isRTL ? '6 - 12+ ساعة' : '6 – 12+ Hours'}</span>
                                                        <span className="tier-name">{isRTL ? 'قاعدة العطر (Base Notes)' : 'Base Notes'}</span>
                                                    </div>
                                                    <div className="tier-chips">
                                                        {parseNotes(product.baseNotes).map((n, i) => (
                                                            <Link 
                                                                key={i} 
                                                                to={`/shop?search=${encodeURIComponent(n)}`}
                                                                className="pyramid-chip"
                                                                title={isRTL ? `ابحث عن عطور تحتوي على ${n}` : `Find perfumes with ${n}`}
                                                            >
                                                                {n}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Longevity, Sillage & Seasons */}
                                        <div className="sensory-meters-section">
                                            <div className="sensory-meter-row">
                                                <div className="sensory-label-row">
                                                    <span className="meter-label">{isRTL ? 'ثبات العطر' : 'Longevity'}</span>
                                                    <span className="meter-val">{longevityVal}</span>
                                                </div>
                                                <div className="luxury-progress-track">
                                                    <div className="luxury-progress-fill" style={{ width: `${longevityPct}%` }}></div>
                                                </div>
                                            </div>

                                            <div className="sensory-meter-row">
                                                <div className="sensory-label-row">
                                                    <span className="meter-label">{isRTL ? 'فوحان العطر' : 'Sillage & Aura'}</span>
                                                    <span className="meter-val">{sillageVal}</span>
                                                </div>
                                                <div className="luxury-progress-track">
                                                    <div className="luxury-progress-fill" style={{ width: `${sillagePct}%` }}></div>
                                                </div>
                                            </div>

                                            <div className="sensory-seasons-row">
                                                <span className="meter-label">{isRTL ? 'المواسم المثالية:' : 'Best Seasons:'}</span>
                                                <div className="season-pills-list">
                                                    <span className={`season-pill ${activeSeasons.includes('winter') || activeSeasons.includes('all') ? 'active' : ''}`}>
                                                        ❄️ {isRTL ? 'الشتاء' : 'Winter'}
                                                    </span>
                                                    <span className={`season-pill ${activeSeasons.includes('autumn') || activeSeasons.includes('all') ? 'active' : ''}`}>
                                                        🍂 {isRTL ? 'الخريف' : 'Autumn'}
                                                    </span>
                                                    <span className={`season-pill ${activeSeasons.includes('spring') || activeSeasons.includes('all') ? 'active' : ''}`}>
                                                        🌸 {isRTL ? 'الربيع' : 'Spring'}
                                                    </span>
                                                    <span className={`season-pill ${activeSeasons.includes('summer') || activeSeasons.includes('all') ? 'active' : ''}`}>
                                                        ☀️ {isRTL ? 'الصيف' : 'Summer'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                )}

                {/* Section: Nearby Boutique Selection Accordion */}
                {recommendedVendors.length > 0 && (
                    <div className="shop-selection-accordion premium-card animate-fade-in" style={{ padding: '24px 28px', borderRadius: '18px', border: '1px solid rgba(0,0,0,0.07)', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h4 style={{ fontSize: '1.1rem', color: 'var(--color-black)', margin: 0, fontWeight: '700', fontFamily: "var(--font-heading, 'Playfair Display', serif)" }}>
                                {isRTL ? 'أفضل عروض البوتيكات القريبة:' : 'Nearby Boutique Availability:'}
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

            </div>


            {/* Full-width Luxury Trust Bar */}
            <div className="product-trust-strip-wrapper">
                <div className="container">
                    <TrustBadges variant="grid" isRTL={isRTL} />
                </div>
            </div>

            {/* Customer Reviews & Ratings Section */}
            <section className="product-reviews-section">
                <div className="container">
                    <div className="reviews-section-header">
                        <div className="reviews-title-wrap">
                            <span className="reviews-sub-tag">
                                <Sparkles size={14} style={{ display: 'inline', verticalAlign: 'middle', marginInlineEnd: '6px' }} />
                                {isRTL ? 'تقييمات المشترين الموثقة' : 'Verified Buyer Ratings'}
                            </span>
                            <h2 className="reviews-main-title">{isRTL ? 'آراء العملاء وتجاربهم' : 'Customer Reviews & Experiences'}</h2>
                        </div>
                        <button 
                            className="btn btn-gold write-review-btn"
                            onClick={handleWriteReviewClick}
                            disabled={checkingEligibility}
                        >
                            <MessageSquare size={16} />
                            {checkingEligibility 
                                ? (isRTL ? 'جاري التحقق...' : 'Verifying...') 
                                : (isRTL ? 'اكتب تقييماً موثقاً' : 'Write a Verified Review')}
                        </button>
                    </div>

                    {/* Rating Overview Card */}
                    <div className="reviews-overview-card">
                        <div className="overview-score-box">
                            <div className="big-score">{reviewsData.averageRating || '5.0'}</div>
                            <div className="stars-row">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        size={20} 
                                        fill={i < Math.round(reviewsData.averageRating || 5) ? '#d4af37' : '#e2e8f0'} 
                                        color={i < Math.round(reviewsData.averageRating || 5) ? '#d4af37' : '#cbd5e1'} 
                                    />
                                ))}
                            </div>
                            <span className="total-count-label">
                                {isRTL 
                                    ? `بناءً على ${reviewsData.totalReviews || 0} تقييم موثق من قطر`
                                    : `Based on ${reviewsData.totalReviews || 0} verified Qatar purchases`}
                            </span>
                        </div>

                        <div className="overview-bars-box">
                            {[5, 4, 3, 2, 1].map((star) => {
                                const count = reviewsData.breakdown?.[star] || 0;
                                const percent = reviewsData.totalReviews > 0 
                                    ? Math.round((count / reviewsData.totalReviews) * 100) 
                                    : (star === 5 ? 100 : 0);
                                return (
                                    <div key={star} className="rating-bar-row">
                                        <span className="star-bar-label">{star} {isRTL ? 'نجوم' : 'Stars'}</span>
                                        <div className="bar-track">
                                            <div className="bar-fill" style={{ width: `${percent}%` }}></div>
                                        </div>
                                        <span className="bar-count-label">{count}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="overview-trust-box">
                            <div className="trust-policy-item">
                                <ShieldCheck size={22} className="trust-policy-icon" />
                                <div>
                                    <strong>{isRTL ? 'حماية الأصالة 100٪' : '100% Verified Purchases Only'}</strong>
                                    <p>{isRTL ? 'لا يُسمح بكتابة التقييمات إلا للعملاء الذين اشتروا هذا العطر بالفعل من بيرفيوم هوب.' : 'Only customers with verified delivered orders on PerfumeHub Qatar can submit reviews.'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Reviews List */}
                    <div className="product-reviews-list">
                        {loadingReviews ? (
                            <div className="reviews-loading text-center">
                                <p>{isRTL ? 'جاري تحميل التقييمات...' : 'Loading verified reviews...'}</p>
                            </div>
                        ) : (reviewsData.reviews && reviewsData.reviews.length > 0) ? (
                            reviewsData.reviews.map((rev) => (
                                <div key={rev.id} className="product-review-card animate-fade-in">
                                    <div className="review-header">
                                        <div className="reviewer-meta">
                                            <div className="reviewer-avatar">
                                                {(rev.user_name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="reviewer-name-row">
                                                    <span className="reviewer-name">{rev.user_name || 'Customer'}</span>
                                                    {rev.is_verified_buyer && (
                                                        <span className="verified-badge">
                                                            <CheckCircle2 size={13} />
                                                            {isRTL ? 'مشتري موثق' : 'Verified Buyer'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="review-date">
                                                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString(isRTL ? 'ar-QA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent purchase'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="stars-row">
                                            {[...Array(5)].map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    size={16} 
                                                    fill={i < (rev.rating || 5) ? '#d4af37' : '#e2e8f0'} 
                                                    color={i < (rev.rating || 5) ? '#d4af37' : '#cbd5e1'} 
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {rev.title && <h4 className="product-review-title">{rev.title}</h4>}
                                    <p className="product-review-comment">{rev.comment}</p>

                                    {(rev.longevity || rev.sillage) && (
                                        <div className="performance-tags">
                                            {rev.longevity && (
                                                <span className="perf-tag">
                                                    <strong>{isRTL ? 'الثبات:' : 'Longevity:'}</strong> {rev.longevity}
                                                </span>
                                            )}
                                            {rev.sillage && (
                                                <span className="perf-tag">
                                                    <strong>{isRTL ? 'الفوحان:' : 'Sillage:'}</strong> {rev.sillage}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="no-reviews-state text-center">
                                <MessageSquare size={38} className="no-reviews-icon" />
                                <h3>{isRTL ? 'كن أول من يكتب تقييماً موثقاً' : 'Be the First Verified Buyer to Review'}</h3>
                                <p>{isRTL ? 'اشترِ هذا العطر الأصلي وشارك تجربتك الفاخرة مع مجتمع العطور في قطر.' : 'Purchase this authentic fragrance to share your olfactory experience with perfume lovers in Qatar.'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Verified Buyer Review Modal */}
            {isReviewModalOpen && (
                <div className="review-modal-overlay animate-fade-in" onClick={() => setIsReviewModalOpen(false)}>
                    <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setIsReviewModalOpen(false)}>
                            <X size={20} />
                        </button>

                        {verificationState === 'REQUIRES_LOGIN' && (
                            <div className="verification-gate-box text-center">
                                <div className="gate-icon-wrap warning">
                                    <Lock size={36} />
                                </div>
                                <h3>{isRTL ? 'تسجيل الدخول مطلوب' : 'Customer Sign-In Required'}</h3>
                                <p>
                                    {isRTL 
                                        ? 'لضمان مصداقية التقييمات بنسبة 100٪، يُسمح فقط للمشترين الموثقين بكتابة التقييمات. يرجى تسجيل الدخول بالحساب المستخدم لإتمام طلبك.' 
                                        : 'To maintain 100% authentic ratings on PerfumeHub Qatar, only verified buyers can review products. Please sign in with the account used for your purchase.'}
                                </p>
                                <Link 
                                    to={`/login?redirect=/product/${id}`} 
                                    className="btn btn-gold gate-action-btn"
                                >
                                    {isRTL ? 'تسجيل الدخول الآن' : 'Sign In with Account'}
                                </Link>
                            </div>
                        )}

                        {verificationState === 'NOT_PURCHASED' && (
                            <div className="verification-gate-box text-center">
                                <div className="gate-icon-wrap restriction">
                                    <ShieldCheck size={36} />
                                </div>
                                <h3>{isRTL ? 'يلزم إتمام الشراء أولاً' : 'Verified Purchase Required'}</h3>
                                <p>
                                    {isRTL 
                                        ? 'نظامنا يتحقق تلقائياً من سجل الطلبات لضمان تجارب حقيقية فقط. يمكنك تقييم هذا العطر بمجرد شرائه من بيرفيوم هوب قطر.' 
                                        : 'Our Zero-Trust system verifies customer orders to maintain strictly authentic reviews. You can review this fragrance once you have purchased it from PerfumeHub Qatar.'}
                                </p>
                                <div className="gate-buttons-row">
                                    <button 
                                        className="btn btn-gold gate-action-btn"
                                        onClick={() => {
                                            addToCart(product, quantity, isGiftWrapped, selectedSize);
                                            setIsReviewModalOpen(false);
                                        }}
                                    >
                                        <ShoppingBag size={16} />
                                        {isRTL ? 'شراء هذا العطر الآن' : 'Purchase This Fragrance'}
                                    </button>
                                    <button 
                                        className="btn btn-outline" 
                                        onClick={() => setIsReviewModalOpen(false)}
                                    >
                                        {isRTL ? 'إغلاق' : 'Close'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {verificationState === 'VERIFIED_BUYER' && (
                            <div className="review-form-wrapper">
                                <div className="review-form-header">
                                    <span className="verified-badge">
                                        <CheckCircle2 size={14} />
                                        {isRTL ? 'مشتري موثق ومؤهل للتقييم' : 'Verified Buyer • Eligible to Review'}
                                    </span>
                                    <h3>{isRTL ? `تقييم ${product?.name}` : `Review ${product?.name}`}</h3>
                                    <p>{isRTL ? 'شارك رأيك الصادق حول الثبات والفوحان والأصالة لمساعدة العملاء في قطر.' : 'Share your honest feedback on performance, longevity, and presentation in Qatar.'}</p>
                                </div>

                                {reviewSubmitSuccess ? (
                                    <div className="review-success-message text-center animate-fade-in">
                                        <CheckCircle2 size={48} className="success-icon" />
                                        <h4>{isRTL ? 'تم نشر تقييمك الموثق بنجاح!' : 'Your Verified Review Has Been Published!'}</h4>
                                        <p>{isRTL ? 'شكراً لمشاركتك رأيك القيّم مع مجتمع بيرفيوم هوب قطر.' : 'Thank you for contributing to the luxury fragrance community in Qatar.'}</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleReviewSubmit} className="review-submission-form">
                                        {reviewError && (
                                            <div className="review-form-error animate-fade-in">
                                                <AlertCircle size={16} />
                                                <span>{reviewError}</span>
                                            </div>
                                        )}

                                        {/* Star Rating Picker */}
                                        <div className="form-group rating-picker-group">
                                            <label>{isRTL ? 'تقييمك الإجمالي:' : 'Overall Rating:'}</label>
                                            <div className="interactive-stars">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        type="button"
                                                        key={star}
                                                        className="star-btn"
                                                        onClick={() => setReviewRating(star)}
                                                        onMouseEnter={() => setReviewHoverRating(star)}
                                                        onMouseLeave={() => setReviewHoverRating(0)}
                                                    >
                                                        <Star 
                                                            size={28} 
                                                            fill={star <= (reviewHoverRating || reviewRating) ? '#d4af37' : 'none'} 
                                                            color={star <= (reviewHoverRating || reviewRating) ? '#d4af37' : '#cbd5e1'} 
                                                        />
                                                    </button>
                                                ))}
                                                <span className="rating-label-hint">
                                                    {reviewRating === 5 && (isRTL ? 'استثنائي (5 نجوم)' : 'Exceptional (5 Stars)')}
                                                    {reviewRating === 4 && (isRTL ? 'ممتاز جداً (4 نجوم)' : 'Very Good (4 Stars)')}
                                                    {reviewRating === 3 && (isRTL ? 'جيد (3 نجوم)' : 'Average (3 Stars)')}
                                                    {reviewRating === 2 && (isRTL ? 'دون التوقعات (نجمتان)' : 'Below Average (2 Stars)')}
                                                    {reviewRating === 1 && (isRTL ? 'غير مُرضٍ (نجمة)' : 'Unsatisfactory (1 Star)')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Title Input */}
                                        <div className="form-group">
                                            <label>{isRTL ? 'عنوان التقييم:' : 'Headline / Review Title:'}</label>
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                placeholder={isRTL ? 'مثال: عطر ملكي فخم وثبات يدوم طويلاً' : 'e.g. Masterpiece scent with majestic longevity'}
                                                value={reviewTitle}
                                                onChange={(e) => setReviewTitle(e.target.value)}
                                                maxLength={150}
                                            />
                                        </div>

                                        {/* Comment Textarea */}
                                        <div className="form-group">
                                            <label>{isRTL ? 'تفاصيل تجربتك (الأصالة، التغليف، الأداء):' : 'Detailed Review (Authenticity, Packaging, Scent):'}</label>
                                            <textarea 
                                                className="form-control"
                                                rows={4}
                                                placeholder={isRTL ? 'اكتب تجربتك بالتفصيل لمساعدة عشاق العطور في قطر...' : 'Share details on projection, performance in Doha climate, authenticity of batch...'}
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                required
                                            ></textarea>
                                        </div>

                                        {/* Performance Selectors */}
                                        <div className="form-row-grid">
                                            <div className="form-group">
                                                <label>{isRTL ? 'الثبات:' : 'Longevity:'}</label>
                                                <select 
                                                    className="form-control"
                                                    value={reviewLongevity}
                                                    onChange={(e) => setReviewLongevity(e.target.value)}
                                                >
                                                    <option value="Moderate (4-6h)">{isRTL ? 'متوسط (4-6 ساعات)' : 'Moderate (4-6h)'}</option>
                                                    <option value="Long Lasting (8-10h)">{isRTL ? 'طويل الأمد (8-10 ساعات)' : 'Long Lasting (8-10h)'}</option>
                                                    <option value="Eternal (12h+)">{isRTL ? 'ثبات أسطوري (12+ ساعة)' : 'Eternal (12h+)'}</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label>{isRTL ? 'الفوحان:' : 'Sillage / Projection:'}</label>
                                                <select 
                                                    className="form-control"
                                                    value={reviewSillage}
                                                    onChange={(e) => setReviewSillage(e.target.value)}
                                                >
                                                    <option value="Intimate">{isRTL ? 'هادئ وقريب' : 'Intimate'}</option>
                                                    <option value="Moderate">{isRTL ? 'متوسط ومميز' : 'Moderate'}</option>
                                                    <option value="Strong">{isRTL ? 'قوي وفواح' : 'Strong'}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <button 
                                            type="submit" 
                                            className="btn btn-gold submit-review-btn"
                                            disabled={submittingReview}
                                        >
                                            {submittingReview 
                                                ? (isRTL ? 'جاري النشر...' : 'Publishing...') 
                                                : (isRTL ? 'نشر التقييم الموثق' : 'Publish Verified Review')}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetails;
