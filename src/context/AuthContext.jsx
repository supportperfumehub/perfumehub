import React, { createContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken } from '../utils/api_v1_0_2';
import { supabase } from '../utils/supabaseClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('perfumehub_user');
        return saved ? JSON.parse(saved) : null;
    });
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
            const backupToken = localStorage.getItem('perfumehub_refresh_token');
            const response = await api.post('/auth/refresh', { refreshToken: backupToken });
            if (response.data.success) {
                const { accessToken, refreshToken, user } = response.data;
                setAccessToken(accessToken);
                if (refreshToken) {
                    localStorage.setItem('perfumehub_refresh_token', refreshToken);
                }
                setUser(user);
                localStorage.setItem('perfumehub_user', JSON.stringify(user));
                console.log('User Role from Server:', user.role);
                const adminFlag = user.role === 'super_admin' || user.role === 'admin' || user.role === 'regional_admin';
                const vendorFlag = user.role === 'vendor';
                setIsAdmin(adminFlag);
                setIsVendor(vendorFlag);
            } else {
                setUser(null);
                localStorage.removeItem('perfumehub_user');
                localStorage.removeItem('perfumehub_refresh_token');
                setIsAdmin(false);
                setIsVendor(false);
            }
        } catch (error) {
            console.log('Session refresh note:', error.message || 'No active session cookie');
            // If backend is unavailable or offline, retain saved user from localStorage
            const savedUser = localStorage.getItem('perfumehub_user');
            if (savedUser && (!error.response || error.response.status >= 500)) {
                try {
                    const parsed = JSON.parse(savedUser);
                    setUser(parsed);
                    setIsAdmin(parsed.role === 'super_admin' || parsed.role === 'admin' || parsed.role === 'regional_admin');
                    setIsVendor(parsed.role === 'vendor');
                } catch (e) {
                    console.error('Failed to parse saved user:', e);
                }
            } else if (error.response?.status === 401) {
                // Only clear user on explicit 401 unauthorized response when refresh cookie is expired
                setUser(null);
                localStorage.removeItem('perfumehub_user');
                localStorage.removeItem('perfumehub_refresh_token');
                setIsAdmin(false);
                setIsVendor(false);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            setIsAdmin(user.role === 'super_admin' || user.role === 'admin' || user.role === 'regional_admin');
            setIsVendor(user.role === 'vendor');
        } else {
            setIsAdmin(false);
            setIsVendor(false);
        }
    }, [user]);

    useEffect(() => {
        initAuth();

        // Listen for global logout events from axios interceptor
        const handleLogout = () => logout();
        window.addEventListener('auth-logout', handleLogout);

        // Listen for Supabase OAuth changes
        const syncGoogleLogin = () => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    try {
                        const response = await api.post('/auth/google', { token: session.access_token });
                        if (response.data.success) {
                            const { accessToken, refreshToken, user } = response.data;
                            setAccessToken(accessToken);
                            if (refreshToken) {
                                localStorage.setItem('perfumehub_refresh_token', refreshToken);
                            }
                            setUser(user);
                            localStorage.setItem('perfumehub_user', JSON.stringify(user));
                            setIsAdmin(user.role === 'super_admin' || user.role === 'admin' || user.role === 'regional_admin');
                            setIsVendor(user.role === 'vendor');
                        }
                    } catch (error) {
                        console.error('Failed to sync Google login with backend:', error);
                    }
                }
            });
            return subscription;
        };

        const subscription = syncGoogleLogin();

        return () => {
            window.removeEventListener('auth-logout', handleLogout);
            subscription?.unsubscribe();
        };
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
                if (data.refreshToken) {
                    localStorage.setItem('perfumehub_refresh_token', data.refreshToken);
                }
                setUser(data.user);
                localStorage.setItem('perfumehub_user', JSON.stringify(data.user));
                setIsAdmin(data.user.role === 'super_admin' || data.user.role === 'admin' || data.user.role === 'regional_admin');
                setIsVendor(data.user.role === 'vendor');
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
                if (data.refreshToken) {
                    localStorage.setItem('perfumehub_refresh_token', data.refreshToken);
                }
                setUser(data.user);
                localStorage.setItem('perfumehub_user', JSON.stringify(data.user));
                setIsAdmin(data.user.role === 'super_admin' || data.user.role === 'admin' || data.user.role === 'regional_admin');
                setIsVendor(data.user.role === 'vendor');
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
            const backupToken = localStorage.getItem('perfumehub_refresh_token');
            await api.post('/auth/logout', { refreshToken: backupToken });
        } finally {
            setAccessToken(null);
            setUser(null);
            localStorage.removeItem('perfumehub_user');
            localStorage.removeItem('perfumehub_refresh_token');
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

    const loginWithGoogle = async () => {
        try {
            console.log('Initiating Google Login...');
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) {
                console.error('Supabase OAuth Error:', error);
                throw error;
            }
        } catch (error) {
            console.error('Google Login Error:', error);
            return { success: false, message: error.message };
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
        loginWithGoogle,
        register,
        logout,
        verify2FA,
        forgotPassword,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
