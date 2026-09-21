import React from 'react';
import logo from '../../assets/logo_transparent.webp';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PerfumeHub App Error Caught by Luxury Error Boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRestore = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleResetAndHome = () => {
    try {
      // Clear potentially corrupted client cache
      const keysToClear = [
        'perfumehub_products',
        'perfumehub_cart',
        'perfumehub_hero_banners',
        'perfumehub_top_banners',
        'perfumehub_discover_campaigns'
      ];
      keysToClear.forEach(key => {
        try { localStorage.removeItem(key); } catch (_) {}
      });

      // Clear swr keys
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('swr_')) {
          localStorage.removeItem(k);
        }
      }
    } catch (_) {}

    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const isArabic = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

      return (
        <div className="error-boundary-screen" role="alert">
          <div className="error-boundary-card">
            {/* Logo */}
            <div className="error-boundary-logo-wrap">
              <img src={logo} alt="PerfumeHub Qatar" className="error-boundary-logo" />
            </div>

            {/* Status Pill */}
            <div className="error-boundary-pill">
              <span className="error-boundary-pill-dot"></span>
              {isArabic ? 'استعادة تجربة البوتيك الفاخرة' : 'Boutique Session Recovery'}
            </div>

            {/* Title */}
            <h1 className="error-boundary-title">
              {isArabic ? 'نعتذر، حدث خطأ غير متوقع' : 'Restoring Your Experience'}
            </h1>

            {/* Subtitle */}
            <p className="error-boundary-subtitle">
              We encountered a temporary interruption while loading the boutique. Your cart items and preferences are preserved.
            </p>

            <div className="error-boundary-divider"></div>

            <p className="error-boundary-arabic">
              واجهنا انقطاعاً مؤقتاً أثناء تحميل البوتيك. حقيبة تسوقك وتفضيلاتك في أمان، يرجى الضغط أدناه لاستعادة جلستك بسلاسة.
            </p>

            {/* Actions */}
            <div className="error-boundary-actions">
              <button 
                type="button" 
                className="error-btn-primary" 
                onClick={this.handleRestore}
              >
                <span>🔄</span>
                <span>{isArabic ? 'تحديث واستعادة الجلسة' : 'Refresh & Restore'}</span>
              </button>

              <button 
                type="button" 
                className="error-btn-secondary" 
                onClick={this.handleResetAndHome}
              >
                <span>🏛️</span>
                <span>{isArabic ? 'العودة للصفحة الرئيسية' : 'Return to Home'}</span>
              </button>
            </div>

            {/* Technical diagnostic details toggle */}
            <button 
              type="button" 
              className="error-details-toggle" 
              onClick={this.toggleDetails}
            >
              {this.state.showDetails ? 'Hide Diagnostics' : 'View Diagnostic Info'}
            </button>

            {this.state.showDetails && this.state.error && (
              <div className="error-details-box">
                <strong>{this.state.error.name}:</strong> {this.state.error.message}
                {this.state.errorInfo?.componentStack && (
                  <div>{this.state.errorInfo.componentStack}</div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
