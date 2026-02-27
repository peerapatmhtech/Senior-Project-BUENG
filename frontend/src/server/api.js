import axios from 'axios';
import { auth } from '../firebase/firebase';

// Create an axios instance for authenticated APIs
const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE_URL,
});

// Request interceptor to attach the Firebase ID token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('idToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag to prevent multiple simultaneous token refreshes
let isRefreshing = false;

// Response interceptor: on 401, try to refresh the Firebase token and retry once
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // mark to prevent infinite loop

      // Try to get a fresh token from Firebase
      if (auth.currentUser && !isRefreshing) {
        isRefreshing = true;
        try {
          const freshToken = await auth.currentUser.getIdToken(true); // force refresh
          localStorage.setItem('idToken', freshToken);
          isRefreshing = false;

          // Retry the original request with the new token
          originalRequest.headers['Authorization'] = `Bearer ${freshToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          console.error('Token refresh failed:', refreshError);
        }
      }

      // If no Firebase user or refresh failed → actually log out
      console.error('Authentication Error: Token is invalid or expired. Logging out.');
      localStorage.removeItem('idToken');
      localStorage.removeItem('userName');
      localStorage.removeItem('userPhoto');
      localStorage.removeItem('userEmail');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
