import { useState, useEffect, useContext, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import { ShopContext } from './context/ShopContext';

// Lazy load sub-routes to split chunks and speed up initial page load
const Shop = lazy(() => import('./pages/Shop/Shop'));
const ProductDetails = lazy(() => import('./pages/ProductDetails/ProductDetails'));
const ContentPage = lazy(() => import('./pages/ContentPage/ContentPage'));
const Cart = lazy(() => import('./pages/Cart/Cart'));
const Login = lazy(() => import('./pages/Login/Login'));
const ResetPassword = lazy(() => import('./pages/Login/ResetPassword'));
const Wishlist = lazy(() => import('./pages/Wishlist/Wishlist'));
const Admin = lazy(() => import('./pages/Admin/Admin'));
const VerificationPortal = lazy(() => import('./pages/Admin/VerificationPortal'));
const VendorPanel = lazy(() => import('./pages/Vendor/VendorPanel'));
const VendorSignup = lazy(() => import('./pages/Vendor/VendorSignup'));
const Checkout = lazy(() => import('./pages/Checkout/Checkout'));
const CheckoutSuccess = lazy(() => import('./pages/Checkout/CheckoutSuccess'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const PerfumeHubAI = lazy(() => import('./pages/PerfumeHubAI/PerfumeHubAI'));

const PrivacyPolicy = lazy(() => import('./pages/Legal/PrivacyPolicy'));
const TermsCondition = lazy(() => import('./pages/Legal/TermsCondition'));
const RefundPolicy = lazy(() => import('./pages/Legal/RefundPolicy'));
const ShippingPolicy = lazy(() => import('./pages/Legal/ShippingPolicy'));
const Contact = lazy(() => import('./pages/Contact/Contact'));
const FAQ = lazy(() => import('./pages/FAQ/FAQ'));

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

  const { products, loading } = useContext(ShopContext);
  const location = useLocation();

  useEffect(() => {
    // Fallback for environments/browsers without IntersectionObserver support
    if (!window.IntersectionObserver) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('active'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target); // Stop observing once revealed for performance
          }
        });
      },
      { 
        rootMargin: window.innerWidth < 768 ? '0px 0px -30px 0px' : '0px 0px -60px 0px',
        threshold: 0 
      }
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
  }, [location.pathname, products?.length, loading]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  const loadingFallback = (
    <div 
        className="loading-fallback" 
        style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '80vh', 
            color: 'var(--color-gold, #d4af37)', 
            fontSize: '1.2rem', 
            fontWeight: '600' 
        }}
    >
        {isRTL ? 'جاري التحميل...' : 'Loading Perfume Hub...'}
    </div>
  );

  return (
    <Suspense fallback={loadingFallback}>
      <Routes>
        <Route path="/" element={<Layout isRTL={isRTL} toggleLanguage={toggleLanguage} />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="scent-genie" element={<PerfumeHubAI />} />
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
          <Route path="vendor-panel" element={
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
    </Suspense>
  );
}

export default App;
