import api from './api.js';

export const orderService = {
    getAll: async (params = {}) => {
        const response = await api.get('/orders', { params });
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/orders/${id}`);
        return response.data;
    },
    create: async (orderData) => {
        const response = await api.post('/orders', orderData);
        return response.data;
    },
    updateStatus: async (id, status) => {
        const response = await api.patch(`/orders/${id}/status`, { status });
        return response.data;
    }
};

export default orderService;
