import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/images/moving-mountains-logo.png';

/**
 * AdminLogin component for the Admin Portal
 * Displays a login form with the Moving Mountains logo
 */
const AdminLogin = () => {
  const navigate = useNavigate();
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
      // In a real app, make an API call to authenticate
      const response = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portal': 'admin' // Specify admin portal
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store the token
      localStorage.setItem('token', data.token);
      
      // Mock user data for example
      localStorage.setItem('admin-user', JSON.stringify({
        username: credentials.username,
        role: 'admin'
      }));

      // Redirect to admin dashboard
      navigate('/admin/dashboard');
    } catch (error) {
      setError(error.message);
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
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100" 
            disabled={isLoading}
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