import React, { useContext } from 'react';
import Navbar from '../Navbar/Navbar';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from '../Footer/Footer';
import WhatsAppWidget from '../WhatsAppWidget/WhatsAppWidget';
import Toast from '../Toast/Toast';
import { ShopContext } from '../../context/ShopContext';
import PromotionBar from '../PromotionBar/PromotionBar';

const Layout = ({ isRTL, toggleLanguage }) => {
    const { toast, showToast } = useContext(ShopContext);
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
            {isHomePage && <PromotionBar isRTL={isRTL} />}
            <Toast
                message={toast.message}
                type={toast.type}
                visible={toast.visible}
                onHide={() => showToast('', toast.type)}
            />
            {!isAdminPath && <Navbar isRTL={isRTL} toggleLanguage={toggleLanguage} />}
            <main className={`main-content ${pageTransition}`} style={{ minHeight: isAdminPath ? '100vh' : '80vh' }}>
                <Outlet context={{ isRTL }} />
            </main>
            {!isAdminPath && <Footer isRTL={isRTL} />}
            {!isAdminPath && <WhatsAppWidget isRTL={isRTL} />}
        </div>
    );
};

export default Layout;
