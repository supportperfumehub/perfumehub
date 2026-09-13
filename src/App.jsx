import { useState, useEffect, useContext, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import { ShopContext } from './context/ShopContext';
import { AuthContext } from './context/AuthContext';
import api from './utils/api_v1_0_2';

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
const TrackOrder = lazy(() => import('./pages/TrackOrder/TrackOrder'));
import LuxurySkeletonGrid from './components/UI/LuxurySkeletonGrid';

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
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const [maintenance, setMaintenance] = useState({
    active: false,
    messageEn: '',
    messageAr: ''
  });

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const res = await api.get('/admin/settings/public');
        if (res.data?.maintenanceMode) {
          setMaintenance({
            active: true,
            messageEn: res.data.maintenanceMessage || '',
            messageAr: res.data.maintenanceMessageAr || ''
          });
        } else {
          setMaintenance(prev => ({ ...prev, active: false }));
        }
      } catch (e) {
        // Fallback silently if offline or cold start
      }
    };
    fetchMaintenanceStatus();
  }, []);

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
    <div className="loading-fallback-skeleton" style={{ minHeight: '80vh', padding: '60px 0' }}>
      <LuxurySkeletonGrid count={8} withHeader={true} />
    </div>
  );

  const isPrivileged = user?.role === 'super_admin' || user?.role === 'admin' || user?.email === 'supportperfumehub@gmail.com';
  const isBypassRoute = location.pathname.startsWith('/login') || location.pathname.startsWith('/admin') || location.pathname.startsWith('/reset-password');
  const shouldShowHoldingPage = maintenance.active && !isPrivileged && !isBypassRoute;

  if (shouldShowHoldingPage) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1e1b18 0%, #080a10 70%, #030408 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
        textAlign: 'center',
        fontFamily: "'Playfair Display', Georgia, serif"
      }}>
        {/* Status Indicator */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 18px',
          borderRadius: '30px',
          background: 'rgba(212, 175, 55, 0.1)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          color: '#d4af37',
          fontSize: '0.82rem',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          marginBottom: '24px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d4af37', boxShadow: '0 0 10px #d4af37', display: 'inline-block' }}></span>
          Scheduled Private Maintenance · صيانة مجدولة
        </div>

        {/* Brand Crest */}
        <h1 style={{
          fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
          fontWeight: '700',
          letterSpacing: '3px',
          margin: '0 0 10px',
          background: 'linear-gradient(135deg, #ffffff 0%, #d4af37 60%, #b8860b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          PERFUMEHUB
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 35px' }}>
          Haute Parfumerie & Artisanal GCC Concierge
        </p>

        {/* Notice Card */}
        <div style={{
          maxWidth: '640px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '16px',
          padding: '36px 30px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          marginBottom: '30px'
        }}>
          <p style={{ fontSize: '1.05rem', lineHeight: '1.7', color: '#f1f5f9', margin: '0 0 18px', fontFamily: 'system-ui, sans-serif' }}>
            {maintenance.messageEn || 'PerfumeHub is undergoing scheduled infrastructure enhancements to deliver an elevated luxury boutique experience. We look forward to welcoming you back shortly.'}
          </p>
          <div style={{ height: '1px', background: 'rgba(212, 175, 55, 0.2)', margin: '18px 0' }} />
          <p style={{ fontSize: '1.02rem', lineHeight: '1.8', color: '#cbd5e1', margin: 0, direction: 'rtl', fontFamily: 'system-ui, sans-serif' }}>
            {maintenance.messageAr || 'موقع بيرفيوم هب قيد الصيانة المجدولة لتحسين تجربتكم الفاخرة وترقية خدمات البوتيكات. سنعود لاستقبالكم قريباً.'}
          </p>
        </div>

        {/* Admin portal access */}
        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
          <span>Administrator or Boutique Partner? </span>
          <a href="/login" style={{ color: '#d4af37', textDecoration: 'none', borderBottom: '1px solid rgba(212, 175, 55, 0.4)', paddingBottom: '2px' }}>
            Staff Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={loadingFallback}>
      <Routes>
        <Route path="/" element={<Layout isRTL={isRTL} toggleLanguage={toggleLanguage} />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="scent-genie" element={<PerfumeHubAI />} />
          <Route path="ai-advisor" element={<PerfumeHubAI />} />
          <Route path="track-order" element={<TrackOrder />} />
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
