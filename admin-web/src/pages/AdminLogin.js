import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/images/moving-mountains-logo.png';
import { isAuthenticated, API_URL } from '../utils/api';
import AdminService from '../services/AdminService';
import { AuthContext } from '../App';

/**
 * AdminLogin component for the Admin Portal
 * Displays a login form with the Moving Mountains logo
 */
const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already authenticated on component mount
  useEffect(() => {
    if (isAuthenticated()) {
      // Redirect to the page they were trying to access, or dashboard
      const from = location.state?.from?.pathname || '/admin/dashboard';
      navigate(from);
    }
  }, [navigate, location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Use AdminService for login - no need to store result as we use localStorage
      await AdminService.login(credentials.username, credentials.password);
      
      // Get user data from token
      const userStr = localStorage.getItem('admin-user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        
        // Update auth context
        login(userData);
        
        // Redirect to the page they were trying to access, or dashboard
        const from = location.state?.from?.pathname || '/admin/dashboard';
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
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="text-center mb-4">
          <img 
            src={logo} 
            alt="Moving Mountains Logo" 
            style={{ maxWidth: '220px', marginBottom: '20px' }}
          />
          <h2 className="mb-4">Admin Portal</h2>
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
          <div className="mb-3">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              placeholder="Enter admin username"
              required
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100" 
            disabled={isLoading || !credentials.username || !credentials.password}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="mt-3 text-center">
            <small className="text-muted">
              Access restricted to authorized administrators only.
            </small>
          </div>
        </form>
      </div>

      <style jsx>{`
        .admin-login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #f8f9fa;
        }
        
        .admin-login-card {
          width: 100%;
          max-width: 420px;
          padding: 2rem;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default AdminLogin; 