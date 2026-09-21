import React from 'react';

/**
 * Silent Error Boundary
 * - Catches any React runtime error anywhere in the tree
 * - Immediately clears corrupt localStorage cache keys
 * - Auto-reloads the page (no popup, no visible UI shown to user)
 * - Prevents the blank white screen by recovering automatically
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
        this._reloadTimer = null;
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log for debugging (visible in Vercel Function Logs / browser DevTools)
        console.error('[PerfumeHub] Caught runtime error — auto-recovering:', error?.message || error);
        console.error('[PerfumeHub] Component stack:', errorInfo?.componentStack);

        // Clear potentially corrupt cache keys that often cause crashes
        try {
            const keysToClear = [
                'perfumehub_products',
                'perfumehub_cart',
                'perfumehub_hero_banners',
                'perfumehub_top_banners',
                'perfumehub_discover_campaigns',
                'perfumehub_regions',
                'perfumehub_active_region',
            ];
            keysToClear.forEach(key => {
                try { localStorage.removeItem(key); } catch (_) {}
            });
        } catch (_) {}

        // Auto-reload after a very short delay so the page recovers silently
        this._reloadTimer = setTimeout(() => {
            try {
                window.location.reload();
            } catch (_) {}
        }, 800);
    }

    componentWillUnmount() {
        if (this._reloadTimer) clearTimeout(this._reloadTimer);
    }

    render() {
        // While waiting for auto-reload, show nothing (keeps background visible)
        if (this.state.hasError) {
            return null;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
