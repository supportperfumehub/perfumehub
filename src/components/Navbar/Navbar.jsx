import React, { useState, useEffect, useRef, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, Globe, User, Heart, Settings, LogOut, Store, Scan, ChevronDown } from 'lucide-react';
import logo from '../../assets/logo_transparent.webp';
import SearchBar from '../SearchBar/SearchBar';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import { WishlistContext } from '../../context/WishlistContext';
import './Navbar.css';

const Navbar = ({ isRTL, toggleLanguage }) => {
    const { t } = useTranslation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedDropdown, setExpandedDropdown] = useState(null);
    const location = useLocation();
    const { user, isAuthenticated, isAdmin, isVendor, logout } = useContext(AuthContext);
    const { getCartCount } = useContext(CartContext);
    const { wishlistItems } = useContext(WishlistContext);

    // Check if the current route is the home page
    const isHomePage = location.pathname === '/';

    const getUserRoleBadge = () => {
        if (!isAuthenticated || !user) return null;
        const role = (user.role || '').toLowerCase();
        const name = (user.name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();

        if (email === 'supportperfumehub@gmail.com' || role === 'super_admin' || name.includes('super admin')) {
            return 'SA';
        }
        if (role === 'regional_admin' || name.includes('regional admin')) {
            return (user.shop_id || isVendor || user.is_vendor) ? (isRTL ? 'مدير إقليمي / بائع' : 'RA / Vendor') : 'RA';
        }
        if (user.shop_id || role === 'vendor' || isVendor || user.is_vendor || name.includes('vendor')) {
            return isRTL ? 'بائع' : 'Vendor';
        }
        if (role === 'admin') {
            return isRTL ? 'مشرف' : 'Admin';
        }
        return null; // Normal users / customers: profile symbol only!
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            setExpandedDropdown(null);
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileMenuOpen]);

    const handleHomeClick = (e, path) => {
        setIsMobileMenuOpen(false);
        if (path === '/' && location.pathname === '/') {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    };

    const navLinks = [
        { name: t('navbar.home'), path: '/' },
        { name: t('navbar.shop'), path: '/shop' },
        { name: t('navbar.men'), path: '/shop?gender=men' },
        { name: t('navbar.women'), path: '/shop?gender=women' },
        { name: t('navbar.arabic'), path: '/shop?category=arabic' },
        { 
            name: t('navbar.lifestyle', isRTL ? 'أسلوب الحياة والإكسسوارات' : 'Lifestyle & Accessories'), 
            path: '/category/lifestyle',
            hasDropdown: true,
            dropdownItems: [
                { name: isRTL ? 'جميع منتجات أسلوب الحياة' : 'All Lifestyle & Accessories', path: '/category/lifestyle' },
                { name: isRTL ? 'الأزياء الفاخرة' : 'Luxury Fashion', path: '/category/fashion' },
                { name: isRTL ? 'العبايات الراقية' : 'Designer Abayas', path: '/category/abaya' },
                { name: isRTL ? 'المجوهرات والساعات' : 'Jewellery & Watches', path: '/category/jewellery' },
                { name: isRTL ? 'صناديق الهدايا' : 'Curated Gift Boxes', path: '/category/gift-box' }
            ]
        },
        { name: t('navbar.ai_advisor'), path: '/scent-genie' }
    ];

    return (
        <header className={`navbar ${isScrolled || !isHomePage ? 'scrolled' : ''} ${isHomePage && !isScrolled ? 'light-nav' : ''}`}>
            <div className="container navbar-container">

                {/* Mobile Menu Toggle with Permanent Breathing Attention Effect */}
                <button 
                    className={`mobile-toggle ${isMobileMenuOpen ? 'is-open' : 'is-breathing'}`} 
                    onClick={() => setIsMobileMenuOpen(prev => !prev)}
                    aria-label={isMobileMenuOpen ? (isRTL ? 'إغلاق القائمة' : 'Close Menu') : (isRTL ? 'فتح القائمة الرئيسية' : 'Open Main Navigation Menu')}
                    title={isRTL ? 'القائمة الرئيسية' : 'Menu'}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Logo */}
                <Link to="/" className="navbar-logo" onClick={(e) => handleHomeClick(e, '/')}>
                    <img src={logo} alt="PerfumeHub Logo" className="logo-image" />
                </Link>

                {/* Mobile Menu Backdrop (Click outside to close with smooth exit fade) */}
                <div 
                    className={`navbar-backdrop ${isMobileMenuOpen ? 'active' : ''}`} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-hidden={!isMobileMenuOpen}
                ></div>

                {/* Desktop Navigation */}
                <nav className={`navbar-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                    {navLinks.map((link) => {
                        if (link.hasDropdown) {
                            return (
                                <div key={link.name} className={`nav-item-dropdown ${expandedDropdown === link.name ? 'expanded' : ''}`}>
                                    <Link 
                                        to={link.path} 
                                        className="dropdown-toggle-link" 
                                        onClick={(e) => {
                                            if (window.innerWidth <= 1024) {
                                                e.preventDefault();
                                                setExpandedDropdown(prev => prev === link.name ? null : link.name);
                                            } else {
                                                handleHomeClick(e, link.path);
                                            }
                                        }}
                                    >
                                        {link.name}
                                        <ChevronDown size={16} className="dropdown-chevron" />
                                    </Link>
                                    <div className={`dropdown-menu ${expandedDropdown === link.name ? 'mobile-show' : ''}`}>
                                        {link.dropdownItems.map(subItem => (
                                            <Link 
                                                key={subItem.name} 
                                                to={subItem.path} 
                                                className="dropdown-item"
                                                onClick={() => {
                                                    setIsMobileMenuOpen(false);
                                                    setExpandedDropdown(null);
                                                }}
                                            >
                                                {subItem.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <Link key={link.name} to={link.path} onClick={(e) => handleHomeClick(e, link.path)}>
                                {link.name}
                            </Link>
                        );
                    })}
                    
                    {/* Mobile Only Links (Moved from Icons) */}
                    <div className="mobile-only-links">
                        <button className="mobile-nav-link" onClick={toggleLanguage}>
                            <Globe size={18} />
                            <span>{isRTL ? t('navbar.lang_toggle_en') : t('navbar.lang_toggle_ar')}</span>
                        </button>
                        
                        {isAuthenticated ? (
                            <>
                                <Link to="/profile" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                    <User size={18} className="text-gold" />
                                    <span>{t('navbar.my_profile')}</span>
                                </Link>
                                {isAdmin && (
                                    <Link to="/admin" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                        <Settings size={18} />
                                        <span>{t('navbar.admin_dashboard')}</span>
                                    </Link>
                                )}
                                {(isVendor || user?.shop_id || user?.is_vendor || user?.role === 'regional_admin') && (
                                    <Link to="/vendor" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                        <Store size={18} />
                                        <span>{isRTL ? 'لوحة البائع' : 'Vendor Panel'}</span>
                                    </Link>
                                )}
                                {(isVendor || isAdmin) && (
                                    <Link to="/verify" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                        <Scan size={18} />
                                        <span>{isRTL ? 'التحقق من الحجز' : 'Verify Reservation'}</span>
                                    </Link>
                                )}
                                <button className="mobile-nav-link" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                                    <LogOut size={18} />
                                    <span>{t('navbar.logout')}</span>
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                <User size={18} />
                                <span>{t('navbar.login_register')}</span>
                            </Link>
                        )}
                        
                        <Link to="/wishlist" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                            <Heart size={18} />
                            <span>{t('navbar.wishlist')} ({wishlistItems.length})</span>
                        </Link>
                    </div>
                </nav>

                <div className="navbar-icons">
                    <SearchBar isRTL={isRTL} />

                    <div className="hide-mobile icons-row">
                        {/* User Profile / Login (Desktop Only) */}
                        <div className="user-access">
                            {isAuthenticated ? (
                                (() => {
                                    const roleBadge = getUserRoleBadge();
                                    return (
                                        <Link to="/profile" className="icon-btn profile-nav-item" title={user?.name || (isRTL ? 'حسابي' : 'Profile')}>
                                            <User size={20} className={roleBadge ? "text-gold" : ""} />
                                            {roleBadge && <span className="user-nav-name role-badge">{roleBadge}</span>}
                                        </Link>
                                    );
                                })()
                            ) : (
                                <Link to="/login" className="icon-btn" title={isRTL ? 'تسجيل الدخول' : 'Login'}>
                                    <User size={20} />
                                </Link>
                            )}
                        </div>

                        <button className="icon-btn lang-toggle" onClick={toggleLanguage} title={isRTL ? 'English' : 'عربي'}>
                            <Globe size={20} />
                            <span className="lang-text">{isRTL ? 'EN' : 'AR'}</span>
                        </button>
                        
                        {/* Desktop Only Icons (Profile is already handled above) */}
                        {isAuthenticated && (
                            <button className="icon-btn" onClick={logout} title={isRTL ? 'تسجيل الخروج' : 'Logout'}>
                                <LogOut size={20} />
                            </button>
                        )}

                        {isAdmin && (
                            <Link to="/admin" className="icon-btn" title={t('navbar.admin')}>
                                <Settings size={20} />
                            </Link>
                        )}
                        {(isVendor || user?.shop_id || user?.is_vendor || user?.role === 'regional_admin') && (
                            <Link to="/vendor" className="icon-btn" title={isRTL ? 'لوحة البائع' : 'Vendor Panel'}>
                                <Store size={20} />
                            </Link>
                        )}
                        {(isVendor || isAdmin) && (
                            <Link to="/verify" className="icon-btn" title={isRTL ? 'التحقق من الحجز' : 'Verify Reservation'}>
                                <Scan size={20} />
                            </Link>
                        )}
                        
                        <Link to="/wishlist" className="icon-btn" title={t('navbar.wishlist')} style={{ position: 'relative' }}>
                            <Heart size={20} />
                            {wishlistItems.length > 0 && <span className="cart-count">{wishlistItems.length}</span>}
                        </Link>
                    </div>

                    <Link to="/cart" className="icon-btn cart-btn" title="Cart" style={{ position: 'relative' }}>
                        <ShoppingBag size={20} />
                        {getCartCount() > 0 && <span className="cart-count">{getCartCount()}</span>}
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
