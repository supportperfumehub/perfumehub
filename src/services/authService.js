import api, { setAccessToken } from './api.js';

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.accessToken) {
            setAccessToken(response.data.accessToken);
        }
        return response.data;
    },
    register: async (name, email, password) => {
        const response = await api.post('/auth/register', { name, email, password });
        return response.data;
    },
    logout: async () => {
        try {
            const backupToken = typeof window !== 'undefined' ? localStorage.getItem('perfumehub_refresh_token') : null;
            await api.post('/auth/logout', { refreshToken: backupToken }).catch(() => {});
        } finally {
            setAccessToken(null);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('perfumehub_token');
                localStorage.removeItem('perfumehub_refresh_token');
                localStorage.removeItem('perfumehub_user');
                localStorage.removeItem('perfumehub_isAdmin');
                localStorage.removeItem('perfumehub_isVendor');
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') && key.includes('-auth-token')) {
                        localStorage.removeItem(key);
                    }
                });
                window.dispatchEvent(new Event('auth-logout'));
            }
        }
    },
    getProfile: async () => {
        const response = await api.get('/users/profile');
        return response.data;
    }
};

export default authService;
