import React, { createContext, useState, useEffect, useContext } from 'react';
import { isAuthenticated, logout as apiLogout } from '../utils/api';

// Create the AuthContext
export const AuthContext = createContext(null);

/**
 * AuthProvider component to wrap application with authentication context
 * @param {Object} props - Component props
 * @returns {JSX.Element} Provider component
 */
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      // Add artificial delay for smooth preloader animation (if needed)
      // await new Promise(resolve => setTimeout(resolve, 800));
      
      const authenticated = isAuthenticated();
      if (authenticated) {
        try {
          // Get user info from localStorage
          const userStr = localStorage.getItem('shipper-user');
          const user = userStr ? JSON.parse(userStr) : null;
          
          if (user && user.role === 'shipper') {
            setAuthState({
              isAuthenticated: true,
              user,
              loading: false,
            });
            return;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      
      // If we get here, user is not authenticated or not a shipper
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
    };
    
    checkAuth();
  }, []);

  /**
   * Login a user with the provided token data
   * @param {Object} userData - User data from JWT token
   */
  const login = (userData) => {
    setAuthState({
      isAuthenticated: true,
      user: userData,
      loading: false,
    });
  };

  /**
   * Logout the current user
   */
  const logout = () => {
    apiLogout(); // This handles clearing localStorage and redirecting
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
    });
  };

  /**
   * Update user data in auth state
   * @param {Object} userData - User data to update
   */
  const updateUser = (userData) => {
    setAuthState(prev => ({
      ...prev,
      user: { ...prev.user, ...userData }
    }));
    
    // Also update in localStorage
    try {
      const userStr = localStorage.getItem('shipper-user');
      if (userStr) {
        const user = JSON.parse(userStr);
        localStorage.setItem('shipper-user', JSON.stringify({
          ...user,
          ...userData
        }));
      }
    } catch (error) {
      console.error('Error updating user data in localStorage:', error);
    }
  };

  // The value to be provided to consumers of this context
  const authContextValue = {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    loading: authState.loading,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the auth context
 * @returns {Object} The auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider; 