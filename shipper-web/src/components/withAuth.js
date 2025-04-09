import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../utils/api';

/**
 * Higher-Order Component that provides authentication protection for shipper routes
 * @param {Component} Component - The component to wrap with authentication
 * @param {Object} options - Configuration options
 * @param {string[]} options.requiredRoles - Array of allowed roles for access (optional)
 * @returns {Component} - The protected component
 */
const withAuth = (Component, options = {}) => {
  const { requiredRoles = ['shipper'] } = options;
  
  return (props) => {
    const [authState, setAuthState] = useState({
      isChecking: true,
      isAuthenticated: false,
      user: null
    });
    
    const location = useLocation();
    
    useEffect(() => {
      const checkAuth = () => {
        const authenticated = isAuthenticated();
        
        if (authenticated) {
          // Get user info from localStorage
          try {
            const userStr = localStorage.getItem('shipper-user');
            const user = userStr ? JSON.parse(userStr) : null;
            
            if (user) {
              // Check if user has required role
              if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
                console.warn(`Access denied: Required roles "${requiredRoles.join(', ')}", but user has role "${user.role}"`);
                setAuthState({
                  isChecking: false,
                  isAuthenticated: false,
                  user: null
                });
                return;
              }
              
              setAuthState({
                isChecking: false,
                isAuthenticated: true,
                user
              });
              return;
            }
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
        
        setAuthState({
          isChecking: false,
          isAuthenticated: false,
          user: null
        });
      };
      
      checkAuth();
    }, []);
    
    if (authState.isChecking) {
      return (
        <div className="auth-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Verifying authentication...</p>
        </div>
      );
    }
    
    if (!authState.isAuthenticated) {
      // Redirect to login, but save the location they were trying to access
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    // User is authenticated and has proper role, render the component
    return <Component {...props} user={authState.user} />;
  };
};

export default withAuth; 