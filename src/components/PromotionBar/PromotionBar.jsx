import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './PromotionBar.css';

const PromotionBar = () => {
    const { t } = useTranslation();
    const coupons = useMemo(() => [
        t('promotion.welcome'),
        t('promotion.delivery', { currency: t('common.currency') }),
        t('promotion.golden')
    ], [t]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50); // Unified threshold with Navbar
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentIndex((prevIndex) => (prevIndex + 1) % coupons.length);
                setIsTransitioning(false);
            }, 500); // Match transition duration
        }, 4000); // Change every 4 seconds

        return () => clearInterval(interval);
    }, [coupons.length]);

    return (
        <div className={`promotion-bar ${isScrolled ? 'scrolled' : ''}`}>
            <div className={`promotion-content ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
                <p>{coupons[currentIndex]}</p>
            </div>
        </div>
    );
};

export default PromotionBar;
