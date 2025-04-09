import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/images/moving-mountains-logo.png';
import { API_URL, api } from '../utils/api';

/**
 * AdminSetup component for creating the first admin account
 * This page should only be accessible when no admin accounts exist
 */
const AdminSetup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canSetup, setCanSetup] = useState(true);

  // Check if setup is possible (no admin accounts exist yet)
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        // Try to access the setup status endpoint
        const response = await api.get('/admin/setup/status');
        setCanSetup(response.data.canSetup);
        
        if (!response.data.canSetup) {
          setError('Admin accounts already exist. Setup is not allowed.');
        }
      } catch (error) {
        // If the endpoint doesn't exist, we'll assume setup is allowed
        // In a production environment, this should be handled more gracefully
        console.log('Setup status check failed, proceeding with setup form');
      }
    };
    
    checkSetupStatus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // Submit the setup request
      await api.post('/admin/setup', {
        username: formData.username,
        password: formData.password,
        name: formData.name
      });

      setSuccess('Admin account created successfully! You can now log in.');
      
      // Reset form
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        name: ''
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      if (error.response && error.response.data) {
        setError(error.response.data.error || 'Setup failed');
      } else {
        setError(error.message || 'Setup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-setup-container">
      <div className="admin-setup-card">
        <div className="text-center mb-4">
          <img 
            src={logo} 
            alt="Moving Mountains Logo" 
            style={{ maxWidth: '220px', marginBottom: '20px' }}
          />
          <h2 className="mb-2">Admin Setup</h2>
          <p className="text-muted mb-4">
            Create your first administrator account
          </p>
          <p className="text-muted">
            <small>Connected to: {API_URL}</small>
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}

        {!canSetup && (
          <div className="alert alert-warning" role="alert">
            Admin accounts already exist. Please use the login page instead.
            <div className="mt-3">
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/login')}
              >
                Go to Login
              </button>
            </div>
          </div>
        )}

        {canSetup && (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="name" className="form-label">Display Name</label>
              <input
                type="text"
                className="form-control"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                disabled={isLoading}
              />
              <div className="form-text">This will be displayed in the admin dashboard</div>
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-100" 
              disabled={isLoading || 
                !formData.username || 
                !formData.password || 
                !formData.confirmPassword ||
                formData.password !== formData.confirmPassword
              }
            >
              {isLoading ? 'Creating Account...' : 'Create Admin Account'}
            </button>

            <div className="mt-3 text-center">
              <small className="text-muted">
                This setup page is only accessible when no admin accounts exist in the system.
              </small>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .admin-setup-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #f8f9fa;
        }
        
        .admin-setup-card {
          width: 100%;
          max-width: 500px;
          padding: 2rem;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default AdminSetup; 