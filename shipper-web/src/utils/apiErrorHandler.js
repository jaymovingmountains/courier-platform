/**
 * Utility for standardized API error handling across the application
 */
import { getErrorMessage } from './api';

/**
 * Processes an API error and returns a user-friendly message
 * @param {Error} error - The error object from axios catch block
 * @param {Object} options - Additional options
 * @param {string} options.endpoint - The API endpoint that was called
 * @param {string} options.operation - Description of the operation (e.g., 'fetching shipments')
 * @param {Object} options.additionalData - Any additional data to include in logs
 * @returns {string} A user-friendly error message
 */
export const handleApiError = (error, options = {}) => {
  const { endpoint = 'API', operation = 'performing operation', additionalData = {} } = options;
  
  // Log detailed error information to console
  console.error(`Error ${operation}:`, {
    endpoint,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    message: error.message,
    ...additionalData
  });
  
  // Generate user-friendly message based on error type
  let userFriendlyMessage = `Failed ${operation}. Please try again.`;
  
  if (error.response) {
    // The server responded with an error status
    switch (error.response.status) {
      case 401:
        userFriendlyMessage = 'Your session has expired. Please log in again.';
        break;
      case 403:
        userFriendlyMessage = 'You do not have permission to perform this action.';
        break;
      case 404:
        userFriendlyMessage = 'The requested resource was not found.';
        break;
      case 429:
        userFriendlyMessage = 'Too many requests. Please try again later.';
        break;
      case 500:
      case 502:
      case 503:
        userFriendlyMessage = 'Server error. Our team has been notified.';
        break;
      default:
        // Try to extract error message from response if available
        userFriendlyMessage = error.response.data?.error || 
                             error.response.data?.message || 
                             `Error: ${error.response.statusText || 'Unknown error'}`;
    }
  } else if (error.request) {
    // The request was made but no response was received
    userFriendlyMessage = 'No response from server. Please check your internet connection.';
  } else {
    // Something happened in setting up the request
    userFriendlyMessage = 'An error occurred while processing your request. Please try again.';
  }
  
  return userFriendlyMessage;
};

/**
 * Creates an axios request config with authentication token
 * @param {Object} options - Optional configuration
 * @returns {Object} Axios request config with auth header
 */
export const getAuthConfig = (options = {}) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.warn('No authentication token found in localStorage!');
  } else {
    console.log('Using token for auth request:', token.substring(0, 10) + '...');
  }
  
  return {
    headers: {
      'Authorization': `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
};

/**
 * Handles errors for form submissions 
 * @param {Error} error - The error object from catch block
 * @param {Function} setStatus - Function to set form status message
 * @param {Function} setFieldError - Function to set field-specific errors
 * @param {Object} options - Additional options
 */
export const handleFormError = (error, setStatus, setFieldError = null, options = {}) => {
  const userMessage = getErrorMessage(error);
  
  // Set the general form status message
  setStatus(userMessage);
  
  // If we have field errors in the response and a setFieldError function, set them
  if (setFieldError && error.response?.data?.fieldErrors) {
    const fieldErrors = error.response.data.fieldErrors;
    Object.keys(fieldErrors).forEach(field => {
      setFieldError(field, fieldErrors[field]);
    });
  }
};

/**
 * Handles API errors for non-form components
 * @param {Error} error - The error object from axios catch block
 * @param {Function} setError - Function to set error state
 * @param {Object} options - Additional options
 */
export const handleComponentError = (error, setError, options = {}) => {
  const userMessage = getErrorMessage(error);
  setError(userMessage);
  
  // Log error details to console
  console.error('API Error:', {
    type: options.operation || 'API operation',
    message: userMessage,
    status: error.response?.status,
    data: error.response?.data,
    ...options
  });
};

/**
 * Format validation errors from API for form display
 * @param {Object} errors - Error object from API
 * @param {Function} setFieldError - Formik setFieldError function
 * @param {Function} setStatus - Formik setStatus function
 */
export const formatValidationErrors = (errors, setFieldError, setStatus) => {
  if (!errors) return;
  
  // Handle field-specific errors
  if (errors.fieldErrors) {
    Object.entries(errors.fieldErrors).forEach(([field, message]) => {
      setFieldError(field, Array.isArray(message) ? message[0] : message);
    });
  }
  
  // Handle general errors
  if (errors.error || errors.message) {
    setStatus(errors.error || errors.message);
  } else if (!errors.fieldErrors) {
    setStatus('An error occurred. Please check your input and try again.');
  }
}; 