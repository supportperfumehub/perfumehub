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
    const isVendorPath = (location.pathname.startsWith('/vendor') || location.pathname.startsWith('/vendor-panel')) && !location.pathname.startsWith('/vendor-signup');
    const isDashboardPath = isAdminPath || isVendorPath;

    return (
        <div className={`app-layout ${isVendorPath ? 'vendor-panel-layout' : ''} ${isAdminPath ? 'admin-layout' : ''}`}>
            {isHomePage && <PromotionBar isRTL={isRTL} />}
            <Toast
                message={toast.message}
                type={toast.type}
                visible={toast.visible}
                onHide={() => showToast('', toast.type)}
            />
            {!isDashboardPath && <Navbar isRTL={isRTL} toggleLanguage={toggleLanguage} />}
            <main className={`main-content ${pageTransition}`} style={{ minHeight: isDashboardPath ? '100vh' : '80vh' }}>
                <Outlet context={{ isRTL, user }} />
            </main>
            {!isDashboardPath && <Footer isRTL={isRTL} />}
            {!isDashboardPath && <WhatsAppWidget isRTL={isRTL} />}
        </div>
    );
};

export default Layout;
