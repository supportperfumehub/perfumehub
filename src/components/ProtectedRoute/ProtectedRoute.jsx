import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ children, isAdminRequired = false }) => {
    const { isAuthenticated, isAdmin } = useContext(AuthContext);
    const location = useLocation();

    if (!isAuthenticated) {
        // Redirect to login but save the attempted location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isAdminRequired && !isAdmin) {
        // Logged in but not an admin, redirect to home
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
