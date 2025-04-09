import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import ApproveShipments from './pages/ApproveShipments';
import ProvideQuotes from './pages/ProvideQuotes';
import VehicleManagement from './pages/VehicleManagement';
import AdminSetup from './pages/AdminSetup';
import ShipperManagement from './pages/ShipperManagement';
import { isAuthenticated, logout as apiLogout } from './utils/api';
import './App.css';

// Create Authentication Context
export const AuthContext = createContext(null);

// Navigation component
const Navigation = () => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">Admin Portal</div>
      <div className="nav-user">
        {user && <span>Welcome, {user.name || user.username}</span>}
      </div>
      <ul className="nav-links">
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/manage-users">Manage Users</Link></li>
        <li><Link to="/approve-shipments">Approve Shipments</Link></li>
        <li><Link to="/provide-quotes">Provide Quotes</Link></li>
        <li><Link to="/vehicles">Manage Vehicles</Link></li>
        <li>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
};

function App() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    loading: true
  });

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      
      if (authenticated) {
        // Get user info from localStorage
        try {
          const userStr = localStorage.getItem('admin-user');
          const user = userStr ? JSON.parse(userStr) : null;
          
          if (user && user.role === 'admin') {
            setAuthState({
              isAuthenticated: true,
              user,
              loading: false
            });
            return;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      
      // If we get here, user is not authenticated or not an admin
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false
      });
    };
    
    checkAuth();
  }, []);

  const login = (userData) => {
    setAuthState({
      isAuthenticated: true,
      user: userData,
      loading: false
    });
  };

  const logout = () => {
    apiLogout(); // This handles clearing localStorage and redirecting
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false
    });
  };

  // Protected Route wrapper
  const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading, user } = authState;
    
    if (loading) {
      return <div className="loading-container">Loading...</div>;
    }
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'admin') {
      logout();
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  // If still loading auth state, show loading indicator
  if (authState.loading) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: authState.isAuthenticated, 
      user: authState.user,
      login, 
      logout 
    }}>
      <Router>
        <div className="App">
          {authState.isAuthenticated && <Navigation />}

          <div className="content">
            <Routes>
              <Route 
                path="/login" 
                element={
                  authState.isAuthenticated ? 
                    <Navigate to="/dashboard" replace /> : 
                    <AdminLogin />
                } 
              />
              
              <Route 
                path="/setup" 
                element={
                  authState.isAuthenticated ? 
                    <Navigate to="/dashboard" replace /> : 
                    <AdminSetup />
                } 
              />
              
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/manage-users"
                element={
                  <ProtectedRoute>
                    <ManageUsers />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/approve-shipments"
                element={
                  <ProtectedRoute>
                    <ApproveShipments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/provide-quotes"
                element={
                  <ProtectedRoute>
                    <ProvideQuotes />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/vehicles"
                element={
                  <ProtectedRoute>
                    <VehicleManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/shipper-management/:id"
                element={
                  authState.isAuthenticated ? (
                    <>
                      <Navigation />
                      <ShipperManagement />
                    </>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              <Route path="/" element={<Navigate to={authState.isAuthenticated ? "/dashboard" : "/login"} replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
