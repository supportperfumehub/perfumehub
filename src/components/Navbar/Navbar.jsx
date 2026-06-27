import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, Globe, User, Heart, Settings, LogOut, Store, Scan, ChevronDown } from 'lucide-react';
import logo from '../../assets/logo_transparent.webp';
import SearchBar from '../SearchBar/SearchBar';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import { WishlistContext } from '../../context/WishlistContext';
import { RegionContext } from '../../context/RegionContext';
import './Navbar.css';

const getFlagUrl = (code) => {
    if (!code) return '';
    return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
};

const Navbar = ({ isRTL, toggleLanguage }) => {
    const { t } = useTranslation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedDropdown, setExpandedDropdown] = useState(null);
    const location = useLocation();
    const { user, isAuthenticated, isAdmin, isVendor, logout } = useContext(AuthContext);
    const { getCartCount } = useContext(CartContext);
    const { wishlistItems } = useContext(WishlistContext);
    const { regions, activeRegion, changeRegion } = useContext(RegionContext);
    const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);

    // Check if the current route is the home page
    const isHomePage = location.pathname === '/';

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleDocumentClick = () => {
            setIsRegionMenuOpen(false);
        };
        document.addEventListener('click', handleDocumentClick);
        return () => {
            document.removeEventListener('click', handleDocumentClick);
        };
    }, []);

    useEffect(() => {
        if (!isMobileMenuOpen) {
            setExpandedDropdown(null);
        }
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
        { 
            name: t('navbar.men'), 
            path: '/category/fashion',
            hasDropdown: true,
            dropdownItems: [
                { name: t('navbar.all_fashion'), path: '/category/fashion' },
                { name: t('navbar.abaya'), path: '/category/abaya' }
            ]
        },
        { name: t('navbar.women'), path: '/category/jewellery' },
        { name: t('navbar.arabic'), path: '/category/gift-box' },
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
                                {(isVendor || user?.role === 'regional_admin') && (
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

                    {activeRegion && (
                        <div className="region-selector-dropdown-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <button 
                                className="icon-btn" 
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px', fontSize: '0.9rem', cursor: 'pointer', height: '40px', background: 'transparent', border: 'none' }}
                                title={isRTL ? 'اختر البلد' : 'Select Country'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsRegionMenuOpen(prev => !prev);
                                }}
                            >
                                <img 
                                    src={getFlagUrl(activeRegion.code)} 
                                    alt={activeRegion.name} 
                                    style={{ width: '18px', height: '12px', objectFit: 'cover', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)' }} 
                                />
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{activeRegion.code}</span>
                                <ChevronDown size={12} />
                            </button>
                            <div className="region-selector-menu" style={{ display: isRegionMenuOpen ? 'flex' : undefined }}>
                                {regions.map(r => (
                                    <button 
                                        key={r.id} 
                                        onClick={() => {
                                            changeRegion(r.id);
                                            setIsRegionMenuOpen(false);
                                        }} 
                                        className={`region-selector-item ${r.id === activeRegion.id ? 'active' : ''}`}
                                    >
                                        <img 
                                            src={getFlagUrl(r.code)} 
                                            alt={r.name} 
                                            style={{ width: '18px', height: '12px', objectFit: 'cover', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)' }} 
                                        />
                                        <span>{r.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="hide-mobile icons-row">
                        {/* User Profile / Login (Desktop Only) */}
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
                        {(isVendor || user?.role === 'regional_admin') && (
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
