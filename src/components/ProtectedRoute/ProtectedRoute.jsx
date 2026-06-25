import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ children, isAdminRequired = false, isVendorRequired = false }) => {
    const { isAuthenticated, isAdmin, isVendor, loading } = useContext(AuthContext);
    const { i18n } = useTranslation();
    const location = useLocation();

    if (loading) {
        const isRTL = i18n.language === 'ar';
        return (
            <div 
                className="loading-fallback" 
                style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '80vh', 
                    color: 'var(--color-gold, #d4af37)', 
                    fontSize: '1.2rem', 
                    fontWeight: '600',
                    fontFamily: 'var(--font-body, sans-serif)'
                }}
            >
                {isRTL ? 'جاري التحميل...' : 'Loading Perfume Hub...'}
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to login but save the attempted location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isAdminRequired && !isAdmin) {
        // Logged in but not an admin, redirect to home
        return <Navigate to="/" replace />;
    }

    if (isVendorRequired && !isVendor && !isAdmin) {
        // Logged in but neither vendor nor admin, redirect to home
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
