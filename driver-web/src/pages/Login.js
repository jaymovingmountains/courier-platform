import React, { useState, useContext } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user, login } = useContext(AuthContext);
  
  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Attempting login with:', { username, password });
      
      const response = await axios.post('http://localhost:3001/login', {
        username,
        password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-portal': 'driver'
        }
      });
      
      console.log('Login response:', response.data);
      
      const { token } = response.data;
      
      // Decode token to verify role
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      console.log('Token payload:', payload);
      
      // Verify the user is a driver
      if (payload.role !== 'driver') {
        setError('Access denied. Only drivers can log in to this application.');
        setLoading(false);
        return;
      }
      
      // Store token and login
      console.log('Storing token and logging in');
      login(token);
      
      // Redirect to dashboard
      console.log('Redirecting to dashboard');
      navigate('/dashboard');
      
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.response?.status === 401) {
        setError('Invalid username or password');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Login failed. Please try again later.');
      }
      
      setLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Driver Portal</h1>
          <p>Log in to access your shipments</p>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login; 