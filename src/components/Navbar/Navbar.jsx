import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, Globe, User, Heart, Settings, LogOut, Store } from 'lucide-react';
import logo from '../../assets/logo_transparent.png';
import SearchBar from '../SearchBar/SearchBar';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import { WishlistContext } from '../../context/WishlistContext';
import './Navbar.css';

const Navbar = ({ isRTL, toggleLanguage }) => {
    const { t } = useTranslation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const { user, isAuthenticated, isAdmin, isVendor, logout } = useContext(AuthContext);
    const { getCartCount } = useContext(CartContext);
    const { wishlistItems } = useContext(WishlistContext);

    // Check if the current route is the home page
    const isHomePage = location.pathname === '/';

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
        { name: t('navbar.men'), path: '/category/men' },
        { name: t('navbar.women'), path: '/category/women' },
        { name: t('navbar.arabic'), path: '/category/arabic' },
        { name: t('navbar.ai_advisor'), path: '/ai-advisor' }
    ];

    return (
        <header className={`navbar ${isScrolled || !isHomePage ? 'scrolled' : ''} ${isHomePage && !isScrolled ? 'light-nav' : ''}`}>
            <div className="container navbar-container">

                {/* Mobile Menu Toggle */}
                <button className="mobile-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Logo */}
                <Link to="/" className="navbar-logo" onClick={(e) => handleHomeClick(e, '/')}>
                    <img src={logo} alt="PerfumeHub Logo" className="logo-image" />
                </Link>

                {/* Mobile Menu Backdrop (Click outside to close) */}
                {isMobileMenuOpen && (
                    <div className="navbar-backdrop" onClick={() => setIsMobileMenuOpen(false)}></div>
                )}

                {/* Desktop Navigation */}
                <nav className={`navbar-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                    {navLinks.map((link) => (
                        <Link key={link.name} to={link.path} onClick={(e) => handleHomeClick(e, link.path)}>
                            {link.name}
                        </Link>
                    ))}
                    
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
                                {isVendor && (
                                    <Link to="/vendor" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                                        <Store size={18} />
                                        <span>{isRTL ? 'لوحة البائع' : 'Vendor Panel'}</span>
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

                {/* Icons and Search */}
                <div className="navbar-icons">
                    <SearchBar isRTL={isRTL} />
                    
                    {/* User Profile / Login (Mobile & Desktop) */}
                    <div className="user-access">
                        {isAuthenticated ? (
                            <Link to="/profile" className="icon-btn profile-nav-item" title={isRTL ? 'حسابي' : 'Profile'}>
                                <User size={20} className="text-gold" />
                                <span className="user-nav-name">{user?.name || (isRTL ? 'حسابي' : 'Profile')}</span>
                            </Link>
                        ) : (
                            <Link to="/login" className="icon-btn" title={isRTL ? 'تسجيل الدخول' : 'Login'}>
                                <User size={20} />
                            </Link>
                        )}
                    </div>

                    <div className="hide-mobile icons-row">
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
                        {isVendor && (
                            <Link to="/vendor" className="icon-btn" title={isRTL ? 'لوحة البائع' : 'Vendor Panel'}>
                                <Store size={20} />
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
