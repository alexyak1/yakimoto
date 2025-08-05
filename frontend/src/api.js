import axios from 'axios';
import Checkout from './components/Checkout';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

export const checkout = async (orderData) => {
    const response = await api.post('/checkout', orderData);
    return response.data;
};

export default api;
