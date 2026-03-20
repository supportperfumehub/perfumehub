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

    return (
        <div className="app-layout">
            {isHomePage && <PromotionBar isRTL={isRTL} />}
            <Toast
                message={toast.message}
                type={toast.type}
                visible={toast.visible}
                onHide={() => showToast('', toast.type)}
            />
            <Navbar isRTL={isRTL} toggleLanguage={toggleLanguage} />
            <main className="main-content" style={{ minHeight: '80vh' }}>
                <Outlet context={{ isRTL }} />
            </main>
            <Footer isRTL={isRTL} />
            <WhatsAppWidget isRTL={isRTL} />
        </div>
    );
};

export default Layout;
