import axios from 'axios';

// Create an axios instance for authenticated APIs
const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE_URL,
  withCredentials: true, // Crucial for cookies and CSRF
});

// --- CSRF Protection ---
let csrfToken = null;

// Function to get the CSRF token
export const getCsrfToken = async () => {
  if (csrfToken) {
    return csrfToken;
  }
  try {
    const { data } = await api.get('/api/csrf-token');
    csrfToken = data.csrfToken;
    console.log('✅ CSRF Token fetched and set:', csrfToken);
    return csrfToken;
  } catch (error) {
    console.error('❌ Failed to fetch CSRF token', error);
    return null;
  }
};

// Request interceptor to attach CSRF token
api.interceptors.request.use(
  async (config) => {
    const method = config.method.toLowerCase();

    // Only attach CSRF token for state-changing methods
    if (['post', 'put', 'delete', 'patch'].includes(method)) {
      const token = await getCsrfToken();
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      } else {
        console.warn(`⚠️ CSRF Token not available for ${method.toUpperCase()} request to ${config.url}. The request might be rejected.`);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// Response interceptor for handling token expiration (existing logic)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle CSRF validation failure
    if (error.response?.status === 403 && error.response?.data?.code === 'EBADCSRFTOKEN') {
        console.error('❌ CSRF Token validation failed. Refetching token and retrying...');
        csrfToken = null; // Invalidate the old token
        const newToken = await getCsrfToken(); // Fetch a new one
        if (newToken) {
            originalRequest.headers['X-CSRF-Token'] = newToken;
            return api(originalRequest); // Retry the request
        }
    }

    // Handle 401 Unauthorized for Firebase token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { auth } = await import('../firebase/firebase');
        if (auth.currentUser) {
          const newIdToken = await auth.currentUser.getIdToken(true);
          localStorage.setItem('idToken', newIdToken);
          originalRequest.headers.Authorization = `Bearer ${newIdToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Firebase Token refresh failed:', refreshError);
        localStorage.removeItem('idToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;