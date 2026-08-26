import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../../utils/api_v1_0_2';
import './PromotionBar.css';

const PromotionBar = () => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    const defaultCoupons = useMemo(() => [
        { 
            title_en: 'Welcome to PerfumeHub - Luxury Arabian & French Scents', 
            title_ar: 'مرحباً بكم في بيرفيوم هاب - أفخم العطور الشرقية والفرنسية', 
            link_url: '/shop' 
        }
    ], []);

    const [dbBanners, setDbBanners] = useState(() => {
        try {
            const cached = localStorage.getItem('perfumehub_top_banners');
            if (cached) return JSON.parse(cached);
        } catch (e) {}
        return [];
    });
    const [loaded, setLoaded] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const fetchTopBanners = async () => {
            try {
                const res = await api.get('/banners?type=top_banner&active=true');
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

    const activeList = loaded ? dbBanners : defaultCoupons;

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

    // If loaded and no active banners exist, completely hide the top promotion bar
    if (loaded && activeList.length === 0) {
        return null;
    }

    const currentBanner = activeList[currentIndex] || activeList[0];
    if (!currentBanner) return null;

    const bannerText = isRTL 
        ? (currentBanner.title_ar || currentBanner.title_en) 
        : (currentBanner.title_en || currentBanner.title_ar);

    return (
        <div className={`promotion-bar ${isScrolled ? 'scrolled' : ''}`}>
            <div className={`promotion-content ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
                {currentBanner.link_url ? (
                    <Link to={currentBanner.link_url} style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {currentBanner.badge && (
                            <span style={{ background: 'rgba(200, 169, 81, 0.25)', border: '1px solid #c8a951', color: '#facc15', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                                {currentBanner.badge}
                            </span>
                        )}
                        <p style={{ margin: 0 }}>{bannerText}</p>
                    </Link>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {currentBanner.badge && (
                            <span style={{ background: 'rgba(200, 169, 81, 0.25)', border: '1px solid #c8a951', color: '#facc15', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                                {currentBanner.badge}
                            </span>
                        )}
                        <p style={{ margin: 0 }}>{bannerText}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromotionBar;
