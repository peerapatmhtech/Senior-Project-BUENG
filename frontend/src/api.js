import axios from 'axios';

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

// Optional: Response interceptor for handling 401 Unauthorized errors
// This could be used to automatically log out the user if the token is expired/invalid
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // For example, clear local storage and redirect to login
      console.error("Authentication Error: Token is invalid or expired. Logging out.");
      localStorage.removeItem('idToken');
      localStorage.removeItem('userName');
      localStorage.removeItem('userPhoto');
      localStorage.removeItem('userEmail');
      // This might cause a hard redirect. A more sophisticated implementation
      // might use a router instance or a global state to handle this.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;