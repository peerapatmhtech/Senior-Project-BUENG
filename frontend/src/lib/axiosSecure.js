import axios from 'axios';

// สร้าง axios instance สำหรับ API ที่ต้องการ authentication
const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE_URL,
});

// Request interceptor - เพิ่ม token ใน header ทุก request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('idToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - จัดการ token หมดอายุ
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // ลองรีเฟรช token
      try {
        const { auth } = await import('../../../backend/src/firebase/firebase');
        if (auth.currentUser) {
          const newToken = await auth.currentUser.getIdToken(true);
          localStorage.setItem('idToken', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        // ถ้ารีเฟรชไม่ได้ ให้ redirect ไป login
        localStorage.removeItem('idToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
