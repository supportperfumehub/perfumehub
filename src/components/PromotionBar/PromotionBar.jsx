import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Copy, Check } from 'lucide-react';
import api from '../../utils/api_v1_0_2';
import { ShopContext } from '../../context/ShopContext';
import './PromotionBar.css';

const PromotionBar = () => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const { showToast } = useContext(ShopContext) || {};

    const [dbBanners, setDbBanners] = useState(() => {
        try {
            const cached = localStorage.getItem('perfumehub_top_banners');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        return [];
    });
    const [loaded, setLoaded] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);

    useEffect(() => {
        const fetchTopBanners = async () => {
            try {
                const res = await api.get(`/banners?type=top_banner&active=true&_t=${Date.now()}`, {
                    headers: { 'Cache-Control': 'no-cache' }
                });
                if (Array.isArray(res.data)) {
                    setDbBanners(res.data);
                    try {
                        localStorage.setItem('perfumehub_top_banners', JSON.stringify(res.data));
                    } catch (e) {}
                }
            } catch (err) {
                console.warn('Could not fetch dynamic top banners:', err);
            } finally {
                setLoaded(true);
            }
        };

        fetchTopBanners();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50); // Unified threshold with Navbar
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const activeList = dbBanners || [];

    useEffect(() => {
        if (activeList.length <= 1) return;

        const interval = setInterval(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentIndex((prevIndex) => (prevIndex + 1) % activeList.length);
                setIsTransitioning(false);
            }, 500); // Match transition duration
        }, 4000); // Change every 4 seconds

        return () => clearInterval(interval);
    }, [activeList.length]);

    const handleCopyCode = (e, code) => {
        e.preventDefault();
        e.stopPropagation();
        if (!code) return;
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(code);
        }
        setCopiedCode(code);
        if (showToast) {
            showToast(isRTL ? `تم نسخ كود الخصم: ${code}` : `Promo code ${code} copied!`, 'success');
        }
        setTimeout(() => {
            setCopiedCode(null);
        }, 2500);
    };

    // If loaded and no active banners exist, completely hide the top promotion bar
    if (loaded && activeList.length === 0) {
        return null;
    }

    const currentBanner = activeList[currentIndex] || activeList[0];
    if (!currentBanner) return null;

    const bannerText = isRTL 
        ? (currentBanner.title_ar || currentBanner.title_en) 
        : (currentBanner.title_en || currentBanner.title_ar);

    const promoCode = currentBanner.discount_code || currentBanner.promo_code;

    const renderBannerContent = () => (
        <div className="promotion-inner-content">
            {currentBanner.badge && (
                <span className="promotion-badge">
                    {currentBanner.badge}
                </span>
            )}
            {bannerText && <span className="promotion-text">{bannerText}</span>}
            {promoCode && (
                <button
                    type="button"
                    className="promotion-code-badge"
                    onClick={(e) => handleCopyCode(e, promoCode)}
                    title={isRTL ? 'انقر لنسخ كود الخصم' : 'Click to copy promo code'}
                >
                    {copiedCode === promoCode ? (
                        <Check size={12} color="#4ade80" />
                    ) : (
                        <Copy size={11} />
                    )}
                    <span>{promoCode}</span>
                </button>
            )}
        </div>
    );

    const customBarStyle = {
        ...(currentBanner.bg_color ? { backgroundColor: currentBanner.bg_color } : {}),
        ...(currentBanner.text_color ? { color: currentBanner.text_color } : {})
    };

    return (
        <div 
            className={`promotion-bar ${isScrolled ? 'scrolled' : ''}`}
            style={customBarStyle}
        >
            <div className={`promotion-content ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
                {currentBanner.link_url ? (
                    <Link to={currentBanner.link_url} className="promotion-link">
                        {renderBannerContent()}
                    </Link>
                ) : (
                    renderBannerContent()
                )}
            </div>
        </div>
    );
};

export default PromotionBar;
