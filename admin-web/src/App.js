import React, { createContext, useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import ApproveShipments from './pages/ApproveShipments';
import ProvideQuotes from './pages/ProvideQuotes';
import VehicleManagement from './pages/VehicleManagement';
import './App.css';

// Create Authentication Context
export const AuthContext = createContext(null);

// Navigation component
const Navigation = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">Admin Portal</div>
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const login = (token) => {
    // Decode JWT to get user role
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    
    localStorage.setItem('token', token);
    setUser({ role: payload.role });
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Protected Route wrapper
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'admin') {
      logout();
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, user }}>
      <Router>
        <div className="App">
          {isAuthenticated && <Navigation />}

          <div className="content">
            <Routes>
              <Route 
                path="/login" 
                element={
                  isAuthenticated ? 
                    <Navigate to="/dashboard" replace /> : 
                    <Login />
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

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
