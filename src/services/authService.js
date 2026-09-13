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
            await api.post('/auth/logout');
        } finally {
            setAccessToken(null);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('perfumehub_token');
                localStorage.removeItem('perfumehub_refresh_token');
            }
        }
    },
    getProfile: async () => {
        const response = await api.get('/users/profile');
        return response.data;
    }
};

export default authService;
