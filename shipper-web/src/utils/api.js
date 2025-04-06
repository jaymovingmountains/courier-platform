/**
 * API utilities for shipper-web
 */
import axios from 'axios';

// Get the API URL from environment variables
export const API_URL = process.env.REACT_APP_API_URL || 'https://courier-platform-backend.onrender.com';

/**
 * Create an axios instance with default configuration
 */
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
      'x-portal': 'shipper',
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
      config.headers['x-portal'] = 'shipper';
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
      localStorage.removeItem('shipper-user');
      
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
 * Handle API login for shipper users
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise} - The login response with token
 */
export const loginShipper = async (username, password) => {
  try {
    console.log(`Attempting login to: ${API_URL}/login for user ${username}`);
    
    const response = await api.post('/login', { username, password }, {
      headers: {
        'x-portal': 'shipper',
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
          localStorage.setItem('shipper-user', JSON.stringify({
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
  localStorage.removeItem('shipper-user');
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

/**
 * Checks the API connection and authentication status
 * @returns {Promise<Object>} Result with status and message
 */
export const checkApiConnection = async () => {
  const result = {
    apiReachable: false,
    authValid: false,
    error: null,
    message: ''
  };

  try {
    // First check if the API is reachable with a health check
    console.log(`Testing API connection to: ${API_URL}/health`);
    const healthResponse = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    
    if (healthResponse.status === 200) {
      result.apiReachable = true;
      result.message = 'API server is reachable. ';
      console.log('API health check successful:', healthResponse.data);
    }
  } catch (error) {
    result.error = error;
    result.message = `Cannot connect to API server at ${API_URL}. `;
    console.error('API connection test failed:', error.message);
    return result;
  }

  // If API is reachable, check authentication
  const token = localStorage.getItem('token');
  if (!token) {
    result.message += 'No authentication token found. Please log in again.';
    console.log('No auth token found');
    return result;
  }

  try {
    // Try to access a protected endpoint to check if token is valid
    const authResponse = await axios.get(`${API_URL}/user/profile`, getAuthConfig());
    
    if (authResponse.status === 200) {
      result.authValid = true;
      result.message += 'Authentication is valid.';
      console.log('Authentication check successful');
    }
  } catch (authError) {
    if (authError.response && authError.response.status === 401) {
      result.message += 'Your session has expired. Please log in again.';
      console.log('Auth token is invalid or expired');
    } else {
      result.message += 'Error verifying authentication. Please try again.';
      console.error('Auth check error:', authError.message);
    }
    result.error = authError;
  }

  return result;
};

export default api; 