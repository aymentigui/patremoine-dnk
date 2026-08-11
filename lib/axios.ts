import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://intercivic-rozella-unregrettably.ngrok-free.dev/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Interceptor باش نلصقو الـ Token في كل Request
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor باش نكابتييوا أخطاء السيرفر (مثلا Token مات أو unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // إذا الـ Token مات، نخرجوه وندوه للـ Login
            useAuthStore.getState().logout();
            window.location.href = '/login';
            toast.error('Votre session a expiré. Veuillez vous reconnecter.');
        }
        return Promise.reject(error);
    }
);

export default api;