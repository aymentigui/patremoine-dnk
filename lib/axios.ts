import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';

const api = axios.create({
    baseURL:
        process.env.NEXT_PUBLIC_API_URL ||
        'https://intercivic-rozella-unregrettably.ngrok-free.dev/api',
    headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

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

api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API ERROR:', {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data,
        });

        if (error.response?.status === 401) {
            useAuthStore.getState().logout();

            window.location.href = '/login';

            toast.error('Votre session a expiré. Veuillez vous reconnecter.');
        }

        return Promise.reject(error);
    }
);

export default api;