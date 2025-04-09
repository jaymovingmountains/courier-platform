/**
 * API utilities for driver-web
 */
import axios from 'axios';

// Get the API URL from environment variables
export const API_URL = process.env.REACT_APP_API_URL || 'https://courier-platform-backend.onrender.com';

/**
 * Create an axios instance with the base URL
 */
export const api = axios.create({
  baseURL: API_URL,
});

/**
 * Get auth config with token
 */
export const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-portal': 'driver',
    },
  };
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