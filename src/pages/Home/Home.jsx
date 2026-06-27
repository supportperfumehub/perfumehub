import React, { useContext, useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import ProductCard from '../../components/ProductCard/ProductCard';
import Newsletter from '../../components/Newsletter/Newsletter';
import NearestShopFinder from '../../components/NearestShopFinder/NearestShopFinder';
import { ShopContext } from '../../context/ShopContext';
import { RegionContext } from '../../context/RegionContext';
import brandStoryImg from '../../assets/logo_no_border.webp';
import northClubLogo from '../../assets/north_club_logo.webp';
import './Home.css';

const Home = () => {
    const { t } = useTranslation();
    const { isRTL } = useOutletContext();
    const { featuredProducts, newArrivals, perfumeProducts, fashionProducts, jewelleryProducts, giftBoxProducts, loading, discoverCampaigns, shops } = useContext(ShopContext);
    const { activeRegion } = useContext(RegionContext);
    const [showAllNewArrivals, setShowAllNewArrivals] = useState(false);
    const [showAllPerfumes, setShowAllPerfumes] = useState(false);
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

    const regionName = activeRegion?.name || 'Qatar';
    const seoTitle = `PerfumeHub | Best Luxury Perfumes & Fashion Marketplace in ${regionName}`;
    const seoDescription = `Shop authentic luxury perfumes, fashion, and jewellery in ${regionName} at PerfumeHub. The premier online marketplace for exclusive fragrances and luxury lifestyle brands with fast delivery.`;
    const seoKeywords = `perfume, perfumehub, ${regionName.toLowerCase()} perfume, perfumes ${regionName.toLowerCase()}, buy perfume online ${regionName.toLowerCase()}, luxury fragrances ${regionName.toLowerCase()}, fashion ${regionName.toLowerCase()}, jewellery ${regionName.toLowerCase()}, perfume hub ${regionName.toLowerCase()}`;
    const seoCanonical = activeRegion?.code 
        ? `https://perfumehub.com/${activeRegion.code.toLowerCase()}`
        : "https://perfumehub.com/";

    return (
        <div className="home-page">
            <Helmet>
                <title>{seoTitle}</title>
                <meta name="description" content={seoDescription} />
                <meta name="keywords" content={seoKeywords} />
                <link rel="canonical" href={seoCanonical} />
            </Helmet>
            {/* Modern Minimalist Hero */}
            <section className="modern-hero animate-fade-in">
                <div className="hero-background"></div>
                <div className="modern-hero-content container">
                    {/* CSS-based horizontal brand logo block */}
                    <div className="hero-logo-container-custom animate-slide-up">
                        <div className="horizontal-logo-pre-tagline">
                            — PERFUME HUB TRADING —
                        </div>
                        <div className="horizontal-logo-box">
                            <div className="logo-left-half">
                                <span className="logo-north-text">NORTH</span>
                            </div>
                            <div className="logo-right-half">
                                <span className="logo-club-text">CLUB PARIS</span>
                            </div>
                        </div>
                        <div className="horizontal-logo-tagline">
                            — {t('home.intro_text', 'THE ESSENCE OF TIMELESS LUXURY')} —
                        </div>
                    </div>
                    {/* Screen reader and SEO friendly text */}
                    <div className="sr-only">
                        <p className="hero-subtitle">{t('home.intro_text', 'PERFUME HUB TRADING')}</p>
                        <h1 className="hero-title">{t('home.intro_title', 'NORTH CLUB PARIS')}</h1>
                    </div>
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
                                        style={{ backgroundImage: `url(${isShopCampaign ? (item.shop?.images?.[0] || item.shop?.logo_url || '') : (Array.isArray(item.image) ? item.image[0] : item.image)})`, opacity: isShopCampaign ? 0.3 : 1 }}
                                    ></div>
                                    <div className="featured-slide-img-container">
                                        <img 
                                            src={isShopCampaign ? (item.shop?.images?.[0] || item.shop?.logo_url || 'https://placehold.co/400x400/1a1a1a/d4af37?text=Premium+Shop') : (Array.isArray(item.image) ? item.image[0] : item.image)} 
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
                    <div className="featured-slider-container" style={{ height: '450px', background: '#111', borderRadius: '12px', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                        <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div className="skeleton skeleton-line short" style={{ height: '20px', marginBottom: '20px' }}></div>
                            <div className="skeleton skeleton-line long" style={{ height: '40px', marginBottom: '20px' }}></div>
                            <div className="skeleton skeleton-line medium" style={{ height: '16px', marginBottom: '10px' }}></div>
                            <div className="skeleton skeleton-line long" style={{ height: '16px', marginBottom: '30px' }}></div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="skeleton" style={{ width: '130px', height: '45px', borderRadius: '6px' }}></div>
                                <div className="skeleton" style={{ width: '130px', height: '45px', borderRadius: '6px' }}></div>
                            </div>
                        </div>
                        <div className="hide-mobile" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                            <div className="skeleton" style={{ width: '80%', height: '80%', borderRadius: '20px' }}></div>
                        </div>
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
                        (() => {
                            const activeShops = shops.filter(s => s.status?.toUpperCase() === 'ACTIVE');
                            const featuredShops = activeShops.filter(s => s.is_recommended || s.is_featured);
                            const displayShops = featuredShops.length > 0 ? featuredShops : activeShops;

                            if (displayShops.length === 0) {
                                return (
                                    <div style={{ padding: '20px', color: '#666', fontStyle: 'italic' }}>
                                        {isRTL ? 'لا توجد متاجر نشطة حالياً' : 'No active boutiques available.'}
                                    </div>
                                );
                            }

                            return displayShops.map((shop) => (
                                <div key={shop.id} className="premium-card boutique-card animate-fade-in">
                                    <div 
                                        className="boutique-image-container" 
                                        style={{ 
                                            backgroundImage: `url(${shop.images?.[0] || shop.logo_url || 'https://placehold.co/400x400/1a1a1a/d4af37?text=' + encodeURIComponent(shop.name)})`,
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
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '8px' }}>
                                            <Link to={`/shop?shop_id=${shop.id}`} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                                {isRTL ? 'زيارة' : 'Visit'}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ));
                        })()
                    ) : loading ? (
                        [1, 2, 3, 4].map(idx => (
                            <div key={idx} className="boutique-card-skeleton">
                                <div className="skeleton skeleton-image" style={{ height: '140px', marginBottom: '16px' }}></div>
                                <div className="skeleton skeleton-line short" style={{ marginBottom: '8px' }}></div>
                                <div className="skeleton skeleton-line medium" style={{ marginBottom: '12px' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                                    <div className="skeleton" style={{ width: '70px', height: '28px', borderRadius: '4px' }}></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '20px', color: '#666', fontStyle: 'italic' }}>
                            {isRTL ? 'لا توجد متاجر نشطة حالياً' : 'No active boutiques available.'}
                        </div>
                    )}
                </div>
            </section>

            {loading && (
                <section className="section container">
                    <div className="section-header text-center">
                        <div className="skeleton skeleton-line short" style={{ height: '32px', margin: '0 auto 12px' }}></div>
                        <div className="skeleton skeleton-line medium" style={{ height: '16px', margin: '0 auto' }}></div>
                    </div>
                    <div className="products-grid">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(idx => (
                            <div key={idx} className="product-card-skeleton">
                                <div className="skeleton skeleton-image" style={{ height: '220px', marginBottom: '16px' }}></div>
                                <div className="skeleton skeleton-line short" style={{ marginBottom: '8px' }}></div>
                                <div className="skeleton skeleton-line long" style={{ marginBottom: '12px' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                    <div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: '4px' }}></div>
                                    <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

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
                        <h2 className="section-title">{isRTL ? 'العطور' : 'Perfumes'}</h2>
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



            {/* Fashion Section */}
            {fashionProducts.length > 0 && (
                <section className="section container reveal">
                    <div className="section-header text-center">
                        <h2 className="section-title">{isRTL ? 'الأزياء' : 'Fashion'}</h2>
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
                        <h2 className="section-title">{isRTL ? 'المجوهرات' : 'Jewellery'}</h2>
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
                    <div className="ai-advisor-banner" style={{backgroundImage: "url('/assets/ai_advisor_bg.webp')"}}>
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
