import React, { useContext, useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import ProductCard from '../../components/ProductCard/ProductCard';
import Newsletter from '../../components/Newsletter/Newsletter';
import NearestShopFinder from '../../components/NearestShopFinder/NearestShopFinder';
import { ShopContext } from '../../context/ShopContext';
import brandStoryImg from '../../assets/logo_no_border.png';
import './Home.css';

const Home = () => {
    const { t } = useTranslation();
    const { isRTL } = useOutletContext();
    const { featuredProducts, newArrivals, perfumeProducts, fashionProducts, jewelleryProducts, giftBoxProducts, loading, discoverCampaigns, shops } = useContext(ShopContext);
    const [showAllNewArrivals, setShowAllNewArrivals] = useState(false);
    const [showAllPerfumes, setShowAllPerfumes] = useState(false);
    const [showAllGifts, setShowAllGifts] = useState(false);
    const [showAllFashion, setShowAllFashion] = useState(false);
    const [showAllJewellery, setShowAllJewellery] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [shuffledFeatured, setShuffledFeatured] = useState([]);

    // Determine what powers the Hero Banners 
    const heroItems = (discoverCampaigns && discoverCampaigns.length > 0) 
        ? discoverCampaigns 
        : shuffledFeatured;
        
    const isShopCampaign = discoverCampaigns && discoverCampaigns.length > 0;

    useEffect(() => {
        if (featuredProducts && featuredProducts.length > 0) {
            setShuffledFeatured([...featuredProducts].sort(() => 0.5 - Math.random()));
        } else {
            setShuffledFeatured([]);
        }
    }, [featuredProducts]);

    useEffect(() => {
        if (heroItems.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % heroItems.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [heroItems.length]);

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % heroItems.length);
    const prevSlide = () => setCurrentSlide(prev => (prev === 0 ? heroItems.length - 1 : prev - 1));

    return (
        <div className="home-page">
            <Helmet>
                <title>PerfumeHub | Best Luxury Perfumes & Fashion Marketplace in Qatar</title>
                <meta name="description" content="Shop authentic luxury perfumes, fashion, and jewellery in Qatar at PerfumeHub. The premier online marketplace for exclusive fragrances and luxury lifestyle brands with fast delivery across Doha." />
                <meta name="keywords" content="perfume, perfumehub, qatar perfume, perfumes qatar, buy perfume online qatar, luxury fragrances qatar, fashion qatar, jewellery qatar, perfume hub qatar, scent genie, luxury marketplace qatar" />
                <link rel="canonical" href="https://perfumehubqa.com/" />
            </Helmet>
            {/* Modern Minimalist Hero */}
            <section className="modern-hero animate-fade-in">
                <div className="hero-background"></div>
                <div className="modern-hero-content container">
                    <p className="hero-subtitle">{t('home.intro_text', 'RESTORING INVENTORY - THE ESSENCE OF LUXURY')}</p>
                    <h1 className="hero-title">{t('home.intro_title')}</h1>
                </div>
            </section>

            {/* Featured Hero (Discover Banners) */}
            {heroItems.length > 0 ? (
                <section className="hero-slider-section container" style={{ animation: 'fadeIn 1s ease-out' }}>
                    <div className="featured-slider-container">
                        <div className="featured-slider-track" style={{ transform: `translateX(-${currentSlide * 100}%)`, direction: 'ltr' }}>
                            {heroItems.map((item) => (
                                <div key={item.id} className="featured-slide">
                                    <div 
                                        className="featured-slide-dynamic-bg" 
                                        style={{ backgroundImage: `url(${isShopCampaign ? (item.shop?.logo_url || '') : (Array.isArray(item.image) ? item.image[0] : item.image)})`, opacity: isShopCampaign ? 0.3 : 1 }}
                                    ></div>
                                    <div className="featured-slide-img-container">
                                        <img 
                                            src={isShopCampaign ? (item.shop?.logo_url || 'https://placehold.co/400x400/1a1a1a/d4af37?text=Premium+Shop') : (Array.isArray(item.image) ? item.image[0] : item.image)} 
                                            alt={isShopCampaign ? item.shop?.name : item.name} 
                                            className="featured-slide-img" 
                                            loading="eager"
                                            decoding="async"
                                            style={isShopCampaign ? { objectFit: 'contain', padding: '2rem' } : undefined}
                                        />
                                    </div>
                                    <div className="featured-slide-content">
                                        {isShopCampaign ? (
                                            <>
                                                <span className="featured-slide-brand">Premium Shop {item.placement_slot ? `• ${item.placement_slot}` : ''}</span>
                                                <h3 className="featured-slide-title">{item.shop?.name}</h3>
                                                <p className="featured-slide-desc" dir="auto">Trust Score: ★ {item.shop?.trust_score}/5</p>
                                                <div className="featured-slide-actions" style={{ marginTop: '2rem' }}>
                                                    <Link to={`/shop?shop_id=${item.shop?.id}`} className="btn btn-gold">
                                                        Visit Premium Shop
                                                    </Link>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span className="featured-slide-brand">{item.brand}</span>
                                                <h3 className="featured-slide-title">{item.name}</h3>
                                                {item.type && <span className="featured-slide-type">{item.type}</span>}
                                                {item.description && <p className="featured-slide-desc" dir="auto">{item.description}</p>}
                                                <div className={`featured-slide-price-row ${item.discount > 0 ? 'has-discount' : ''}`}>
                                                    <span className={`featured-slide-price ${item.discount > 0 ? 'price-sale' : ''}`}>
                                                        {item.price} {isRTL ? 'ر.ق' : 'QAR'}
                                                    </span>
                                                    {item.oldPrice && Number(item.oldPrice) !== Number(item.price) ? (
                                                        <span className="featured-slide-old-price">
                                                            {Math.round(item.oldPrice)} {isRTL ? 'ر.ق' : 'QAR'}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="featured-slide-actions">
                                                    <Link to={`/product/${item.id}`} className="btn btn-gold">
                                                        {isRTL ? 'اكتشف المزيد' : 'Discover More'}
                                                    </Link>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {heroItems.length > 1 && (
                            <>
                                <button className="slider-btn slider-prev" onClick={prevSlide} aria-label="Previous Slide">
                                    <ChevronLeft size={24} />
                                </button>
                                <button className="slider-btn slider-next" onClick={nextSlide} aria-label="Next Slide">
                                    <ChevronRight size={24} />
                                </button>
                                <div className="slider-dots">
                                    {heroItems.map((_, idx) => (
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
            <div className="container section">
                <NearestShopFinder isRTL={isRTL} />
            </div>

            {/* Premium Boutiques */}
            <section className="section container reveal premium-boutiques-section">
                <div className="section-header">
                    <h2 className="section-title" style={{ fontSize: '1.5rem' }}>{isRTL ? 'متاجر مميزة' : 'Premium Boutiques'}</h2>
                    <span className="ui-badge premium" style={{ marginLeft: isRTL ? '0' : '10px', marginRight: isRTL ? '10px' : '0' }}>Trusted</span>
                </div>
                <div className="premium-boutiques-scroll">
                    {shops.length > 0 ? (
                        shops.filter(s => s.is_recommended || s.is_featured).map((shop) => (
                            <div key={shop.id} className="premium-card boutique-card animate-fade-in">
                                <div 
                                    className="boutique-image-container" 
                                    style={{ 
                                        backgroundImage: `url(${shop.logo_url || 'https://placehold.co/400x400/1a1a1a/d4af37?text=' + encodeURIComponent(shop.name)})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        height: '150px',
                                        backgroundColor: '#1a1a1a',
                                        borderRadius: '12px 12px 0 0'
                                    }}
                                ></div>
                                <div className="boutique-info">
                                    <h4 style={{ margin: 0 }}>{shop.name}</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                            {'⭐'.repeat(Math.round(shop.rating_avg || 5))} {shop.rating_avg || '5.0'}
                                        </span>
                                        <Link to={`/shop?shop_id=${shop.id}`} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                            {isRTL ? 'زيارة' : 'Visit'}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '20px', color: '#666', fontStyle: 'italic' }}>
                            {isRTL ? 'جاري تحميل المتاجر...' : 'Loading premium boutiques...'}
                        </div>
                    )}
                </div>
            </section>

            {/* New Arrivals */}
            <section className="section container reveal">
                <div className="section-header text-center">
                    <h2 className="section-title">{t('new_arrivals.title')}</h2>
                    <p className="section-subtitle">{t('new_arrivals.subtitle')}</p>
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
                        {showAllNewArrivals ? t('common.view_less') : t('common.view_more')}
                    </button>
                </div>
            </section>

            {/* Perfumes Section */}
            {perfumeProducts.length > 0 && (
                <section className="section container reveal">
                    <div className="section-header text-center">
                        <h2 className="section-title">{isRTL ? 'العطور الفاخرة' : 'Luxury Perfumes'}</h2>
                        <p className="section-subtitle">
                            {isRTL ? 'تشكيلة واسعة من أرقى العطور العالمية' : 'A curated selection of the world\'s finest fragrances'}
                        </p>
                    </div>
                    <div className={`products-grid-wrapper${showAllPerfumes ? '' : ' collapsed'}`}>
                        <div className="products-grid">
                            {perfumeProducts.map(product => (
                                <ProductCard key={product.id} product={product} isRTL={isRTL} />
                            ))}
                        </div>
                        {!showAllPerfumes && <div className="products-grid-fade"></div>}
                    </div>
                    <div className="text-center section-view-more">
                        <button className="btn btn-outline" onClick={() => setShowAllPerfumes(prev => !prev)}>
                            {showAllPerfumes ? t('common.view_less') : t('common.view_more')}
                        </button>
                        <Link to="/shop" className="btn btn-outline" style={{ marginLeft: '12px' }}>
                            {t('common.view_all')}
                        </Link>
                    </div>
                </section>
            )}

            {/* Gift Boxes Section */}
            {giftBoxProducts.length > 0 && (
                <section className="section gift-box-special-section reveal">
                    <div className="container">
                        <div className="gift-box-header text-center">
                            <h2 className="section-title">{t('gift_boxes.title', 'Luxury Gift Boxes')}</h2>
                            <p className="section-subtitle">
                                {t('gift_boxes.subtitle', 'Perfectly curated sets for every occasion')}
                            </p>
                        </div>
                        <div className={`products-grid-wrapper${showAllGifts ? '' : ' collapsed'}`}>
                            <div className="products-grid">
                                {giftBoxProducts.map(product => (
                                    <ProductCard key={product.id} product={product} isRTL={isRTL} />
                                ))}
                            </div>
                            {!showAllGifts && <div className="products-grid-fade"></div>}
                        </div>
                        <div className="text-center section-view-more" style={{ marginTop: '32px' }}>
                            <button className="btn btn-outline" onClick={() => setShowAllGifts(prev => !prev)}>
                                {showAllGifts ? t('common.view_less') : t('common.view_more')}
                            </button>
                            <Link to="/category/gift-box" className="btn btn-gold" style={{ marginLeft: '12px' }}>
                                {isRTL ? 'تسوق جميع الصناديق' : 'Shop All Gift Boxes'}
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* Fashion Section */}
            {fashionProducts.length > 0 && (
                <section className="section container reveal">
                    <div className="section-header text-center">
                        <h2 className="section-title">{isRTL ? 'أزياء فاخرة' : 'Luxury Fashion'}</h2>
                        <p className="section-subtitle">
                            {isRTL ? 'أرقى الأزياء والملابس العالمية' : 'Designer clothing and luxury apparel'}
                        </p>
                    </div>
                    <div className={`products-grid-wrapper${showAllFashion ? '' : ' collapsed'}`}>
                        <div className="products-grid">
                            {fashionProducts.map(product => (
                                <ProductCard key={product.id} product={product} isRTL={isRTL} />
                            ))}
                        </div>
                        {!showAllFashion && <div className="products-grid-fade"></div>}
                    </div>
                    <div className="text-center section-view-more">
                        <button className="btn btn-outline" onClick={() => setShowAllFashion(prev => !prev)}>
                            {showAllFashion ? t('common.view_less') : t('common.view_more')}
                        </button>
                        <Link to="/category/fashion" className="btn btn-outline" style={{ marginLeft: '12px' }}>
                            {t('common.view_all')}
                        </Link>
                    </div>
                </section>
            )}

            {/* Jewellery Section */}
            {jewelleryProducts.length > 0 && (
                <section className="section container reveal">
                    <div className="section-header text-center">
                        <h2 className="section-title">{isRTL ? 'المجوهرات الفاخرة' : 'Fine Jewellery'}</h2>
                        <p className="section-subtitle">
                            {isRTL ? 'مجوهرات ذهبية وفضية وأحجار كريمة أصيلة' : 'Gold, silver and precious gemstone pieces'}
                        </p>
                    </div>
                    <div className={`products-grid-wrapper${showAllJewellery ? '' : ' collapsed'}`}>
                        <div className="products-grid">
                            {jewelleryProducts.map(product => (
                                <ProductCard key={product.id} product={product} isRTL={isRTL} />
                            ))}
                        </div>
                        {!showAllJewellery && <div className="products-grid-fade"></div>}
                    </div>
                    <div className="text-center section-view-more">
                        <button className="btn btn-outline" onClick={() => setShowAllJewellery(prev => !prev)}>
                            {showAllJewellery ? t('common.view_less') : t('common.view_more')}
                        </button>
                        <Link to="/category/jewellery" className="btn btn-outline" style={{ marginLeft: '12px' }}>
                            {t('common.view_all')}
                        </Link>
                    </div>
                </section>
            )}

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
            <div style={{ textAlign: 'center', padding: '10px', color: '#333', fontSize: '0.7rem', opacity: 0.5 }}>Version 0.0.1 - RESTORED</div>
        </div>
    );
};

export default Home;
