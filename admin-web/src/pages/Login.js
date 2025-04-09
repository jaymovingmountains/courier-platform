import React, { useContext, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import { useNavigate, Navigate } from 'react-router-dom';
import * as Yup from 'yup';
import axios from 'axios';
import { AuthContext } from '../App';
import './Login.css';
import { API_URL } from '../utils/api';

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
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (values, { setSubmitting, setFieldError, setStatus }) => {
    try {
      setIsLoading(true);
      setLoginError(null);
      
      const response = await axios.post(`${API_URL}/login`, values);
      const { token } = response.data;
      
      // Decode JWT to verify admin role
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      if (payload.role !== 'admin') {
        setStatus('Access denied. Admin privileges required.');
        return;
      }

      // Update authentication context and localStorage
      login(token);
      navigate('/dashboard');
    } catch (error) {
      if (error.response?.status === 401) {
        setStatus('Invalid username or password');
      } else {
        setStatus('An error occurred. Please try again.');
      }
      console.error('Login error:', error);
    } finally {
      setSubmitting(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Admin Login</h1>
        <Formik
          initialValues={{
            username: '',
            password: '',
          }}
          validationSchema={loginSchema}
          onSubmit={handleLogin}
        >
          {({ errors, touched, isSubmitting, status }) => (
            <Form>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <Field
                  type="text"
                  name="username"
                  id="username"
                  className={`form-control ${
                    errors.username && touched.username ? 'is-invalid' : ''
                  }`}
                  placeholder="Enter your username"
                />
                {errors.username && touched.username && (
                  <div className="error-message">{errors.username}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <Field
                  type="password"
                  name="password"
                  id="password"
                  className={`form-control ${
                    errors.password && touched.password ? 'is-invalid' : ''
                  }`}
                  placeholder="Enter your password"
                />
                {errors.password && touched.password && (
                  <div className="error-message">{errors.password}</div>
                )}
              </div>

              {status && (
                <div className="error-message text-center mb-3">{status}</div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={isSubmitting || isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Login; 