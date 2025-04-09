import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ShipperService from '../services/ShipperService';
import './Login.css';

/**
 * Login page component for shipper portal
 */
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Use ShipperService for login
      const result = await ShipperService.login(credentials.username, credentials.password);
      
      // Get user data from token
      const userStr = localStorage.getItem('shipper-user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        
        // Update auth context
        login(userData);
        
        // Redirect to the page they were trying to access, or dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from);
      } else {
        throw new Error('Failed to get user data from login response');
      }
    } catch (error) {
      // Extract error message
      if (error.response && error.response.data) {
        setError(error.response.data.error || 'Authentication failed');
      } else {
        setError(error.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form-container">
        <div className="login-header">
          <h1>Moving Mountains Logistics</h1>
          <h2>Shipper Portal</h2>
        </div>
        
        <div className="login-card">
          <div className="login-info">
            <p className="text-muted">
              <small>Connected to: {API_URL}</small>
            </p>
          </div>
          
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                className="form-control"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                placeholder="Enter your username"
                disabled={isLoading}
                required
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={isLoading}
                required
              />
            </div>
            
            <button
              type="submit"
              className="btn btn-primary login-btn"
              disabled={isLoading || !credentials.username || !credentials.password}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="login-footer">
            <p>Need help? Contact support at support@movingmountains.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 