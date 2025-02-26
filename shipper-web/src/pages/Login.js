import React, { useContext, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import { useNavigate, Navigate } from 'react-router-dom';
import * as Yup from 'yup';
import axios from 'axios';
import { AuthContext } from '../App';
import { ReactComponent as Logo } from '../logo.svg';
import './Login.css';

const loginSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, 'Username must be at least 3 characters')
    .required('Username is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (values, { setSubmitting, setFieldError, setStatus }) => {
    try {
      console.log('Login attempt with values:', values);
      setDebugInfo(null);
      
      const response = await axios.post('http://localhost:3001/login', values, {
        headers: {
          'Content-Type': 'application/json',
          'x-portal': 'shipper'
        }
      });
      
      console.log('Login response:', response.data);
      const { token } = response.data;
      
      // Update authentication context and localStorage
      login(token);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error details:', error);
      
      // Set debug info for display
      setDebugInfo({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      if (error.response?.status === 401) {
        setStatus('Invalid username or password');
      } else if (error.response?.status === 403) {
        setStatus('Access denied. Only shippers can log in to this portal.');
      } else {
        setStatus('An error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="login-left-panel">
        <div className="login-left-content">
          <h1>Logistics Management Platform</h1>
          <p>Streamline your shipping operations with our comprehensive logistics solution.</p>
          <div className="login-features">
            <div className="feature-item">
              <div className="feature-icon">📦</div>
              <div className="feature-text">
                <h3>Shipment Tracking</h3>
                <p>Real-time updates on all your shipments</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🚚</div>
              <div className="feature-text">
                <h3>Fleet Management</h3>
                <p>Optimize your delivery operations</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <div className="feature-text">
                <h3>Analytics Dashboard</h3>
                <p>Insights to improve efficiency</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="login-right-panel">
        <div className="login-box">
          <div className="login-header">
            <div className="logo-container">
              <Logo className="login-logo" />
            </div>
            <h2>Shipper Portal</h2>
            <p>Sign in to your account</p>
            <p className="login-hint">Use username: <strong>testshipper</strong> and password: <strong>shipper123</strong></p>
          </div>
          
          <Formik
            initialValues={{
              username: 'testshipper',
              password: 'shipper123',
            }}
            validationSchema={loginSchema}
            onSubmit={handleLogin}
          >
            {({ errors, touched, isSubmitting, status }) => (
              <Form>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <div className="input-container">
                    <Field
                      type="text"
                      name="username"
                      id="username"
                      className={`form-control ${
                        errors.username && touched.username ? 'is-invalid' : ''
                      }`}
                      placeholder="Enter your username"
                    />
                  </div>
                  {errors.username && touched.username && (
                    <div className="error-message">{errors.username}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-container">
                    <Field
                      type={showPassword ? "text" : "password"}
                      name="password"
                      id="password"
                      className={`form-control ${
                        errors.password && touched.password ? 'is-invalid' : ''
                      }`}
                      placeholder="Enter your password"
                    />
                    <button 
                      type="button" 
                      className="password-toggle" 
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  {errors.password && touched.password && (
                    <div className="error-message">{errors.password}</div>
                  )}
                </div>

                <div className="form-options">
                  <div className="remember-me">
                    <input type="checkbox" id="remember" />
                    <label htmlFor="remember">Remember me</label>
                  </div>
                  <button 
                    type="button" 
                    className="forgot-password"
                    onClick={() => alert('Password reset functionality will be implemented soon.')}
                  >
                    Forgot password?
                  </button>
                </div>

                {status && (
                  <div className="error-message text-center mb-3">{status}</div>
                )}
                
                {debugInfo && (
                  <div className="debug-info">
                    <h4>Debug Info:</h4>
                    <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                  </div>
                )}

                <button
                  type="submit"
                  className="login-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </Form>
            )}
          </Formik>
          
          <div className="login-footer">
            <p>Don't have an account? 
              <button 
                type="button"
                className="contact-admin-link"
                onClick={() => alert('Please contact your administrator to create an account.')}
              >
                Contact admin
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 