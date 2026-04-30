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
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
    refreshSubscribers.map((cb) => cb(token));
    refreshSubscribers = [];
};

const onRefreshFailed = (error) => {
    refreshSubscribers.map((cb) => cb(null, error));
    refreshSubscribers = [];
};

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
        const { config, response } = error;
        const originalRequest = config;

        if (response && response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Don't try to refresh if it's an auth endpoint
            const isAuthRequest = originalRequest.url.includes('/auth/login') || 
                                 originalRequest.url.includes('/auth/register') || 
                                 originalRequest.url.includes('/auth/refresh');

            if (isAuthRequest) {
                return Promise.reject(error);
            }

            if (!isRefreshing) {
                isRefreshing = true;
                axios.post('/api/auth/refresh', {}, { withCredentials: true })
                    .then(res => {
                        isRefreshing = false;
                        if (res.data.success) {
                            accessToken = res.data.accessToken;
                            onRefreshed(accessToken);
                        } else {
                            onRefreshFailed(error);
                            window.dispatchEvent(new Event('auth-logout'));
                        }
                    })
                    .catch(refreshError => {
                        isRefreshing = false;
                        accessToken = null;
                        onRefreshFailed(refreshError);
                        window.dispatchEvent(new Event('auth-logout'));
                    });
            }

            return new Promise((resolve, reject) => {
                subscribeTokenRefresh((token, err) => {
                    if (err) {
                        return reject(err);
                    }
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    resolve(api(originalRequest));
                });
            });
        }

        return Promise.reject(error);
    }
);
export default api;
