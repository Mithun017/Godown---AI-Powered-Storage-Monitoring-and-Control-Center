import axios from 'axios';

// Amendment #1: Axios instance configured with credentials: "include" (withCredentials: true)
// all requests use relative path '/api' handled by Vite proxy
export const apiClient = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Allow auth check calls to fail silently without force-reloading loop
      if (!error.config.url.includes('/api/auth/me')) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);
