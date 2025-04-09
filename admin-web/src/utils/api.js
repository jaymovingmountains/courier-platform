/**
 * API utilities for admin-web
 */
import axios from 'axios';

// Get the API URL from environment variables
export const API_URL = process.env.REACT_APP_API_URL || 'https://courier-platform-backend.onrender.com';

// Create an axios instance with default configuration
export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get auth config with token
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} - Headers configuration with authorization token
 */
export const getAuthConfig = (additionalHeaders = {}) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'x-portal': 'admin',
      ...additionalHeaders,
    },
  };
};

/**
 * Set up request interceptor to add auth token to requests
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['x-portal'] = 'admin';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Set up response interceptor to handle common error scenarios
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors (expired token)
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('admin-user');
      
      // If we're not already on the login page, redirect there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
        return Promise.reject(new Error('Your session has expired. Please log in again.'));
      }
    }

    const errorMessage = getErrorMessage(error);
    
    // Log detailed error info to console
    console.error('API Error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data,
    });

    return Promise.reject(error);
  }
);

/**
 * Convert API errors to user-friendly messages
 * @param {Error} error - Axios error object
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (error.response) {
    // Server responded with error status code
    const { status, data } = error.response;
    
    // Use error message from response if available
    if (data && (data.error || data.message)) {
      return data.error || data.message;
    }
    
    // Standard messages for common status codes
    switch (status) {
      case 400:
        return 'Invalid request. Please check your data and try again.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This operation could not be completed due to a conflict.';
      case 422:
        return 'Validation error. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Server error. Our team has been notified.';
      default:
        return `Request failed with status code ${status}`;
    }
  } else if (error.request) {
    // Request was made but no response received
    return 'No response from server. Please check your internet connection.';
  } else {
    // Something happened while setting up the request
    return error.message || 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Handle API login for admin users
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise} - The login response with token
 */
export const loginAdmin = async (username, password) => {
  try {
    console.log(`Attempting login to: ${API_URL}/login for user ${username}`);
    
    const response = await api.post('/login', { username, password }, {
      headers: {
        'x-portal': 'admin',
      },
    });
    
    // Store token and user data
    if (response.data && response.data.token) {
      localStorage.setItem('token', response.data.token);
      
      // Parse JWT to get user info
      try {
        const tokenParts = response.data.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          
          // Store user data
          localStorage.setItem('admin-user', JSON.stringify({
            id: payload.id,
            username: payload.username,
            role: payload.role,
            name: payload.name
          }));
        }
      } catch (parseError) {
        console.error('Error parsing JWT token:', parseError);
      }
    }
    
    return response.data;
  } catch (error) {
    // Enhanced error logging
    console.error('Login failed:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    throw error;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if authenticated, false otherwise
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  // Check if token is expired
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return false;
    
    const payload = JSON.parse(atob(tokenParts[1]));
    const expiry = payload.exp * 1000; // Convert seconds to milliseconds
    
    return Date.now() < expiry;
  } catch (error) {
    console.error('Error checking token validity:', error);
    return false;
  }
};

/**
 * Log out the current user
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('admin-user');
  window.location.href = '/login';
};

/**
 * Get full API URL for a path
 */
export const getApiUrl = (path) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_URL}/${cleanPath}`;
};

export default api; 