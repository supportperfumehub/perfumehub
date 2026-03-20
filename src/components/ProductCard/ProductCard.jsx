import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Heart, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CartContext } from '../../context/CartContext';
import { WishlistContext } from '../../context/WishlistContext';
import './ProductCard.css';

/* ─── Mini Image Swiper ─── */
const ImageSwiper = ({ images, name }) => {
    const [current, setCurrent] = useState(0);
    const scrollRef = React.useRef(null);
    const imgArray = Array.isArray(images) ? images : [images];
    const hasMultiple = imgArray.length > 1;

    const handleScroll = (e) => {
        if (!hasMultiple) return;
        const scrollLeft = e.target.scrollLeft;
        const width = e.target.offsetWidth;
        const newIndex = Math.round(scrollLeft / width);
        if (newIndex !== current) {
            setCurrent(newIndex);
        }
    };

    const scrollTo = (index) => {
        if (scrollRef.current) {
            const width = scrollRef.current.offsetWidth;
            scrollRef.current.scrollTo({
                left: index * width,
                behavior: 'smooth'
            });
        }
    };

    const prev = (e) => { e.preventDefault(); e.stopPropagation(); scrollTo((current - 1 + imgArray.length) % imgArray.length); };
    const next = (e) => { e.preventDefault(); e.stopPropagation(); scrollTo((current + 1) % imgArray.length); };

    return (
        <div className="swiper-container">
            <div 
                className="swiper-scroll-track" 
                ref={scrollRef}
                onScroll={handleScroll}
            >
                {imgArray.map((img, idx) => (
                    <img
                        key={idx}
                        src={img}
                        alt={`${name} - ${idx + 1}`}
                        className="product-image swiper-img"
                        loading="lazy"
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x500/1a1a1a/d4af37?text=No+Image'; }}
                    />
                ))}
            </div>

            {hasMultiple && (
                <>
                    <button className="swiper-arrow swiper-prev" onClick={prev} aria-label="Previous image">
                        <ChevronLeft size={16} />
                    </button>
                    <button className="swiper-arrow swiper-next" onClick={next} aria-label="Next image">
                        <ChevronRight size={16} />
                    </button>

                    <div className="swiper-dots">
                        {imgArray.map((_, idx) => (
                            <button
                                key={idx}
                                className={`swiper-dot ${idx === current ? 'active' : ''}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollTo(idx); }}
                                aria-label={`Image ${idx + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

/* ─── Product Card ─── */
const ProductCard = ({ product, isRTL }) => {
    const { t } = useTranslation();
    const { addToCart } = useContext(CartContext);
    const { toggleWishlist, isInWishlist } = useContext(WishlistContext);
    const [addedToCart, setAddedToCart] = useState(false);

    const handleToggleWishlist = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(product);
    };

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (product.stock === 0) return;
        addToCart(product, 1, false);
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
    };

    return (
        <div className="product-card animate-fade-in">
            <Link to={`/product/${product.id}`} className="product-image-container">
                {/* Swipeable image gallery */}
                <ImageSwiper images={product.image} name={product.name} />

                <button
                    className={`wishlist-btn ${isInWishlist(product.id) ? 'active' : ''}`}
                    onClick={handleToggleWishlist}
                    aria-label="Wishlist"
                >
                    <Heart size={18} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} color="currentColor" />
                </button>

                {product.isNew && (product.discount === 0 || !product.discount) ? (
                    <span className="product-badge premium-badge">
                        {t('product.new')}
                    </span>
                ) : null}
                {product.discount > 0 ? (
                    <span className="product-badge sale-badge">
                        {isRTL ? `${t('product.sale')} ${product.discount}%` : `${product.discount}% OFF`}
                    </span>
                ) : null}
                {product.stock === 0 ? (
                    <span className="product-badge out-of-stock-badge">
                        {t('product.sold_out')}
                    </span>
                ) : null}

                <div className="product-overlay">
                    <button
                        className={`btn ${addedToCart ? 'btn-success' : 'btn-primary'} quick-add ${product.stock === 0 ? 'out-of-stock' : ''}`}
                        onClick={handleAddToCart}
                        disabled={product.stock === 0}
                        style={{ backgroundColor: addedToCart ? 'var(--success, #28a745)' : '' }}
                    >
                        {addedToCart ? <Check size={18} /> : <ShoppingCart size={18} />}
                        <span>{addedToCart ? t('product.added') : (product.stock === 0 ? t('product.out_of_stock') : t('product.add_to_cart'))}</span>
                    </button>
                </div>
            </Link>

            <div className="product-info">
                <p className="product-brand">{product.brand}</p>
                <h3 className="product-name">
                    <Link to={`/product/${product.id}`}>{product.name}</Link>
                </h3>
                <p className="product-type">{product.type} - {Array.isArray(product.size) ? (typeof product.size[0] === 'object' ? product.size[0].name : product.size[0]) : product.size}</p>
                <div className={`product-price-row ${product.discount > 0 ? 'has-discount' : ''}`}>
                    <span className={`product-price ${product.discount > 0 ? 'price-sale' : ''}`}>
                        {Math.round(product.price)} {t('common.currency')}
                    </span>
                    {product.oldPrice && Number(product.oldPrice) !== Number(product.price) ? (
                        <span className="product-old-price">{Math.round(product.oldPrice)} {t('common.currency')}</span>
                    ) : null}
                    {product.discount > 0 && product.oldPrice && Number(product.oldPrice) !== Number(product.price) ? (
                        <span className="product-savings-pill">
                            {t('product.save')} {(product.oldPrice - product.price).toFixed(0)} {t('common.currency')}
                        </span>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
