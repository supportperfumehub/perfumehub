import api from './api.js';

export const shopService = {
    getAll: async (params = {}) => {
        const response = await api.get('/shops', { params });
        return response.data;
    },
    getNearest: async (lat, lng, radius = 50000) => {
        const response = await api.get('/shops/nearest', { params: { lat, lng, radius } });
        return response.data;
    },
    getNearestForProduct: async (lat, lng, productId) => {
        const response = await api.get('/shops/nearest-for-product', { params: { lat, lng, productId } });
        return response.data;
    },
    updateStatus: async (id, status) => {
        const response = await api.patch(`/shops/${id}/status`, { status });
        return response.data;
    }
};

export default shopService;
