import React, { useContext, useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProductCard from '../../components/ProductCard/ProductCard';
import Newsletter from '../../components/Newsletter/Newsletter';
import NearestShopFinder from '../../components/NearestShopFinder/NearestShopFinder';
import { ShopContext } from '../../context/ShopContext';
import brandStoryImg from '../../assets/logo_no_border.png';
import './Home.css';

const Home = () => {
    const { i18n, t } = useTranslation();
    const { isRTL } = useOutletContext();
    const { featuredProducts, newArrivals, mensProducts, womensProducts, loading } = useContext(ShopContext);
    const [showAllNewArrivals, setShowAllNewArrivals] = useState(false);
    const [showAllMens, setShowAllMens] = useState(false);
    const [showAllWomens, setShowAllWomens] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [shuffledFeatured, setShuffledFeatured] = useState([]);

    useEffect(() => {
        if (featuredProducts && featuredProducts.length > 0) {
            setShuffledFeatured([...featuredProducts].sort(() => 0.5 - Math.random()));
        } else {
            setShuffledFeatured([]);
        }
    }, [featuredProducts]);

    useEffect(() => {
        if (shuffledFeatured.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % shuffledFeatured.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [shuffledFeatured.length]);

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % shuffledFeatured.length);
    const prevSlide = () => setCurrentSlide(prev => (prev === 0 ? shuffledFeatured.length - 1 : prev - 1));



    return (
        <div className="home-page">
            {/* Site Introduction Section */}
            <section className="home-intro container animate-fade-in">
                <div className="home-intro-content">
                    <h1 className="home-intro-title">{t('home.intro_title')}</h1>
                    <p className="home-intro-text">{t('home.intro_text')}</p>
                </div>
            </section>

            {/* Featured Products as the New Hero (Discover Banners) */}
            {shuffledFeatured.length > 0 ? (
                <section className="hero-slider-section container" style={{ animation: 'fadeIn 1s ease-out' }}>
                    <div className="featured-slider-container">
                        <div className="featured-slider-track" style={{ transform: `translateX(-${currentSlide * 100}%)`, direction: 'ltr' }}>
                            {shuffledFeatured.map((product) => (
                                <div key={product.id} className="featured-slide">
                                    <div 
                                        className="featured-slide-dynamic-bg" 
                                        style={{ backgroundImage: `url(${Array.isArray(product.image) ? product.image[0] : product.image})` }}
                                    ></div>
                                    <div className="featured-slide-img-container">
                                        <img 
                                            src={Array.isArray(product.image) ? product.image[0] : product.image} 
                                            alt={product.name} 
                                            className="featured-slide-img" 
                                            loading="eager"
                                            decoding="async"
                                        />
                                    </div>
                                    <div className="featured-slide-content">
                                        <span className="featured-slide-brand">{product.brand}</span>
                                        <h3 className="featured-slide-title">{product.name}</h3>
                                        {product.type && <span className="featured-slide-type">{product.type}</span>}
                                        {product.description && <p className="featured-slide-desc" dir="auto">{product.description}</p>}
                                        <div className={`featured-slide-price-row ${product.discount > 0 ? 'has-discount' : ''}`}>
                                            <span className={`featured-slide-price ${product.discount > 0 ? 'price-sale' : ''}`}>
                                                {product.price} {isRTL ? 'ر.ق' : 'QAR'}
                                            </span>
                                            {product.oldPrice && Number(product.oldPrice) !== Number(product.price) ? (
                                                <span className="featured-slide-old-price">
                                                    {Math.round(product.oldPrice)} {isRTL ? 'ر.ق' : 'QAR'}
                                                </span>
                                            ) : null}
                                            {product.discount > 0 ? (
                                                <span className="featured-slide-discount-pill">
                                                    {isRTL ? `${t('product.sale')} ${product.discount}%` : `${product.discount}% OFF`}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="featured-slide-actions">
                                            <Link to={`/product/${product.id}`} className="btn btn-gold">
                                                {isRTL ? 'اكتشف المزيد' : 'Discover More'}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {shuffledFeatured.length > 1 && (
                            <>
                                <button className="slider-btn slider-prev" onClick={prevSlide} aria-label="Previous Slide">
                                    <ChevronLeft size={24} />
                                </button>
                                <button className="slider-btn slider-next" onClick={nextSlide} aria-label="Next Slide">
                                    <ChevronRight size={24} />
                                </button>
                                <div className="slider-dots">
                                    {shuffledFeatured.map((_, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`slider-dot ${idx === currentSlide ? 'active' : ''}`}
                                            onClick={() => setCurrentSlide(idx)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </section>
            ) : loading ? (
                <section className="hero-slider-section container">
                    <div className="featured-slider-container" style={{ minHeight: '450px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px auto 40px', borderRadius: '12px' }}>
                         <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    </div>
                </section>
            ) : null}

            {/* Nearest Shop Finder */}
            <NearestShopFinder isRTL={isRTL} />

            {/* New Arrivals */}
            <section className="section container reveal">
                <div className="section-header text-center">
                    <h2 className="section-title">{t('new_arrivals.title')}</h2>
                    <p className="section-subtitle">
                        {t('new_arrivals.subtitle')}
                    </p>
                </div>

                <div className={`products-grid-wrapper${showAllNewArrivals ? '' : ' collapsed'}`}>
                    <div className="products-grid">
                        {newArrivals.map(product => (
                            <ProductCard key={product.id} product={product} isRTL={isRTL} />
                        ))}
                    </div>
                    {!showAllNewArrivals && <div className="products-grid-fade"></div>}
                </div>

                <div className="text-center section-view-more">
                    <button className="btn btn-outline" onClick={() => setShowAllNewArrivals(prev => !prev)}>
                        {showAllNewArrivals
                            ? t('common.view_less')
                            : t('common.view_more')}
                    </button>
                </div>
            </section>

            {/* Men's Section */}
            <section className="section container reveal">
                <div className="section-header text-center">
                    <h2 className="section-title">{t('mens.title')}</h2>
                    <p className="section-subtitle">
                        {t('mens.subtitle')}
                    </p>
                </div>

                <div className={`products-grid-wrapper${showAllMens ? '' : ' collapsed'}`}>
                    <div className="products-grid">
                        {mensProducts.map(product => (
                            <ProductCard key={product.id} product={product} isRTL={isRTL} />
                        ))}
                    </div>
                    {!showAllMens && <div className="products-grid-fade"></div>}
                </div>

                <div className="text-center section-view-more">
                    <button className="btn btn-outline" onClick={() => setShowAllMens(prev => !prev)}>
                        {showAllMens
                            ? t('common.view_less')
                            : t('common.view_more')}
                    </button>
                    <Link to="/category/men" className="btn btn-outline" style={{ marginLeft: '12px' }}>
                        {t('common.view_all')}
                    </Link>
                </div>
            </section>

            {/* Women's Section */}
            <section className="section container reveal">
                <div className="section-header text-center">
                    <h2 className="section-title">{t('womens.title')}</h2>
                    <p className="section-subtitle">
                        {t('womens.subtitle')}
                    </p>
                </div>

                <div className={`products-grid-wrapper${showAllWomens ? '' : ' collapsed'}`}>
                    <div className="products-grid">
                        {womensProducts.map(product => (
                            <ProductCard key={product.id} product={product} isRTL={isRTL} />
                        ))}
                    </div>
                    {!showAllWomens && <div className="products-grid-fade"></div>}
                </div>

                <div className="text-center section-view-more">
                    <button className="btn btn-outline" onClick={() => setShowAllWomens(prev => !prev)}>
                        {showAllWomens
                            ? t('common.view_less')
                            : t('common.view_more')}
                    </button>
                    <Link to="/category/women" className="btn btn-outline" style={{ marginLeft: '12px' }}>
                        {t('common.view_all')}
                    </Link>
                </div>
            </section>

            {/* AI Advisor Banner */}
            <section className="ai-advisor-banner-section reveal">
                <div className="ai-advisor-banner-container container">
                    <div className="ai-advisor-banner" style={{backgroundImage: "url('/assets/ai_advisor_bg.png')"}}>
                        <div className="ai-advisor-overlay"></div>
                        <div className="ai-advisor-content">
                            <span className="ai-advisor-tagline">{t('ai_advisor_banner.tagline')}</span>
                            <h2 className="ai-advisor-title">{t('ai_advisor_banner.title')}</h2>
                            <p className="ai-advisor-text">{t('ai_advisor_banner.description')}</p>
                            <Link to="/ai-advisor" className="btn btn-gold ai-advisor-btn">
                                {t('ai_advisor_banner.button')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Brand Story Snippet */}
            <section className="brand-story-section reveal">
                <div className="brand-story-container container">
                    <div className="brand-story-image">
                        <img src={brandStoryImg} alt="Luxury Perfumes" />
                    </div>
                    <div className="brand-story-content">
                        <span className="text-gold" style={{ letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                            {t('brand_story.our_story')}
                        </span>
                        <h2>{t('brand_story.title')}</h2>
                        <p>
                            {t('brand_story.text')}
                        </p>
                        <Link to="/about" className="btn btn-outline" style={{ marginTop: '20px' }}>
                            {t('brand_story.discover_more')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Newsletter Section */}
            <Newsletter isRTL={isRTL} />
        </div>
    );
};

export default Home;
