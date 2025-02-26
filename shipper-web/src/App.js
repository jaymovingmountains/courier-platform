import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import './App.css';

// Create Authentication Context
export const AuthContext = createContext(null);

// Navigation component
const Navigation = () => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to check if a path is active
  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo-section">
          <div className="nav-brand">
            <i className="fas fa-truck-fast logo-icon"></i>
            <span>Courier Platform</span>
          </div>
          <button 
            className="mobile-menu-toggle" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>

        <div className={`navbar-content ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <ul className="nav-links">
            <li className={isActive('/dashboard') ? 'active' : ''}>
              <Link to="/dashboard">
                <i className="fas fa-chart-line nav-icon"></i>
                <span>Dashboard</span>
              </Link>
            </li>
            {user?.role === 'shipper' && (
              <>
                <li className={isActive('/create-shipment') ? 'active' : ''}>
                  <Link to="/create-shipment">
                    <i className="fas fa-box-open nav-icon"></i>
                    <span>Create Shipment</span>
                  </Link>
                </li>
                <li className={isActive('/manage-clients') ? 'active' : ''}>
                  <Link to="/manage-clients">
                    <i className="fas fa-users nav-icon"></i>
                    <span>Manage Clients</span>
                  </Link>
                </li>
                <li className={isActive('/invoices') ? 'active' : ''}>
                  <Link to="/invoices">
                    <i className="fas fa-file-invoice-dollar nav-icon"></i>
                    <span>Invoices</span>
                  </Link>
                </li>
              </>
            )}
            <li className={isActive('/track-shipments') ? 'active' : ''}>
              <Link to="/track-shipments">
                <i className="fas fa-truck nav-icon"></i>
                <span>Track Shipments</span>
              </Link>
            </li>
            {user?.role === 'admin' && (
              <li className={isActive('/manage-users') ? 'active' : ''}>
                <Link to="/manage-users">
                  <i className="fas fa-user-cog nav-icon"></i>
                  <span>Manage Users</span>
                </Link>
              </li>
            )}
          </ul>

          <div className="navbar-actions" ref={profileRef}>
            <div className="profile-dropdown">
              <button 
                className="profile-button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="avatar">
                  <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                </div>
                <span className="username">{user?.username || 'User'}</span>
                <i className={`fas fa-chevron-${isProfileOpen ? 'up' : 'down'}`}></i>
              </button>

              {isProfileOpen && (
                <div className="dropdown-menu">
                  <Link to="/profile" onClick={() => setIsProfileOpen(false)}>
                    <i className="fas fa-user"></i>
                    Profile
                  </Link>
                  <Link to="/settings" onClick={() => setIsProfileOpen(false)}>
                    <i className="fas fa-cog"></i>
                    Settings
                  </Link>
                  <Link to="/help" onClick={() => setIsProfileOpen(false)}>
                    <i className="fas fa-question-circle"></i>
                    Help & Support
                  </Link>
                  <button onClick={handleLogout} className="logout-button">
                    <i className="fas fa-sign-out-alt"></i>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (token) => {
    console.log('Login function called with token:', token.substring(0, 20) + '...');
    
    try {
      // Decode JWT to get user role
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      console.log('Decoded token payload:', payload);
      
      localStorage.setItem('token', token);
      setUser({ role: payload.role });
      setIsAuthenticated(true);
      
      console.log('Authentication state updated:', { role: payload.role, isAuthenticated: true });
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

  // Check for token and simulate loading
  useEffect(() => {
    const checkAuth = async () => {
      // Add artificial delay for smooth preloader animation (remove in production)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Basic validation of token
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          
          if (payload && payload.exp * 1000 > Date.now()) {
            setUser({ role: payload.role });
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
      return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(user?.role)) {
      return <Navigate to="/dashboard" replace />;
    }

    return <div className="content-wrapper">{children}</div>;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, user }}>
      <Router>
        <div className="App">
          {/* Preloader */}
          <div className={`preloader ${!isLoading ? 'loaded' : ''}`}>
            <div className="loader">
              <div className="loader-logo">
                <i className="fas fa-truck-fast"></i>
              </div>
            </div>
          </div>

          {isAuthenticated && <Navigation />}

          <div className="content">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/create-shipment"
                element={
                  <ProtectedRoute roles={['shipper']}>
                    <CreateShipment />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/manage-clients"
                element={
                  <ProtectedRoute roles={['shipper']}>
                    <ManageClients />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/invoices"
                element={
                  <ProtectedRoute roles={['shipper']}>
                    <Invoices />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/track-shipments"
                element={
                  <ProtectedRoute>
                    <TrackShipments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/shipments/:id"
                element={
                  <ProtectedRoute>
                    <ViewShipment />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/manage-users"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <ManageUsers />
                  </ProtectedRoute>
                }
              />

              {/* New Routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/help"
                element={
                  <ProtectedRoute>
                    <Help />
                  </ProtectedRoute>
                }
              />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
