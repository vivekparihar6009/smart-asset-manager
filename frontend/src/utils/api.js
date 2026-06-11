import axios from 'axios';

// Create a configured Axios instance
const api = axios.create({
  baseURL: '', // Relative URL redirects to proxy config
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject JWT token into headers of outbound requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch global API errors (e.g. 401 Unauthorized token expirations)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // If server responds with 401/403, clean up session
      if (error.response.status === 401 || error.response.status === 403) {
        localStorage.removeItem('token');
        // Let the application state handle redirection naturally by clearing credentials
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error.response.data);
    }
    return Promise.reject({ message: 'Network connection failure. Please try again.' });
  }
);

export default api;
