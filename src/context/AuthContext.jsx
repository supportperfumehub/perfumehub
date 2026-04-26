import React, { createContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken } from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requires2FA, setRequires2FA] = useState(false);
    const [pendingUserId, setPendingUserId] = useState(null);

    // Persist non-sensitive status flags
    const [isAdmin, setIsAdmin] = useState(() => {
        const saved = localStorage.getItem('perfumehub_isAdmin');
        return saved ? JSON.parse(saved) : false;
    });

    const [isVendor, setIsVendor] = useState(() => {
        const saved = localStorage.getItem('perfumehub_isVendor');
        return saved ? JSON.parse(saved) : false;
    });

    /**
     * Initialize Auth (Silent Refresh)
     */
    const initAuth = useCallback(async () => {
        try {
            const response = await api.post('/auth/refresh');
            if (response.data.success) {
                const { accessToken, user } = response.data;
                setAccessToken(accessToken);
                setUser(user);
                console.log('User Role from Server:', user.role);
                const adminFlag = user.role === 'super_admin' || user.role === 'admin' || user.role === 'regional_admin';
                const vendorFlag = user.role === 'vendor' || !!user.shop_id;
                console.log('Setting isAdmin:', adminFlag, 'isVendor:', vendorFlag);
                setIsAdmin(adminFlag);
                setIsVendor(vendorFlag);
            }
        } catch (error) {
            console.log('No active session found.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            setIsAdmin(user.role === 'super_admin' || user.role === 'admin' || user.role === 'regional_admin');
            setIsVendor(user.role === 'vendor' || !!user.shop_id);
        }
    }, [user]);

    useEffect(() => {
        initAuth();

        // Listen for global logout events from axios interceptor
        const handleLogout = () => logout();
        window.addEventListener('auth-logout', handleLogout);
        return () => window.removeEventListener('auth-logout', handleLogout);
    }, [initAuth]);

    useEffect(() => {
        localStorage.setItem('perfumehub_isAdmin', JSON.stringify(isAdmin));
        localStorage.setItem('perfumehub_isVendor', JSON.stringify(isVendor));
    }, [isAdmin, isVendor]);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const data = response.data;

            if (data.requires2FA) {
                setRequires2FA(true);
                setPendingUserId(data.userId);
                return { success: true, requires2FA: true };
            }

            if (data.success) {
                setAccessToken(data.accessToken);
                setUser(data.user);
                setIsAdmin(data.user.role === 'super_admin' || data.user.role === 'admin' || data.user.role === 'regional_admin');
                setIsVendor(data.user.role === 'vendor' || !!data.user.shop_id);
                return { success: true, user: data.user };
            }
            return { success: false, message: data.error || 'Login failed' };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Could not connect to server' };
        }
    };

    const verify2FA = async (token) => {
        try {
            const response = await api.post('/auth/2fa/verify', { userId: pendingUserId, token });
            const data = response.data;

            if (data.success) {
                setAccessToken(data.accessToken);
                setUser(data.user);
                setIsAdmin(data.user.role === 'super_admin' || data.user.role === 'admin' || data.user.role === 'regional_admin');
                setIsVendor(data.user.role === 'vendor' || !!data.user.shop_id);
                setRequires2FA(false);
                setPendingUserId(null);
                return { success: true, user: data.user };
            }
            return { success: false, message: data.error || 'Invalid 2FA code' };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || '2FA verification failed' };
        }
    };

    const register = async (name, email, password) => {
        try {
            const response = await api.post('/auth/register', { name, email, password });
            if (response.data.success) {
                return { success: true, message: response.data.message };
            }
            return { success: false, message: response.data.error || 'Registration failed' };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Registration failed' };
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            setAccessToken(null);
            setUser(null);
            setIsAdmin(false);
            setIsVendor(false);
            setRequires2FA(false);
            setPendingUserId(null);
        }
    };

    const forgotPassword = async (email) => {
        try {
            const response = await api.post('/auth/forgot-password', { email });
            return response.data;
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Request failed' };
        }
    };

    const resetPassword = async (token, password) => {
        try {
            const response = await api.post('/auth/reset-password', { token, password });
            return response.data;
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Reset failed' };
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        isVendor,
        requires2FA,
        login,
        register,
        logout,
        verify2FA,
        forgotPassword,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
