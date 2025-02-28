import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateShipment from './pages/CreateShipment';
import ManageClients from './pages/ManageClients';
import TrackShipments from './pages/TrackShipments';
import ViewShipment from './pages/ViewShipment';
import ManageUsers from './pages/ManageUsers';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Invoices from './pages/Invoices';
import NotificationsPage from './pages/NotificationsPage';
import './App.css';
import Navigation from './components/Navigation';
import { AuthContext } from './context/AuthContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (token) => {
    try {
      // Decode JWT to get user role
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      localStorage.setItem('token', token);
      setUser({ 
        role: payload.role,
        username: payload.username || 'User',
        email: payload.email || ''
      });
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error in login function:', error);
      alert('There was an error processing your login. Please try again.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Check for token on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Add artificial delay for smooth preloader animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Basic validation of token
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          
          if (payload && payload.exp * 1000 > Date.now()) {
            setUser({ 
              role: payload.role,
              username: payload.username || 'User',
              email: payload.email || ''
            });
            setIsAuthenticated(true);
          } else {
            logout();
          }
        } catch (e) {
          logout();
        }
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  // Protected Route wrapper
  const ProtectedRoute = ({ children, roles }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }

    if (roles && !roles.includes(user?.role)) {
      return <Navigate to="/dashboard" />;
    }

    return children;
  };

  if (isLoading) {
    return (
      <div className="preloader">
        <div className="loader">
          <div className="loader-logo">
            <i className="fas fa-truck-fast"></i>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <Dashboard />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <Dashboard />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/create-shipment"
              element={
                <ProtectedRoute roles={['shipper']}>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <CreateShipment />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manage-clients"
              element={
                <ProtectedRoute roles={['shipper']}>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <ManageClients />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/invoices"
              element={
                <ProtectedRoute roles={['shipper']}>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <Invoices />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/track-shipments"
              element={
                <ProtectedRoute>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <TrackShipments />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/shipments/:id"
              element={
                <ProtectedRoute>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <ViewShipment />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manage-users"
              element={
                <ProtectedRoute roles={['admin']}>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <ManageUsers />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <Profile />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <Settings />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/help"
              element={
                <ProtectedRoute>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <Help />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <div className="app-container">
                    <Navigation />
                    <div className="content">
                      <NotificationsPage />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
