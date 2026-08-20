import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

// Memoized access token (with localStorage fallback for instant boot)
let accessToken = typeof window !== 'undefined' ? localStorage.getItem('perfumehub_token') : null;

export const setAccessToken = (token) => {
    accessToken = token;
    if (typeof window !== 'undefined') {
        if (token) {
            localStorage.setItem('perfumehub_token', token);
        } else {
            localStorage.removeItem('perfumehub_token');
        }
    }
};

// Request Interceptor: Inject Access Token and Normalize URL
api.interceptors.request.use(
    (config) => {
        // Aggressive Fail-Safe: Replace any double /api prefix anywhere in the URL
        if (config.url) {
            config.url = config.url.replace(/\/api\/api\//g, '/api/');
            
            // If we have an absolute baseURL, ensure the URL doesn't repeat /api
            if (config.baseURL?.endsWith('/api') && config.url.startsWith('/api/')) {
                config.url = config.url.substring(4);
            }
        }
        
        const tokenToUse = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('perfumehub_token') : null);
        if (tokenToUse) {
            config.headers.Authorization = `Bearer ${tokenToUse}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response Interceptor: Handle 401 and Refresh Token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If generic error or not 401, reject
        if (!error.response || error.response.status !== 401) {
            return Promise.reject(error);
        }

        // Don't try to refresh if it's an auth endpoint (prevents masking login errors)
        const isAuthRequest = originalRequest.url.includes('/auth/login') || 
                             originalRequest.url.includes('/auth/register') || 
                             originalRequest.url.includes('/auth/refresh');

        if (isAuthRequest) {
            return Promise.reject(error);
        }

        // If we already tried refreshing once and failed, logout
        if (originalRequest._retry) {
            setAccessToken(null);
            // Notify AuthContext or event bus to logout
            window.dispatchEvent(new Event('auth-logout'));
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
            return new Promise(function(resolve, reject) {
                failedQueue.push({ resolve, reject });
            })
            .then(token => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            })
            .catch(err => {
                return Promise.reject(err);
            });
        }

        isRefreshing = true;

        try {
            // Attempt invisible refresh using both cookies and localStorage backup token
            const backupRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('perfumehub_refresh_token') : null;
            const response = await api.post('/auth/refresh', { refreshToken: backupRefreshToken }, { withCredentials: true });
            
            if (response.data.success) {
                const newAccessToken = response.data.accessToken;
                setAccessToken(newAccessToken);
                if (response.data.refreshToken && typeof window !== 'undefined') {
                    localStorage.setItem('perfumehub_refresh_token', response.data.refreshToken);
                }
                processQueue(null, newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                isRefreshing = false;
                return api(originalRequest);
            }
        } catch (refreshError) {
            processQueue(refreshError, null);
            setAccessToken(null);
            if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
                window.dispatchEvent(new Event('auth-logout'));
            }
            isRefreshing = false;
            return Promise.reject(refreshError);
        }

        isRefreshing = false;
        return Promise.reject(error);
    }
);

export default api;
