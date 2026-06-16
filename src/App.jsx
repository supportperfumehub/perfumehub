import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Shop from './pages/Shop/Shop';

import ProductDetails from './pages/ProductDetails/ProductDetails';
import ContentPage from './pages/ContentPage/ContentPage';
import Cart from './pages/Cart/Cart';
import Login from './pages/Login/Login';
import ResetPassword from './pages/Login/ResetPassword';
import Wishlist from './pages/Wishlist/Wishlist';
import Admin from './pages/Admin/Admin';
import VerificationPortal from './pages/Admin/VerificationPortal';
import VendorPanel from './pages/Vendor/VendorPanel';
import VendorSignup from './pages/Vendor/VendorSignup';
import Checkout from './pages/Checkout/Checkout';
import CheckoutSuccess from './pages/Checkout/CheckoutSuccess';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Profile from './pages/Profile/Profile';
import PerfumeHubAI from './pages/PerfumeHubAI/PerfumeHubAI';

import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import TermsCondition from './pages/Legal/TermsCondition';
import RefundPolicy from './pages/Legal/RefundPolicy';
import ShippingPolicy from './pages/Legal/ShippingPolicy';
import Contact from './pages/Contact/Contact';
import FAQ from './pages/FAQ/FAQ';

function App() {
  const { i18n } = useTranslation();
  const [isRTL, setIsRTL] = useState(i18n.language === 'ar');

  useEffect(() => {
    setIsRTL(i18n.language === 'ar');
  }, [i18n.language]);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = isRTL ? 'ar' : 'en';
  }, [isRTL]);

  const location = useLocation();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target); // Stop observing once revealed for performance
          }
        });
      },
      { threshold: window.innerWidth < 768 ? 0.05 : 0.1 }
    );

    const observeNewElements = () => {
      const revealElements = document.querySelectorAll('.reveal:not(.active)');
      revealElements.forEach((el) => observer.observe(el));
    };

    // Run initially
    observeNewElements();

    // Set up MutationObserver to detect dynamically added components (e.g. async products list)
    const mutationObserver = new MutationObserver((mutations) => {
      let hasNewNodes = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          hasNewNodes = true;
          break;
        }
      }
      if (hasNewNodes) {
        observeNewElements();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [location.pathname]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  return (
    <Routes>
      <Route path="/" element={<Layout isRTL={isRTL} toggleLanguage={toggleLanguage} />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="ai-advisor" element={<PerfumeHubAI />} />
        <Route path="category/:type" element={<Shop />} />
        <Route path="product/:id" element={<ProductDetails />} />
        <Route path="brands" element={<Shop />} />
        <Route path="about" element={<ContentPage />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<FAQ />} />
        <Route path="blog" element={<ContentPage />} />
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="terms-conditions" element={<TermsCondition />} />
        <Route path="refund-policy" element={<RefundPolicy />} />
        <Route path="shipping-policy" element={<ShippingPolicy />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="checkout-success" element={<CheckoutSuccess />} />
        <Route path="login" element={<Login />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="admin" element={
          <ProtectedRoute isAdminRequired={true}>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="vendor" element={
          <ProtectedRoute isVendorRequired={true}>
            <VendorPanel />
          </ProtectedRoute>
        } />
        <Route path="verify" element={
          <ProtectedRoute isVendorRequired={true}>
            <VerificationPortal />
          </ProtectedRoute>
        } />
        <Route path="vendor-signup" element={<VendorSignup />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}

export default App;
