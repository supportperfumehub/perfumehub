import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { setAccessToken } from '../utils/api_v1_0_2';
import { supabase } from '../utils/supabaseClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const oauthSyncDoneRef = useRef(false);
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
        if (typeof window !== 'undefined' && (window.location.hash || window.location.search?.includes('code='))) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    /**
     * Purge all local client tokens, Supabase sessions, and auth storage
     */
    const clearAllClientAuth = useCallback(async () => {
        oauthSyncDoneRef.current = false;
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
     * Idempotently sync Supabase session with PerfumeHub backend
     */
    const syncSupabaseSessionWithBackend = useCallback(async (session) => {
        if (!session?.access_token || oauthSyncDoneRef.current) return false;
        oauthSyncDoneRef.current = true;
        try {
            console.log('[Auth] Syncing Google OAuth session with backend...');
            const response = await api.post('/auth/google', { token: session.access_token });
            if (response.data?.success) {
                applyBackendAuth(response.data);
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('perfumehub_oauth_pending');
                    const returnUrl = sessionStorage.getItem('perfumehub_oauth_return_url');
                    sessionStorage.removeItem('perfumehub_oauth_return_url');

                    // Clean the OAuth query/hash params from address bar
                    if (window.location.search?.includes('code=') || window.location.hash?.includes('access_token')) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }

                    if (returnUrl && returnUrl !== '/login' && returnUrl !== window.location.pathname) {
                        window.location.href = returnUrl;
                    }
                }
                setLoading(false);
                return true;
            }
        } catch (err) {
            console.error('[Auth] Failed to sync Google OAuth session with backend:', err.response?.data || err.message);
            oauthSyncDoneRef.current = false;
        } finally {
            setLoading(false);
        }
        return false;
    }, [applyBackendAuth]);

    /**
     * Initialize Auth:
     * 1. If actively returning from an OAuth redirect (URL contains access_token, code=, or oauth_pending), exchange with backend.
     * 2. Otherwise, use backend session refresh (/auth/refresh via HttpOnly cookie or backup token).
     * 3. Supabase getSession is only used as a fallback when no backend session exists.
     */
    const initAuth = useCallback(async () => {
        try {
            const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const authCode = urlParams?.get('code');
            const hasAccessTokenHash = typeof window !== 'undefined' && window.location.hash?.includes('access_token');
            const isOAuthPending = typeof window !== 'undefined' && sessionStorage.getItem('perfumehub_oauth_pending') === 'true';
            const isOAuthRedirect = Boolean(authCode || hasAccessTokenHash || isOAuthPending);

            // 1. Handle active OAuth callback redirect
            if (isOAuthRedirect && supabase?.auth) {
                try {
                    // Attempt explicit PKCE code exchange if code parameter is present in URL
                    if (authCode && typeof supabase.auth.exchangeCodeForSession === 'function') {
                        try {
                            const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
                            if (!error && data?.session?.access_token) {
                                const synced = await syncSupabaseSessionWithBackend(data.session);
                                if (synced) return;
                            }
                        } catch (exErr) {
                            console.warn('[Auth] Code exchange note:', exErr.message);
                        }
                    }

                    // Check existing or background-exchanged session
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.access_token) {
                        const synced = await syncSupabaseSessionWithBackend(session);
                        if (synced) return;
                    }
                } catch (oauthErr) {
                    console.warn('[Auth] OAuth redirect exchange note:', oauthErr.message);
                }

                // If this is an OAuth redirect, NEVER clear tokens or cancel auth.
                // Supabase's onAuthStateChange listener is concurrently handling the callback.
                console.log('[Auth] OAuth redirect active — awaiting Supabase onAuthStateChange confirmation...');
                return;
            }

            // 2. Standard backend session refresh (only if active session exists in storage)
            const backupToken = typeof window !== 'undefined' ? localStorage.getItem('perfumehub_refresh_token') : null;
            const savedUser = typeof window !== 'undefined' ? localStorage.getItem('perfumehub_user') : null;

            // If the user explicitly logged out (no stored user and no refresh token), do not attempt session revival
            if (!backupToken && !savedUser) {
                await clearAllClientAuth();
                setLoading(false);
                return;
            }

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

            // No valid session found
            await clearAllClientAuth();
        } catch (error) {
            console.log('Session init note:', error.message || 'No active session');
            await clearAllClientAuth();
        } finally {
            const isPendingOAuth = typeof window !== 'undefined' && (
                sessionStorage.getItem('perfumehub_oauth_pending') === 'true' ||
                window.location.search?.includes('code=') ||
                window.location.hash?.includes('access_token')
            );
            if (!isPendingOAuth || oauthSyncDoneRef.current) {
                setLoading(false);
            }
        }
    }, [applyBackendAuth, clearAllClientAuth, syncSupabaseSessionWithBackend]);

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
            if (typeof window !== 'undefined' && !oauthSyncDoneRef.current) {
                sessionStorage.removeItem('perfumehub_oauth_pending');
            }
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

        // Listen for Supabase OAuth session changes
        const syncGoogleLogin = () => {
            if (!supabase?.auth?.onAuthStateChange) return { unsubscribe: () => {} };
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                const isOAuthPending = typeof window !== 'undefined' && (
                    sessionStorage.getItem('perfumehub_oauth_pending') === 'true' ||
                    window.location.hash?.includes('access_token') ||
                    window.location.search?.includes('code=')
                );
                if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.access_token && isOAuthPending) {
                    await syncSupabaseSessionWithBackend(session);
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
    }, [initAuth, applyBackendAuth, syncSupabaseSessionWithBackend]);

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
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('perfumehub_oauth_pending');
            sessionStorage.removeItem('perfumehub_oauth_return_url');
        }
        oauthSyncDoneRef.current = false;
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
            oauthSyncDoneRef.current = false;
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('perfumehub_oauth_pending', 'true');
                const currentPath = window.location.pathname + window.location.search;
                if (currentPath !== '/login') {
                    sessionStorage.setItem('perfumehub_oauth_return_url', currentPath);
                }
            }
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        prompt: 'select_account'
                    }
                }
            });
            if (error) {
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('perfumehub_oauth_pending');
                    sessionStorage.removeItem('perfumehub_oauth_return_url');
                }
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
