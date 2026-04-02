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
    const { featuredProducts, newArrivals, mensProducts, womensProducts } = useContext(ShopContext);
    const [showAllCategories, setShowAllCategories] = useState(false);
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

    const categories = [
        {
            id: 'men',
            title: t('categories.men'),
            link: '/category/men',
            image: 'https://images.unsplash.com/photo-1582211594533-268f4f1edcb9?auto=format&fit=crop&q=80&w=800'
        },
        {
            id: 'women',
            title: t('categories.women'),
            link: '/category/women',
            image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=800'
        },
        {
            id: 'unisex',
            title: t('categories.unisex', 'Unisex Perfumes'),
            link: '/category/unisex',
            image: 'https://images.unsplash.com/photo-1557170334-a9632e77c6e4?auto=format&fit=crop&q=80&w=800'
        },
        {
            id: 'arabic',
            title: t('categories.arabic'),
            link: '/category/arabic',
            image: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&q=80&w=800'
        },
        {
            id: 'all',
            title: t('categories.all_perfumes'),
            link: '/shop',
            image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=800'
        }
    ];

    return (
        <div className="home-page">
            {/* Top Quick Navigation (Alternative Options) */}
            <div className="quick-category-nav container animate-fade-in">
                <Link to="/category/men" className="quick-nav-chip">{t('categories.men')}</Link>
                <Link to="/category/women" className="quick-nav-chip">{t('categories.women')}</Link>
                <Link to="/category/unisex" className="quick-nav-chip">{t('categories.unisex')}</Link>
                <Link to="/category/arabic" className="quick-nav-chip">{t('categories.arabic')}</Link>
                <Link to="/shop" className="quick-nav-chip">{isRTL ? 'وصلنا حديثاً' : 'New Arrivals'}</Link>
                <Link to="/ai-advisor" className="quick-nav-chip advisor-chip">
                    <span className="chip-sparkle">✨</span> {t('hero.scent_advisor')}
                </Link>
            </div>

            {/* Featured Products as the New Hero (Discover Banners) */}
            {shuffledFeatured.length > 0 && (
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
                                        <div className="featured-slide-price">
                                            {product.price} {isRTL ? 'ر.ق' : 'QAR'}
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
            )}

            {/* Nearest Shop Finder */}
            <NearestShopFinder isRTL={isRTL} />

            {/* Shop By Categories */}
            <section className="section container reveal">
                <div className="section-header text-center">
                    <h2 className="section-title">{t('categories.title')}</h2>
                    <p className="section-subtitle">
                        {t('categories.subtitle')}
                    </p>
                </div>

                <div className="category-grid-wrapper">
                    <div className="category-grid">
                        {categories.slice(0, showAllCategories ? categories.length : 4).map(category => (
                            <Link key={category.id} to={category.link} className="category-card">
                                <div className="category-image">
                                    <img src={category.image} alt={category.title} loading="lazy" decoding="async" />
                                    <div className="category-overlay"></div>
                                </div>
                                <h3 className="category-title">{category.title}</h3>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="text-center categories-view-more">
                    <button
                        className="btn btn-outline"
                        onClick={() => setShowAllCategories(prev => !prev)}
                    >
                        {showAllCategories
                            ? t('common.view_less')
                            : t('common.view_more')}
                    </button>
                </div>
            </section>

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
