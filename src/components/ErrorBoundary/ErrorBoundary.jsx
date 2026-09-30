import React from 'react';

/**
 * Resilient Error Boundary
 * - Catches any unexpected React runtime error
 * - Clears potentially corrupted cache keys
 * - Strictly prevents infinite reload loops by enforcing a maximum of 1 auto-recovery reload per 30 seconds
 * - Renders a graceful luxury recovery screen if the error persists
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
        this._reloadTimer = null;
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[PerfumeHub] Caught runtime error:', error?.message || error);
        console.error('[PerfumeHub] Component stack:', errorInfo?.componentStack);

        // Guard against infinite reload loops
        const now = Date.now();
        const lastReload = parseInt(sessionStorage.getItem('ph_last_error_reload') || '0', 10);
        const hasRecentlyReloaded = (now - lastReload) < 30000;

        // Clear potentially corrupt cache keys
        try {
            const keysToClear = [
                'perfumehub_products',
                'perfumehub_hero_banners',
                'perfumehub_top_banners',
                'perfumehub_discover_campaigns'
            ];
            keysToClear.forEach(key => {
                try { localStorage.removeItem(key); } catch (_) {}
            });
        } catch (_) {}

        if (!hasRecentlyReloaded) {
            sessionStorage.setItem('ph_last_error_reload', String(now));
            this._reloadTimer = setTimeout(() => {
                try {
                    window.location.reload();
                } catch (_) {}
            }, 600);
        } else {
            console.warn('[PerfumeHub] Reload loop prevented. Showing recovery UI.');
        }
    }

    componentWillUnmount() {
        if (this._reloadTimer) clearTimeout(this._reloadTimer);
    }

    handleManualRefresh = () => {
        sessionStorage.removeItem('ph_last_error_reload');
        try {
            localStorage.clear();
        } catch (_) {}
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            const lastReload = parseInt(sessionStorage.getItem('ph_last_error_reload') || '0', 10);
            const isWaitingAutoReload = (Date.now() - lastReload) < 1500;

            if (isWaitingAutoReload) {
                return null;
            }

            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0a0a0a',
                    color: '#fafafa',
                    padding: '20px',
                    textAlign: 'center',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <div style={{
                        maxWidth: '480px',
                        padding: '40px',
                        borderRadius: '16px',
                        background: '#141414',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                    }}>
                        <h1 style={{
                            fontSize: '1.6rem',
                            color: '#d4af37',
                            marginBottom: '16px',
                            fontWeight: '600'
                        }}>
                            PerfumeHub Qatar
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
                            We encountered an issue while loading the boutique. Please refresh the page to continue shopping.
                        </p>
                        <button
                            onClick={this.handleManualRefresh}
                            style={{
                                padding: '12px 28px',
                                background: 'linear-gradient(135deg, #d4af37 0%, #aa8c2c 100%)',
                                color: '#0a0a0a',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                boxShadow: '0 4px 14px rgba(212, 175, 55, 0.4)'
                            }}
                        >
                            Reload Boutique
                        </button>
                        {this.state.error && (
                            <details style={{ marginTop: '20px', textAlign: 'left', background: '#0a0a0a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #333', fontSize: '0.75rem', color: '#ef4444', overflowX: 'auto' }}>
                                <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>Technical error details</summary>
                                <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {String(this.state.error?.message || this.state.error)}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
