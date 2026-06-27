import React, { useContext } from 'react';
import Navbar from '../Navbar/Navbar';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from '../Footer/Footer';
import WhatsAppWidget from '../WhatsAppWidget/WhatsAppWidget';
import Toast from '../Toast/Toast';
import { ShopContext } from '../../context/ShopContext';
import { AuthContext } from '../../context/AuthContext';
import { RegionContext } from '../../context/RegionContext';
import PromotionBar from '../PromotionBar/PromotionBar';

const Layout = ({ isRTL, toggleLanguage }) => {
    const { toast, showToast } = useContext(ShopContext);
    const { user } = useContext(AuthContext);
    const { isSupported, detectedCountry, activeRegion } = useContext(RegionContext);
    const location = useLocation();
    const isHomePage = location.pathname === '/';
    const [pageTransition, setPageTransition] = React.useState('page-fade-active');

    React.useEffect(() => {
        setPageTransition('page-fade-enter');
        const timer = setTimeout(() => {
            setPageTransition('page-fade-active');
            window.scrollTo(0, 0); // Smooth reposition on page change
        }, 50);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    const isAdminPath = location.pathname.startsWith('/admin');

    return (
        <div className="app-layout">
            <div style={{ background: '#FFD700', color: '#000', textAlign: 'center', padding: '5px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                DATABASE RESTORATION v1.0.2 - 167 PRODUCTS SYNCED
            </div>
            {!isSupported && activeRegion && (
                <div style={{ background: '#e74c3c', color: '#fff', textAlign: 'center', padding: '8px 15px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', zIndex: 1000 }}>
                    <span>📍</span>
                    <span>
                        {isRTL 
                            ? `نحن لا نقوم بالتوصيل إلى ${detectedCountry || 'بلدك'} حالياً. يتم عرض كتالوج ${activeRegion.name} الافتراضي.`
                            : `We do not deliver to ${detectedCountry || 'your country'} yet. Showing our default catalog (${activeRegion.name}).`}
                    </span>
                </div>
            )}
            {isHomePage && <PromotionBar isRTL={isRTL} />}
            <Toast
                message={toast.message}
                type={toast.type}
                visible={toast.visible}
                onHide={() => showToast('', toast.type)}
            />
            {!isAdminPath && <Navbar isRTL={isRTL} toggleLanguage={toggleLanguage} />}
            <main className={`main-content ${pageTransition}`} style={{ minHeight: isAdminPath ? '100vh' : '80vh' }}>
                <Outlet context={{ isRTL, user }} />
            </main>
            {!isAdminPath && <Footer isRTL={isRTL} />}
            {!isAdminPath && <WhatsAppWidget isRTL={isRTL} />}
        </div>
    );
};

export default Layout;
