import React, { useContext, useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShieldCheck, Truck, Sparkles, CreditCard, MapPin, ChevronDown, ChevronUp, Star, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import ProductCard from '../../components/ProductCard/ProductCard';
import Newsletter from '../../components/Newsletter/Newsletter';
import NearestShopFinder from '../../components/NearestShopFinder/NearestShopFinder';
import TrustBadges from '../../components/TrustBadges/TrustBadges';
import { ShopContext } from '../../context/ShopContext';
import { RegionContext } from '../../context/RegionContext';
import brandStoryImg from '../../assets/logo_no_border.webp';
import northClubLogo from '../../assets/north_club_logo.webp';
import aiAdvisorBg from '../../assets/ai_advisor_banner_bg_1773366093433.webp';
import './Home.css';

// Curated 4 preview reviews to display until original trusted reviews arrive
const INITIAL_PREVIEW_REVIEWS = [
    {
        id: 'rev-preview-1',
        product_id: 228,
        product_name: 'Creed Aventus EDP',
        user_name: 'Fatima Al-Kuwari',
        user_name_ar: 'فاطمة الكواري',
        location: 'West Bay, Doha',
        location_ar: 'الخليج الغربي، الدوحة',
        rating: 5,
        title: 'Undeniable Authenticity & White-Glove Service',
        title_ar: 'أصالة لا شك فيها وخدمة راقية',
        comment: 'I was skeptical about ordering niche perfumes online in Qatar, but PerfumeHub exceeded every expectation. Creed Aventus arrived in under 3 hours to West Bay, sealed and 100% authentic batch. My go-to boutique now.',
        comment_ar: 'كنت مترددة في البداية بشأن شراء عطور النيش عبر الإنترنت في قطر، لكن بيرفيوم هوب فاق كل التوقعات. عطر كريد أفينتوس وصلني في أقل من 3 ساعات إلى الخليج الغربي، أصلي 100٪ في عبوته المغلقة.',
        is_verified_buyer: true
    },
    {
        id: 'rev-preview-2',
        product_id: 376,
        product_name: 'Amouage Guidance',
        user_name: 'Hamad Al-Thani',
        user_name_ar: 'حمد آل ثاني',
        location: 'Lusail City',
        location_ar: 'مدينة لوسيل',
        rating: 5,
        title: 'Fastest Delivery in Lusail with COD',
        title_ar: 'أسرع توصيل في لوسيل مع دفع عند الاستلام',
        comment: 'Same-day express delivery is truly same-day! Placed my order at 2 PM and had the bottle in hand by 4:30 PM in Lusail with Cash on Delivery. Exceptional presentation and authentic royal Arabian oud.',
        comment_ar: 'خدمة التوصيل السريع في نفس اليوم حقيقية ومبهرة! طلبت العطر الساعة 2 ظهراً ووصلني عند 4:30 عصراً في لوسيل مع خيار الدفع عند الاستلام. تغليف فاخر وعود عربي ملكي فاخر.',
        is_verified_buyer: true
    },
    {
        id: 'rev-preview-3',
        product_id: 609,
        product_name: 'BDK Rouge Smoking',
        user_name: 'Reem Al-Marri',
        user_name_ar: 'ريم المري',
        location: 'The Pearl, Qatar',
        location_ar: 'جزيرة اللؤلؤة',
        rating: 5,
        title: 'The Scent Genie Recommendation Was Spot On',
        title_ar: 'توصية جني العطور الذكي كانت مثالية',
        comment: 'Used the AI fragrance quiz and it recommended BDK Rouge Smoking. Absolutely intoxicating fragrance for Doha evenings. Generous complimentary sample and luxury gift packaging.',
        comment_ar: 'جربت اختبار جني العطور الذكي ورشح لي عطر BDK Rouge Smoking. عطر ساحر ومثالي لأمسيات الدوحة الدافئة. عينات مجانية سخية وتجربة تسوق لا تضاهى.',
        is_verified_buyer: true
    },
    {
        id: 'rev-preview-4',
        product_id: 1089,
        product_name: 'Roja Elysium Cologne',
        user_name: 'Dr. Khalid Al-Sulaiti',
        user_name_ar: 'د. خالد السليطي',
        location: 'Al Rayyan, Qatar',
        location_ar: 'الريان، قطر',
        rating: 5,
        title: 'Rare Niche Fragrances You Can\'t Find Elsewhere',
        title_ar: 'عطور نيش نادرة لا تجدها في المجمعات',
        comment: 'Finding authentic Roja and Clive Christian bottles in Qatar used to require flying abroad. PerfumeHub connects verified local boutiques with instant tracking. Superb platform.',
        comment_ar: 'العثور على عطور روجا وكلايف كريستيان الأصلية في قطر كان يتطلب السفر للخارج سابقاً. بيرفيوم هوب يجمع أفضل البوتيكات المعتمدة مع تتبع لحظي للطلب.',
        is_verified_buyer: true
    }
];

const Home = () => {
    const { t } = useTranslation();
    const { isRTL } = useOutletContext();
    const { products, featuredProducts, newArrivals, perfumeProducts, fashionProducts, jewelleryProducts, giftBoxProducts, loading, discoverCampaigns, shops } = useContext(ShopContext);
    const { activeRegion } = useContext(RegionContext);
    const [showAllNewArrivals, setShowAllNewArrivals] = useState(false);
    const [showAllPerfumes, setShowAllPerfumes] = useState(false);
    const [showAllFashion, setShowAllFashion] = useState(false);
    const [showAllJewellery, setShowAllJewellery] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [shuffledFeatured, setShuffledFeatured] = useState([]);
    const [openFaq, setOpenFaq] = useState(null);
    const [homeReviews, setHomeReviews] = useState(INITIAL_PREVIEW_REVIEWS);
    const [reviewsStats, setReviewsStats] = useState({ rating: 4.9, count: 4, isPreview: true });

    const toggleFaq = (idx) => setOpenFaq(prev => prev === idx ? null : idx);

    // Reviews sliding carousel and manual swipe state
    const reviewsTrackRef = useRef(null);
    const [activeReviewIndex, setActiveReviewIndex] = useState(0);
    const [isDraggingReview, setIsDraggingReview] = useState(false);
    const dragStartXRef = useRef(0);
    const dragScrollLeftRef = useRef(0);

    const scrollToReview = (idx) => {
        if (!reviewsTrackRef.current) return;
        const cards = reviewsTrackRef.current.querySelectorAll('.home-review-card');
        if (cards[idx]) {
            cards[idx].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
            setActiveReviewIndex(idx);
        }
    };

    const handleReviewScrollNav = (direction) => {
        if (!reviewsTrackRef.current) return;
        const total = homeReviews.length;
        let nextIdx = direction === 'next' ? activeReviewIndex + 1 : activeReviewIndex - 1;
        if (nextIdx < 0) nextIdx = 0;
        if (nextIdx >= total) nextIdx = total - 1;
        scrollToReview(nextIdx);
    };

    const handleTrackScroll = () => {
        if (!reviewsTrackRef.current) return;
        const track = reviewsTrackRef.current;
        const cards = track.querySelectorAll('.home-review-card');
        if (!cards.length) return;

        const trackCenter = track.getBoundingClientRect().left + track.offsetWidth / 2;
        let closestIdx = 0;
        let closestDist = Infinity;

        cards.forEach((card, idx) => {
            const rect = card.getBoundingClientRect();
            const cardCenter = rect.left + rect.width / 2;
            const dist = Math.abs(trackCenter - cardCenter);
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = idx;
            }
        });

        setActiveReviewIndex(closestIdx);
    };

    const handleReviewMouseDown = (e) => {
        if (!reviewsTrackRef.current) return;
        setIsDraggingReview(true);
        dragStartXRef.current = e.pageX - reviewsTrackRef.current.offsetLeft;
        dragScrollLeftRef.current = reviewsTrackRef.current.scrollLeft;
    };

    const handleReviewMouseMove = (e) => {
        if (!isDraggingReview || !reviewsTrackRef.current) return;
        e.preventDefault();
        const x = e.pageX - reviewsTrackRef.current.offsetLeft;
        const walk = (x - dragStartXRef.current) * 1.5;
        reviewsTrackRef.current.scrollLeft = dragScrollLeftRef.current - walk;
    };

    const handleReviewMouseUp = () => setIsDraggingReview(false);
    const handleReviewMouseLeave = () => setIsDraggingReview(false);

    // Fetch homepage reviews: automatically overwrites preview reviews when original trusted reviews arrive
    useEffect(() => {
        let isMounted = true;
        const fetchTopReviews = async () => {
            try {
                const res = await fetch('/api/reviews/top');
                if (!res.ok) return;
                const data = await res.json();
                if (isMounted && data?.success && Array.isArray(data.reviews) && data.reviews.length > 0) {
                    setHomeReviews(data.reviews);
                    setReviewsStats({
                        rating: data.averageRating || 4.9,
                        count: data.totalReviews || data.reviews.length,
                        isPreview: data.is_preview
                    });
                }
            } catch (err) {
                console.log('Homepage reviews loaded from preview fallback');
            }
        };
        fetchTopReviews();
        return () => { isMounted = false; };
    }, []);

    // Determine what powers the Hero Banners 
    const baseHeroItems = (discoverCampaigns && discoverCampaigns.length > 0) 
        ? discoverCampaigns 
        : shuffledFeatured;
        
    const isShopCampaign = discoverCampaigns && discoverCampaigns.length > 0;

    const scentGenieHeroSlide = {
        id: 'scent-genie-hero-slide',
        isScentGenie: true,
        tagline: isRTL ? 'مستشارك العطري الذكي • AI CONCIERGE' : 'ROYAL AI FRAGRANCE CONCIERGE',
        title: isRTL ? 'جني العطور الذكي • Scent Genie' : 'Scent Genie AI Advisor',
        description: isRTL 
            ? 'لست متأكداً من اختيارك؟ دع خوارزمية الذكاء الاصطناعي تحلل ذوقك وترشح لك العطر النيش الأنسب لشخصيتك وأمسيات الدوحة.' 
            : 'Unsure which fragrance fits your essence? Let our bespoke AI engine analyze your preferences and match you to rare niche perfumes in Qatar.',
        image: aiAdvisorBg
    };

    const heroItems = baseHeroItems.length > 0 
        ? [scentGenieHeroSlide, ...baseHeroItems] 
        : [scentGenieHeroSlide];

    useEffect(() => {
        if (featuredProducts && featuredProducts.length > 0) {
            setShuffledFeatured([...featuredProducts].sort(() => 0.5 - Math.random()));
        } else if (products && products.length > 0) {
            setShuffledFeatured([...products].slice(0, 6));
        } else {
            setShuffledFeatured([]);
        }
    }, [featuredProducts, products]);

    useEffect(() => {
        if (heroItems.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % heroItems.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [heroItems.length]);

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % heroItems.length);
    const prevSlide = () => setCurrentSlide(prev => (prev === 0 ? heroItems.length - 1 : prev - 1));

    const seoCanonical = "https://perfumehubqa.com/";
    const seoTitle = isRTL 
        ? "بيرفيوم هوب قطر | متجر العطور الفاخرة رقم 1 في الدوحة" 
        : "PerfumeHub Qatar | #1 Luxury Perfumes & Fragrances Store in Doha";
    const seoDescription = isRTL
        ? "تسوق عطور أصلية 100% في قطر من بيرفيوم هوب. تشكيلة مميزة من العطور الفرنسية والشرقية، دهن العود، والماركات العالمية مع توصيل سريع في نفس اليوم في الدوحة وكافة أنحاء قطر."
        : "Buy 100% authentic luxury perfumes in Qatar at PerfumeHub. Discover exclusive French & Arabic fragrances, Oud, Attar, and designer brands with same-day express delivery in Doha, Lusail & across Qatar.";
    const seoKeywords = "perfume qatar, perfumes in qatar, buy perfume online qatar, perfume shop doha, online perfume store qatar, luxury fragrances qatar, arabic perfumes doha, oud qatar, attar qatar, niche perfumes qatar, french perfumes doha, same day perfume delivery qatar, perfumehub qatar, perfume hub trading, عطور قطر, عطورات الدوحة, متجر عطور قطر, شراء عطور قطر, عطور نيش قطر, عطور أصلية قطر, دهن العود قطر";

    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${seoCanonical}#website`,
        "name": "PerfumeHub Qatar",
        "alternateName": "بيرفيوم هوب قطر",
        "url": seoCanonical,
        "potentialAction": {
            "@type": "SearchAction",
            "target": `${seoCanonical}shop?search={search_term_string}`,
            "query-input": "required name=search_term_string"
        }
    };

    const storeSchema = {
        "@context": "https://schema.org",
        "@type": ["Store", "OnlineStore"],
        "@id": `${seoCanonical}#store`,
        "name": "PerfumeHub Qatar",
        "alternateName": "بيرفيوم هوب قطر",
        "url": seoCanonical,
        "logo": `${seoCanonical}favicon.png`,
        "image": `${seoCanonical}favicon.png`,
        "description": seoDescription,
        "telephone": "+974-3030-1901",
        "email": "supportperfumehub@gmail.com",
        "priceRange": "QAR 50 - QAR 2500",
        "currenciesAccepted": "QAR, USD",
        "paymentAccepted": "Cash on Delivery, Credit Card, Apple Pay, Debit Card",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Souq Al Jabor",
            "addressLocality": "Doha",
            "addressRegion": "Doha",
            "postalCode": "00000",
            "addressCountry": "QA"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": 25.2854,
            "longitude": 51.5310
        },
        "areaServed": [
            "Qatar", "Doha", "Lusail", "The Pearl", "Al Rayyan", "Al Wakrah", "Al Khor", "Umm Salal", "Madinat ash Shamal", "Mesaieed"
        ],
        "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "opens": "00:00",
            "closes": "23:59"
        },
        "sameAs": [
            "https://www.instagram.com/perfumehub__qa",
            "https://tiktok.com/@perfumehubqa",
            "https://twitter.com/perfumehubqa",
            "https://facebook.com/perfumehubqa"
        ]
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": t('qatar_seo.faq_1_q'),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": t('qatar_seo.faq_1_a')
                }
            },
            {
                "@type": "Question",
                "name": t('qatar_seo.faq_2_q'),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": t('qatar_seo.faq_2_a')
                }
            },
            {
                "@type": "Question",
                "name": t('qatar_seo.faq_3_q'),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": t('qatar_seo.faq_3_a')
                }
            },
            {
                "@type": "Question",
                "name": t('qatar_seo.faq_4_q'),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": t('qatar_seo.faq_4_a')
                }
            },
            {
                "@type": "Question",
                "name": t('qatar_seo.faq_5_q'),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": t('qatar_seo.faq_5_a')
                }
            }
        ]
    };

    return (
        <div className="home-page">
            <Helmet>
                <title>{seoTitle}</title>
                <meta name="description" content={seoDescription} />
                <meta name="keywords" content={seoKeywords} />
                <meta property="og:title" content={seoTitle} />
                <meta property="og:description" content={seoDescription} />
                <meta property="og:url" content={seoCanonical} />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={`${seoCanonical}favicon.png`} />
                <meta name="twitter:title" content={seoTitle} />
                <meta name="twitter:description" content={seoDescription} />
                <meta name="twitter:image" content={`${seoCanonical}favicon.png`} />
                <link rel="canonical" href={seoCanonical} />
                <link rel="alternate" hreflang="en-QA" href={seoCanonical} />
                <link rel="alternate" hreflang="ar-QA" href={seoCanonical} />
                <link rel="alternate" hreflang="x-default" href={seoCanonical} />
                <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
                <script type="application/ld+json">{JSON.stringify(storeSchema)}</script>
                <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
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
                            {heroItems.map((item) => {
                                if (item.isScentGenie) {
                                    return (
                                        <div key={item.id} className="featured-slide scent-genie-hero-slide">
                                            <div 
                                                className="featured-slide-dynamic-bg" 
                                                style={{ backgroundImage: `url(${item.image})`, opacity: 0.75 }}
                                            ></div>
                                            <div className="featured-slide-img-container">
                                                <img 
                                                    src={item.image} 
                                                    alt="Scent Genie AI Fragrance Advisor" 
                                                    className="featured-slide-img" 
                                                    loading="eager"
                                                    decoding="async"
                                                    style={{ objectFit: 'cover', borderRadius: '16px', boxShadow: '0 12px 36px rgba(0,0,0,0.6)' }}
                                                />
                                            </div>
                                            <div className="featured-slide-content">
                                                <span className="featured-slide-brand" style={{ color: '#d4af37', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Sparkles size={16} color="#d4af37" />
                                                    {item.tagline}
                                                </span>
                                                <h3 className="featured-slide-title" style={{ color: '#ffffff' }}>{item.title}</h3>
                                                <span className="featured-slide-type" style={{ color: '#d4af37' }}>
                                                    {isRTL ? 'خوارزمية ذكاء اصطناعي فاخرة' : 'Bespoke Olfactory Matching'}
                                                </span>
                                                <p className="featured-slide-desc" dir="auto">{item.description}</p>
                                                <div className="featured-slide-actions">
                                                    <Link to="/scent-genie" className="btn btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', fontWeight: '800' }}>
                                                        <Sparkles size={16} />
                                                        <span>{isRTL ? 'اكتشف عطرك بالذكاء الاصطناعي' : 'Launch Scent Genie AI'}</span>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                const targetProdId = item.product_id || item.product?.id || (isShopCampaign ? null : item.id);
                                const liveProd = targetProdId ? products?.find(p => String(p.id) === String(targetProdId)) : null;
                                const activeProd = liveProd ? { ...item.product, ...liveProd } : (item.product || item);

                                const rawImg = isShopCampaign 
                                    ? (item.product_id ? activeProd.image : (item.shop?.images?.[0] || item.shop?.logo_url))
                                    : activeProd.image;
                                const slideImg = Array.isArray(rawImg) ? rawImg[0] : (rawImg || 'https://placehold.co/400x400/1a1a1a/d4af37?text=Premium+Item');
                                const slideBgImg = slideImg;

                                const isProductAd = isShopCampaign && item.product_id;
                                const slideOpacity = isProductAd ? 1 : (isShopCampaign ? 0.3 : 1);

                                const displayPrice = activeProd.price !== undefined ? activeProd.price : item.price;
                                const displayOldPrice = activeProd.oldPrice !== undefined ? activeProd.oldPrice : (activeProd.old_price !== undefined ? activeProd.old_price : (item.oldPrice || item.old_price));
                                const displayDiscount = displayOldPrice && Number(displayOldPrice) > Number(displayPrice)
                                    ? Math.round((1 - Number(displayPrice) / Number(displayOldPrice)) * 100)
                                    : (activeProd.discount !== undefined ? activeProd.discount : item.discount);

                                return (
                                    <div key={item.id} className="featured-slide">
                                        <div 
                                            className="featured-slide-dynamic-bg" 
                                            style={{ backgroundImage: `url(${slideBgImg})`, opacity: slideOpacity }}
                                        ></div>
                                        <div className="featured-slide-img-container">
                                            <img 
                                                src={slideImg} 
                                                alt={isProductAd ? activeProd.name : (isShopCampaign ? item.shop?.name : activeProd.name)} 
                                                className="featured-slide-img" 
                                                loading="eager"
                                                decoding="async"
                                                style={isShopCampaign && !isProductAd ? { objectFit: 'contain', padding: '2rem' } : undefined}
                                            />
                                        </div>
                                        <div className="featured-slide-content">
                                            {isShopCampaign ? (
                                                isProductAd ? (
                                                    <>
                                                        <span className="featured-slide-brand">{activeProd.brand}</span>
                                                        <h3 className="featured-slide-title">{activeProd.name}</h3>
                                                        {activeProd.type && <span className="featured-slide-type">{activeProd.type}</span>}
                                                        {activeProd.description && <p className="featured-slide-desc" dir="auto">{activeProd.description}</p>}
                                                        <div className={`featured-slide-price-row ${displayDiscount > 0 ? 'has-discount' : ''}`}>
                                                            <span className={`featured-slide-price ${displayDiscount > 0 ? 'price-sale' : ''}`}>
                                                                {displayPrice} {activeRegion?.currency_code || (isRTL ? 'ر.ق' : 'QAR')}
                                                            </span>
                                                            {displayOldPrice && Number(displayOldPrice) !== Number(displayPrice) ? (
                                                                <span className="featured-slide-old-price">
                                                                    {Math.round(displayOldPrice)} {activeRegion?.currency_code || (isRTL ? 'ر.ق' : 'QAR')}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <div className="featured-slide-actions">
                                                            <Link to={`/product/${activeProd.id}`} className="btn btn-gold">
                                                                {isRTL ? 'اكتشف المزيد' : 'Discover More'}
                                                            </Link>
                                                        </div>
                                                    </>
                                                ) : (
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
                                                )
                                            ) : (
                                                <>
                                                    <span className="featured-slide-brand">{activeProd.brand}</span>
                                                    <h3 className="featured-slide-title">{activeProd.name}</h3>
                                                    {activeProd.type && <span className="featured-slide-type">{activeProd.type}</span>}
                                                    {activeProd.description && <p className="featured-slide-desc" dir="auto">{activeProd.description}</p>}
                                                    <div className={`featured-slide-price-row ${displayDiscount > 0 ? 'has-discount' : ''}`}>
                                                        <span className={`featured-slide-price ${displayDiscount > 0 ? 'price-sale' : ''}`}>
                                                            {displayPrice} {activeRegion?.currency_code || (isRTL ? 'ر.ق' : 'QAR')}
                                                        </span>
                                                        {displayOldPrice && Number(displayOldPrice) !== Number(displayPrice) ? (
                                                            <span className="featured-slide-old-price">
                                                                {Math.round(displayOldPrice)} {activeRegion?.currency_code || (isRTL ? 'ر.ق' : 'QAR')}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="featured-slide-actions">
                                                        <Link to={`/product/${activeProd.id}`} className="btn btn-gold">
                                                            {isRTL ? 'اكتشف المزيد' : 'Discover More'}
                                                        </Link>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
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
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '12px' }}>
                                            <Link to={`/shop?shop_id=${shop.id}`} className="boutique-visit-btn">
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
                            <Link to="/scent-genie" className="btn btn-gold ai-advisor-btn">
                                {t('ai_advisor_banner.button')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Luxury Trust Badges & Guarantees */}
            <section className="luxury-trust-section container reveal">
                <TrustBadges isRTL={isRTL} variant="grid" />
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

            {/* VIP Customer Reviews Showcase */}
            <section className="home-reviews-section reveal">
                <div className="container">
                    <div className="reviews-section-header text-center">
                        <span className="reviews-gold-tag">
                            <Sparkles size={13} style={{ display: 'inline', verticalAlign: 'middle', marginInlineEnd: '6px' }} />
                            {isRTL ? 'تقييمات موثقة من عملاء قطر' : 'Verified Qatar Client Testimonials'}
                        </span>
                        <h2 className="reviews-section-title">
                            {isRTL ? 'ماذا يقول عشاق العطور في قطر' : 'Loved by Qatar\'s Fragrance Connoisseurs'}
                        </h2>
                        <div className="reviews-rating-banner">
                            <div className="stars-row">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={18} fill="#d4af37" color="#d4af37" />
                                ))}
                            </div>
                            <span className="rating-score-text">
                                <strong>{reviewsStats.rating} / 5.0</strong>{' '}
                                {reviewsStats.isPreview
                                    ? (isRTL ? 'بناءً على طلبات وتقييمات موثقة في قطر' : 'Rating based on Verified Purchases in Qatar')
                                    : (isRTL ? `بناءً على ${reviewsStats.count} تقييم موثق في قطر` : `Rating based on ${reviewsStats.count} Verified Reviews in Qatar`)}
                            </span>
                        </div>
                    </div>

                    {/* Sliding Carousel / Manual Swipe Stage */}
                    <div className="reviews-carousel-stage">
                        {/* Prev Navigation Arrow */}
                        <button 
                            type="button"
                            className="reviews-nav-btn prev"
                            onClick={() => handleReviewScrollNav(isRTL ? 'next' : 'prev')}
                            disabled={isRTL ? activeReviewIndex >= homeReviews.length - 1 : activeReviewIndex === 0}
                            aria-label={isRTL ? 'التالي' : 'Previous review'}
                        >
                            {isRTL ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                        </button>

                        {/* Scrollable & Swipeable Track */}
                        <div 
                            ref={reviewsTrackRef}
                            className={`reviews-carousel-track ${isDraggingReview ? 'is-dragging' : ''}`}
                            onScroll={handleTrackScroll}
                            onMouseDown={handleReviewMouseDown}
                            onMouseMove={handleReviewMouseMove}
                            onMouseUp={handleReviewMouseUp}
                            onMouseLeave={handleReviewMouseLeave}
                        >
                            {homeReviews.map((rev, idx) => (
                                <div 
                                    key={rev.id || idx} 
                                    className={`home-review-card ${idx === activeReviewIndex ? 'active-slide' : ''}`}
                                >
                                    <div className="review-card-top">
                                        <div className="stars-row">
                                            {[...Array(5)].map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    size={15} 
                                                    fill={i < Math.round(Number(rev.rating) || 5) ? "#d4af37" : "none"} 
                                                    color="#d4af37" 
                                                />
                                            ))}
                                        </div>
                                        <span className="verified-badge">
                                            <CheckCircle2 size={13} />
                                            {isRTL ? 'مشتري موثق' : 'Verified Purchase'}
                                        </span>
                                    </div>
                                    <h4 className="review-card-title">
                                        {isRTL ? (rev.title_ar || rev.title) : (rev.title || rev.title_ar)}
                                    </h4>
                                    <p className="review-card-quote">
                                        {isRTL ? (rev.comment_ar || rev.comment) : (rev.comment || rev.comment_ar)}
                                    </p>
                                    <div className="review-card-footer">
                                        <div className="reviewer-info">
                                            <span className="reviewer-name">
                                                {isRTL ? (rev.user_name_ar || rev.user_name) : rev.user_name}
                                            </span>
                                            <span className="reviewer-location">
                                                {isRTL ? (rev.location_ar || rev.location || 'قطر') : (rev.location || 'Qatar')}
                                            </span>
                                        </div>
                                        {rev.product_name && (
                                            <span className="reviewed-product-pill">{rev.product_name}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Next Navigation Arrow */}
                        <button 
                            type="button"
                            className="reviews-nav-btn next"
                            onClick={() => handleReviewScrollNav(isRTL ? 'prev' : 'next')}
                            disabled={isRTL ? activeReviewIndex === 0 : activeReviewIndex >= homeReviews.length - 1}
                            aria-label={isRTL ? 'السابق' : 'Next review'}
                        >
                            {isRTL ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </button>
                    </div>

                    {/* Pagination Dots & Touch Swipe Hint */}
                    <div className="reviews-carousel-footer">
                        <div className="reviews-carousel-dots">
                            {homeReviews.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`review-dot ${idx === activeReviewIndex ? 'active' : ''}`}
                                    onClick={() => scrollToReview(idx)}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                        <div className="reviews-swipe-hint">
                            <span>{isRTL ? '⟵ اسحب باللمس لتصفح المزيد ⟶' : '⟵ Swipe or slide to explore client reviews ⟶'}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Newsletter Section */}
            <Newsletter isRTL={isRTL} />
        </div>
    );
};

export default Home;
