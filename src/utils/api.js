import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true // Important for cookies
});

// Memoized access token (in-memory)
let accessToken = null;

export const setAccessToken = (token) => {
    accessToken = token;
};

// Request Interceptor: Inject Access Token
api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

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
            accessToken = null;
            // Notify AuthContext or event bus to logout
            window.dispatchEvent(new Event('auth-logout'));
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            // Attempt invisible refresh
            const response = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
            
            if (response.data.success) {
                accessToken = response.data.accessToken;
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            }
        } catch (refreshError) {
            accessToken = null;
            window.dispatchEvent(new Event('auth-logout'));
            return Promise.reject(refreshError);
        }

        return Promise.reject(error);
    }
);

export default api;
