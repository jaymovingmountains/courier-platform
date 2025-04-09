/**
 * API utilities for admin-web
 */
import axios from 'axios';

// Get the API URL from environment variables with clear logging
export const API_URL = process.env.REACT_APP_API_URL || 'https://mml-platform-tau.vercel.app';
console.log('API_URL configured as:', API_URL);

// Create an axios instance with default configuration
export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log API configuration on startup
console.log('API client configured with baseURL:', API_URL);

/**
 * Get auth config with token
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} - Headers configuration with authorization token
 */
export const getAuthConfig = (additionalHeaders = {}) => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('getAuthConfig called but no token found in localStorage');
  }
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
    } else {
      console.warn(`API request to ${config.url} made without auth token`);
    }
    // Log outgoing requests in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('API request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Set up response interceptor to handle common error scenarios
 */
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const errorDetails = {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    };
    
    // Log all API errors with details
    console.error('❌ API Error:', errorDetails);
    
    // Handle 401 Unauthorized errors (expired token)
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('Authentication failure detected, clearing token and redirecting to login');
      
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('admin-user');
      
      // If we're not already on the login page, redirect there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
        return Promise.reject(new Error('Your session has expired. Please log in again.'));
      }
    }
    
    // Handle network errors specifically
    if (error.message === 'Network Error') {
      console.error('Network error detected. API server may be unreachable at:', API_URL);
      return Promise.reject(new Error(`Network error: Unable to connect to API server at ${API_URL}. Please check your internet connection and try again.`));
    }

    // Handle CORS errors which may appear as network errors
    if (error.message.includes('CORS')) {
      console.error('CORS error detected when connecting to:', API_URL);
      return Promise.reject(new Error(`CORS error: The API server at ${API_URL} is not configured to accept requests from this origin. Please contact support.`));
    }

    const errorMessage = getErrorMessage(error);
    
    return Promise.reject(error);
  }
);

/**
 * Convert API errors to user-friendly messages with more details
 * @param {Error} error - Axios error object
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (error.response) {
    // Server responded with error status code
    const { status, data } = error.response;
    const endpoint = error.config?.url || 'unknown endpoint';
    
    console.log(`API error details - Status: ${status}, Endpoint: ${endpoint}, Data:`, data);
    
    // Use error message from response if available
    if (data && (data.error || data.message)) {
      return `${data.error || data.message} (${status})`;
    }
    
    // Standard messages for common status codes
    switch (status) {
      case 400:
        return `Invalid request to ${endpoint}. Please check your data and try again.`;
      case 401:
        return `Authentication failed for ${endpoint}. Please log in again.`;
      case 403:
        return `You do not have permission to access ${endpoint}.`;
      case 404:
        return `The requested resource at ${endpoint} was not found.`;
      case 409:
        return `Operation at ${endpoint} could not be completed due to a conflict.`;
      case 422:
        return `Validation error at ${endpoint}. Please check your input.`;
      case 429:
        return `Too many requests to ${endpoint}. Please try again later.`;
      case 500:
      case 502:
      case 503:
      case 504:
        return `Server error (${status}) at ${endpoint}. Our team has been notified.`;
      default:
        return `Request to ${endpoint} failed with status code ${status}`;
    }
  } else if (error.request) {
    // Request was made but no response received
    console.error('No response received from server:', error.request);
    return `No response from server at ${API_URL}. Please check your internet connection.`;
  } else {
    // Something happened while setting up the request
    console.error('Error setting up request:', error.message);
    return error.message || 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Handle API login for admin users with enhanced error logging
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
    
    console.log('Login response status:', response.status);
    
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
          
          console.log('User authenticated successfully:', payload.username);
        }
      } catch (parseError) {
        console.error('Error parsing JWT token:', parseError);
      }
    } else {
      console.warn('Login successful but no token received:', response.data);
    }
    
    return response.data;
  } catch (error) {
    // Enhanced error logging
    console.error('Login failed:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Provide more specific error message based on the error type
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        throw new Error('Invalid username or password. Please try again.');
      } else if (status === 403) {
        throw new Error('You do not have permission to access the admin portal.');
      } else if (data?.error) {
        throw new Error(`Login failed: ${data.error}`);
      }
    } else if (error.message === 'Network Error') {
      throw new Error(`Cannot connect to server at ${API_URL}. Please check your internet connection.`);
    }
    
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