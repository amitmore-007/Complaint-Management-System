import axios from 'axios';

// Get API URL from environment variables with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🔗 API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Override axios defaults to ensure all requests go to backend
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = 30000;

// Request interceptor for both instances
const requestInterceptor = (config) => {
  // Ensure the URL is absolute to prevent frontend server conflicts
  if (config.url && !config.url.startsWith('http')) {
    config.url = `${API_BASE_URL}${config.url.startsWith('/') ? config.url : `/${config.url}`}`;
  }
  
  const token = localStorage.getItem('auth-storage');
  if (token) {
    try {
      const authData = JSON.parse(token);
      if (authData.state?.token) {
        config.headers.Authorization = `Bearer ${authData.state.token}`;
      }
    } catch (error) {
      console.error('Error parsing auth token:', error);
    }
  }
  
  // Log the request for debugging
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
  
  return config;
};

const responseInterceptor = (response) => {
  console.log(`API Response: ${response.status} ${response.config.url}`);
  return response;
};

const errorInterceptor = (error) => {
  console.error('API Error:', error);
  
  // Handle network errors
  if (error.code === 'ERR_NETWORK') {
    console.error('Network Error: Cannot connect to server. Please check if the backend is running.');
  }
  
  // Handle timeout errors
  if (error.code === 'ECONNABORTED') {
    console.error('Request timeout: Server is taking too long to respond.');
  }
  
  // Handle 401 errors (unauthorized)
  if (error.response?.status === 401) {
    // Clear auth data and redirect to login
    localStorage.removeItem('auth-storage');
    window.location.href = '/role-selection';
  }
  
  return Promise.reject(error);
};

// Apply interceptors to both instances
api.interceptors.request.use(requestInterceptor);
api.interceptors.response.use(responseInterceptor, errorInterceptor);

axios.interceptors.request.use(requestInterceptor);
axios.interceptors.response.use(responseInterceptor, errorInterceptor);

export default api;
