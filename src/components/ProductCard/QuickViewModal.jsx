import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { 
    X, ShoppingCart, Heart, Check, Plus, Minus, 
    Sparkles, ShieldCheck, Truck, MapPin, ExternalLink, Flame
} from 'lucide-react';
import { CartContext } from '../../context/CartContext';
import { WishlistContext } from '../../context/WishlistContext';
import './QuickViewModal.css';

const QuickViewModal = ({ product, isOpen, onClose, isRTL }) => {
    const [mounted, setMounted] = useState(false);
    const { addToCart } = useContext(CartContext);
    const { toggleWishlist, isInWishlist } = useContext(WishlistContext);

    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState(null);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Extract sizes safely
    const rawSizes = Array.isArray(product?.size) 
        ? product.size 
        : (product?.size ? [product.size] : ['100ml']);

    const parsedSizes = rawSizes.map(s => {
        if (typeof s === 'object' && s !== null) {
            return {
                name: s.name || s.size || '100ml',
                price: Number(s.price) || Number(product?.price) || 0
            };
        }
        return {
            name: String(s),
            price: Number(product?.price) || 0
        };
    });

    useEffect(() => {
        if (parsedSizes.length > 0) {
            setSelectedSize(parsedSizes[0].name);
        }
    }, [product]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !mounted || !product) return null;

    // Normalize images
    const images = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : (Array.isArray(product.image) ? product.image : [product.image].filter(Boolean));
    const currentImg = images[selectedImageIndex] || images[0] || 'https://placehold.co/500x600/1a1a1a/d4af37?text=No+Image';

    // Calculate active price based on selected size if defined
    const activeSizeObj = parsedSizes.find(s => s.name === selectedSize);
    const currentPrice = activeSizeObj?.price || Number(product.price) || 0;

    const handleAddToCart = () => {
        if (product.stock === 0) return;
        addToCart(product, quantity, false, selectedSize);
        setAdded(true);
        setTimeout(() => setAdded(false), 2200);
    };

    // Parse fragrance notes
    const topNotes = product.topNotes || product.notes_top || '';
    const middleNotes = product.middleNotes || product.heartNotes || product.notes_middle || '';
    const baseNotes = product.baseNotes || product.notes_base || '';
    const hasNotes = Boolean(topNotes || middleNotes || baseNotes);

    const modalMarkup = (
        <div className="quickview-overlay animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
            <div 
                className={`quickview-card animate-scale-up ${isRTL ? 'rtl' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Top Action Bar: Wishlist (left) + Close (right) ── */}
                <div className="quickview-action-bar">
                    <button
                        type="button"
                        className={`quickview-wishlist-top-btn ${isInWishlist(product.id) ? 'active' : ''}`}
                        onClick={() => toggleWishlist(product)}
                        title={isInWishlist(product.id) ? (isRTL ? 'إزالة من المفضلة' : 'Remove from wishlist') : (isRTL ? 'إضافة إلى المفضلة' : 'Add to wishlist')}
                    >
                        <Heart size={18} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        type="button"
                        className="quickview-close-btn"
                        onClick={onClose}
                        aria-label={isRTL ? 'إغلاق' : 'Close'}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="quickview-layout">
                    {/* Media Column */}
                    <div className="quickview-media">
                        <div className="quickview-hero-image-wrap">
                            <img 
                                src={currentImg} 
                                alt={product.name} 
                                className="quickview-hero-image"
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/500x600/1a1a1a/d4af37?text=No+Image'; }}
                            />
                            
                            {/* Badges */}
                            {product.discount > 0 && (
                                <span className="quickview-badge discount-badge">
                                    {isRTL ? `خصم ${product.discount}%` : `${product.discount}% OFF`}
                                </span>
                            )}
                            {product.isNew && (
                                <span className="quickview-badge new-badge">
                                    {isRTL ? 'جديد' : 'NEW'}
                                </span>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="quickview-thumbs">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        className={`quickview-thumb-btn ${selectedImageIndex === idx ? 'active' : ''}`}
                                        onClick={() => setSelectedImageIndex(idx)}
                                    >
                                        <img src={img} alt={`Thumb ${idx + 1}`} />
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="quickview-trust-strip">
                            <div className="trust-pill">
                                <Truck size={14} color="#d4af37" />
                                <span>{isRTL ? 'توصيل مبرد داخل قطر خلال ساعات' : 'Same-day Qatar Climate Delivery'}</span>
                            </div>
                            <div className="trust-pill">
                                <ShieldCheck size={14} color="#10b981" />
                                <span>{isRTL ? 'عطر أصلي 100% مضمون' : '100% Guaranteed Authentic'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Column */}
                    <div className="quickview-details">
                        <span className="quickview-brand">{product.brand || 'Luxury Fragrance'}</span>

                        <h2 className="quickview-title">{product.name}</h2>
                        <div className="quickview-concentration">
                            {product.type || 'Eau de Parfum'}
                        </div>

                        {/* Price Row */}
                        <div className="quickview-price-row">
                            <span className="quickview-price">
                                {Math.round(currentPrice)} {isRTL ? 'ر.ق' : 'QAR'}
                            </span>
                            {product.oldPrice && Number(product.oldPrice) > currentPrice && (
                                <span className="quickview-old-price">
                                    {Math.round(product.oldPrice)} {isRTL ? 'ر.ق' : 'QAR'}
                                </span>
                            )}
                            {product.stock === 0 ? (
                                <span className="stock-status out">
                                    {isRTL ? 'نفد من المخزون' : 'Out of Stock'}
                                </span>
                            ) : (
                                <span className="stock-status in">
                                    <Sparkles size={12} /> {isRTL ? 'متوفر للتسليم الفوري' : 'In Stock in Qatar'}
                                </span>
                            )}
                        </div>

                        {/* Brief Scent Description */}
                        {product.description && (
                            <p className="quickview-desc">
                                {product.description.length > 180 
                                    ? product.description.substring(0, 180) + '...' 
                                    : product.description}
                            </p>
                        )}

                        {/* Olfactory Notes Pyramid */}
                        {hasNotes && (
                            <div className="quickview-notes-pyramid">
                                <div className="notes-heading">
                                    <Flame size={14} color="#d4af37" />
                                    <span>{isRTL ? 'الهرم العطري والمكونات النادرة' : 'Olfactory Pyramid & Notes'}</span>
                                </div>
                                <div className="notes-grid">
                                    {topNotes && (
                                        <div className="note-card">
                                            <span className="note-tier">{isRTL ? 'القمة العطرية' : 'Top Notes'}</span>
                                            <span className="note-items">{topNotes}</span>
                                        </div>
                                    )}
                                    {middleNotes && (
                                        <div className="note-card">
                                            <span className="note-tier">{isRTL ? 'قلب العطر' : 'Heart Notes'}</span>
                                            <span className="note-items">{middleNotes}</span>
                                        </div>
                                    )}
                                    {baseNotes && (
                                        <div className="note-card">
                                            <span className="note-tier">{isRTL ? 'القاعدة العطرية' : 'Base Notes'}</span>
                                            <span className="note-items">{baseNotes}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Size Selection */}
                        {parsedSizes.length > 0 && (
                            <div className="quickview-option-section">
                                <label className="option-label">{isRTL ? 'اختر الحجم' : 'Select Volume / Size'}</label>
                                <div className="size-pill-group">
                                    {parsedSizes.map((s, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className={`size-pill ${selectedSize === s.name ? 'active' : ''}`}
                                            onClick={() => setSelectedSize(s.name)}
                                        >
                                            <span>{s.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quantity & Add to Cart */}
                        <div className="quickview-actions-row">
                            <div className="quantity-stepper">
                                <button 
                                    type="button" 
                                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                    disabled={quantity <= 1 || product.stock === 0}
                                    aria-label="Decrease quantity"
                                >
                                    <Minus size={14} />
                                </button>
                                <span>{quantity}</span>
                                <button 
                                    type="button" 
                                    onClick={() => setQuantity(prev => prev + 1)}
                                    disabled={product.stock === 0}
                                    aria-label="Increase quantity"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            <button
                                type="button"
                                className={`quickview-add-cart-btn ${added ? 'added' : ''}`}
                                onClick={handleAddToCart}
                                disabled={product.stock === 0}
                            >
                                {added ? (
                                    <>
                                        <Check size={18} />
                                        <span>{isRTL ? 'تمت الإضافة للسلة' : 'Added to Cart'}</span>
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={18} />
                                        <span>{product.stock === 0 ? (isRTL ? 'نفد المخزون' : 'Sold Out') : (isRTL ? 'إضافة إلى سلة الشراء' : 'Add to Shopping Bag')}</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Full Details Navigation */}
                        <div className="quickview-footer-nav">
                            <Link 
                                to={`/product/${product.id}`} 
                                className="full-details-link"
                                onClick={onClose}
                            >
                                <span>{isRTL ? 'عرض صفحة العطر الكاملة والمراجعات' : 'View Full Product Details & Customer Reviews'}</span>
                                <ExternalLink size={14} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalMarkup, document.body);
};

export default QuickViewModal;
