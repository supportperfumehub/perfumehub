import React, { createContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken } from '../utils/api_v1_0_2';
import { supabase } from '../utils/supabaseClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('perfumehub_user');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('Corrupt user in localStorage, clearing:', e);
            localStorage.removeItem('perfumehub_user');
            return null;
        }
    });
    const [loading, setLoading] = useState(true);
    const [requires2FA, setRequires2FA] = useState(false);
    const [pendingUserId, setPendingUserId] = useState(null);

    // Persist non-sensitive status flags
    const [isAdmin, setIsAdmin] = useState(() => {
        try {
            const saved = localStorage.getItem('perfumehub_isAdmin');
            return saved ? JSON.parse(saved) : false;
        } catch (e) {
            localStorage.removeItem('perfumehub_isAdmin');
            return false;
        }
    });

    const [isVendor, setIsVendor] = useState(() => {
        try {
            const saved = localStorage.getItem('perfumehub_isVendor');
            return saved ? JSON.parse(saved) : false;
        } catch (e) {
            localStorage.removeItem('perfumehub_isVendor');
            return false;
        }
    });

    /**
     * Helper to apply backend user & token state
     */
    const applyBackendAuth = useCallback((data) => {
        const { accessToken, refreshToken, user: authUser } = data;
        setAccessToken(accessToken);
        if (refreshToken) {
            localStorage.setItem('perfumehub_refresh_token', refreshToken);
        }
        setUser(authUser);
        localStorage.setItem('perfumehub_user', JSON.stringify(authUser));
        const adminFlag = authUser.role === 'super_admin' || authUser.role === 'admin' || authUser.role === 'regional_admin';
        const vendorFlag = authUser.role === 'vendor' || Boolean(authUser.shop_id);
        setIsAdmin(adminFlag);
        setIsVendor(vendorFlag);

        // Clean up OAuth fragment or query code from address bar
        if (typeof window !== 'undefined' && (window.location.hash || window.location.search.includes('code='))) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    /**
     * Purge all local client tokens, Supabase sessions, and auth storage
     */
    const clearAllClientAuth = useCallback(async () => {
        try {
            if (supabase?.auth?.signOut) {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            }
        } catch (_) {}

        setAccessToken(null);
        setUser(null);
        setIsAdmin(false);
        setIsVendor(false);
        setRequires2FA(false);
        setPendingUserId(null);

        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('perfumehub_token');
                localStorage.removeItem('perfumehub_refresh_token');
                localStorage.removeItem('perfumehub_user');
                localStorage.removeItem('perfumehub_isAdmin');
                localStorage.removeItem('perfumehub_isVendor');

                // Clear any lingering Supabase auth tokens (sb-*-auth-token)
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') && key.includes('-auth-token')) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (_) {}
        }
    }, []);

    /**
     * Initialize Auth:
     * 1. If actively returning from an OAuth redirect (URL contains access_token or code=), exchange with backend.
     * 2. Otherwise, use backend session refresh (/auth/refresh via HttpOnly cookie or backup token).
     * 3. Supabase getSession is only used as a fallback when no backend session exists.
     */
    const initAuth = useCallback(async () => {
        try {
            const isOAuthRedirect = typeof window !== 'undefined' && 
                (window.location.hash?.includes('access_token') || window.location.search?.includes('code='));

            // 1. Handle active OAuth callback redirect
            if (isOAuthRedirect && supabase?.auth?.getSession) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.access_token) {
                        console.log('[Auth] Active Google OAuth redirect detected, syncing with backend...');
                        const response = await api.post('/auth/google', { token: session.access_token });
                        if (response.data.success) {
                            applyBackendAuth(response.data);
                            setLoading(false);
                            return;
                        }
                    }
                } catch (oauthErr) {
                    console.warn('[Auth] OAuth redirect exchange note:', oauthErr.message);
                }
            }

            // 2. Standard backend session refresh (Cookie first, localStorage backup)
            const backupToken = typeof window !== 'undefined' ? localStorage.getItem('perfumehub_refresh_token') : null;
            try {
                const response = await api.post('/auth/refresh', { refreshToken: backupToken });
                if (response.data.success) {
                    applyBackendAuth(response.data);
                    setLoading(false);
                    return;
                }
            } catch (refreshErr) {
                // If 401 Unauthorized, the session is expired or invalid
                if (refreshErr.response?.status === 401) {
                    await clearAllClientAuth();
                    setLoading(false);
                    return;
                }
                // If network/server error (>= 500 or offline), retain offline saved user from localStorage
                const savedUser = typeof window !== 'undefined' ? localStorage.getItem('perfumehub_user') : null;
                if (savedUser && (!refreshErr.response || refreshErr.response.status >= 500)) {
                    try {
                        const parsed = JSON.parse(savedUser);
                        setUser(parsed);
                        setIsAdmin(parsed.role === 'super_admin' || parsed.role === 'admin' || parsed.role === 'regional_admin');
                        setIsVendor(parsed.role === 'vendor' || Boolean(parsed.shop_id));
                    } catch (_) {}
                    setLoading(false);
                    return;
                }
            }

            // 3. Fallback: only if no backend user is saved in storage
            if (typeof window !== 'undefined' && !localStorage.getItem('perfumehub_user') && supabase?.auth?.getSession) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.access_token) {
                        const response = await api.post('/auth/google', { token: session.access_token });
                        if (response.data.success) {
                            applyBackendAuth(response.data);
                            setLoading(false);
                            return;
                        }
                    }
                } catch (_) {}
            }

            // No valid session found
            await clearAllClientAuth();
        } catch (error) {
            console.log('Session init note:', error.message || 'No active session');
            await clearAllClientAuth();
        } finally {
            setLoading(false);
        }
    }, [applyBackendAuth, clearAllClientAuth]);

    useEffect(() => {
        if (user) {
            setIsAdmin(user.role === 'super_admin' || user.role === 'admin' || user.role === 'regional_admin');
            setIsVendor(user.role === 'vendor' || Boolean(user.shop_id));
        } else {
            setIsAdmin(false);
            setIsVendor(false);
        }
    }, [user]);

    useEffect(() => {
        initAuth();

        // Safety net: if auth check hangs after 6s, force loading=false so pages don't get stuck
        const authKillSwitch = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn('[AuthContext] Auth loading kill-switch fired — forcing loading=false');
                    return false;
                }
                return prev;
            });
        }, 6000);

        // Listen for global logout events from axios interceptor
        const handleLogout = () => logout();
        window.addEventListener('auth-logout', handleLogout);

        // BFCache (Back/Forward Cache) handler:
        // When navigating using browser back button, ensure the rendered user matches localStorage
        const handlePageShow = (e) => {
            if (e.persisted) {
                try {
                    const saved = localStorage.getItem('perfumehub_user');
                    const parsed = saved ? JSON.parse(saved) : null;
                    setUser(parsed);
                    if (parsed) {
                        setIsAdmin(parsed.role === 'super_admin' || parsed.role === 'admin' || parsed.role === 'regional_admin');
                        setIsVendor(parsed.role === 'vendor' || Boolean(parsed.shop_id));
                    } else {
                        setIsAdmin(false);
                        setIsVendor(false);
                    }
                } catch (_) {}
            }
        };
        window.addEventListener('pageshow', handlePageShow);

        // Cross-tab synchronization:
        // If another tab logs in or logs out, synchronize immediately
        const handleStorageChange = (e) => {
            if (e.key === 'perfumehub_user') {
                try {
                    const nextUser = e.newValue ? JSON.parse(e.newValue) : null;
                    setUser(nextUser);
                    if (nextUser) {
                        setIsAdmin(nextUser.role === 'super_admin' || nextUser.role === 'admin' || nextUser.role === 'regional_admin');
                        setIsVendor(nextUser.role === 'vendor' || Boolean(nextUser.shop_id));
                    } else {
                        setIsAdmin(false);
                        setIsVendor(false);
                    }
                } catch (_) {
                    setUser(null);
                    setIsAdmin(false);
                    setIsVendor(false);
                }
            } else if (e.key === 'perfumehub_refresh_token' && !e.newValue) {
                logout();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Listen for explicit Supabase OAuth SIGNED_IN event (only when user actively completes OAuth flow)
        const syncGoogleLogin = () => {
            if (!supabase?.auth?.onAuthStateChange) return { unsubscribe: () => {} };
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                // Strictly only on SIGNED_IN event (ignore INITIAL_SESSION so stale caches don't hijack active accounts)
                if (event === 'SIGNED_IN' && session?.access_token) {
                    try {
                        const response = await api.post('/auth/google', { token: session.access_token });
                        if (response.data.success) {
                            applyBackendAuth(response.data);
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
            clearTimeout(authKillSwitch);
            window.removeEventListener('auth-logout', handleLogout);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('storage', handleStorageChange);
            subscription?.unsubscribe();
        };
    }, [initAuth, applyBackendAuth]);

    useEffect(() => {
        try {
            localStorage.setItem('perfumehub_isAdmin', JSON.stringify(isAdmin));
            localStorage.setItem('perfumehub_isVendor', JSON.stringify(isVendor));
        } catch (_) {}
    }, [isAdmin, isVendor]);

    const login = async (email, password) => {
        try {
            // Discard any stale Supabase sessions before logging into a new account
            if (supabase?.auth?.signOut) {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            }
            if (typeof window !== 'undefined') {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') && key.includes('-auth-token')) {
                        localStorage.removeItem(key);
                    }
                });
            }

            const response = await api.post('/auth/login', { email, password });
            const data = response.data;

            if (data.requires2FA) {
                setRequires2FA(true);
                setPendingUserId(data.userId);
                return { success: true, requires2FA: true };
            }

            if (data.success) {
                applyBackendAuth(data);
                return { success: true, user: data.user };
            }
            return { success: false, message: data.error || 'Login failed' };
        } catch (error) {
            return { success: false, message: error.response?.data?.error || 'Could not connect to server' };
        }
    };

    const verify2FA = async (token) => {
        try {
            if (supabase?.auth?.signOut) {
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            }
            if (typeof window !== 'undefined') {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') && key.includes('-auth-token')) {
                        localStorage.removeItem(key);
                    }
                });
            }

            const response = await api.post('/auth/2fa/verify', { userId: pendingUserId, token });
            const data = response.data;

            if (data.success) {
                applyBackendAuth(data);
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
            const backupToken = typeof window !== 'undefined' ? localStorage.getItem('perfumehub_refresh_token') : null;
            await api.post('/auth/logout', { refreshToken: backupToken }).catch(() => {});
        } finally {
            await clearAllClientAuth();
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

    const updateUser = useCallback((updatedFields) => {
        setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, ...updatedFields };
            try {
                localStorage.setItem('perfumehub_user', JSON.stringify(updated));
            } catch (e) {
                console.warn('[AuthContext] Could not update localStorage user:', e.message);
            }
            return updated;
        });
    }, []);

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
        resetPassword,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
