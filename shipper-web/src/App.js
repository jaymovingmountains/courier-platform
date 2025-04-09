import React from 'react';
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
import SavedAddresses from './pages/SavedAddresses';
import './App.css';
import Navigation from './components/Navigation';
import { AuthProvider, useAuth } from './context/AuthContext';
import withAuth from './components/withAuth';

// Apply withAuth HOC to protected pages
const ProtectedDashboard = withAuth(Dashboard);
const ProtectedCreateShipment = withAuth(CreateShipment);
const ProtectedManageClients = withAuth(ManageClients);
const ProtectedTrackShipments = withAuth(TrackShipments);
const ProtectedViewShipment = withAuth(ViewShipment);
const ProtectedManageUsers = withAuth(ManageUsers, { requiredRoles: ['shipper_admin'] });
const ProtectedProfile = withAuth(Profile);
const ProtectedSettings = withAuth(Settings);
const ProtectedInvoices = withAuth(Invoices);
const ProtectedNotifications = withAuth(NotificationsPage);
const ProtectedSavedAddresses = withAuth(SavedAddresses);

/**
 * Main application layout with navigation
 */
const AppLayout = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  return (
    <>
      {isAuthenticated && <Navigation />}
      <div className="content">
        {children}
      </div>
    </>
  );
};

/**
 * Main App component with routes
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppLayout>
            <Routes>
              {/* Public routes */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />

              <Route path="/help" element={<Help />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedDashboard />} />
              <Route path="/create-shipment" element={<ProtectedCreateShipment />} />
              <Route path="/manage-clients" element={<ProtectedManageClients />} />
              <Route path="/track-shipments" element={<ProtectedTrackShipments />} />
              <Route path="/view-shipment/:id" element={<ProtectedViewShipment />} />
              <Route path="/manage-users" element={<ProtectedManageUsers />} />
              <Route path="/profile" element={<ProtectedProfile />} />
              <Route path="/settings" element={<ProtectedSettings />} />
              <Route path="/invoices" element={<ProtectedInvoices />} />
              <Route path="/notifications" element={<ProtectedNotifications />} />
              <Route path="/saved-addresses" element={<ProtectedSavedAddresses />} />

              {/* Default route */}
              <Route 
                path="/" 
                element={<Navigate to="/dashboard" replace />} 
              />

              {/* Catch-all route for 404 */}
              <Route 
                path="*" 
                element={
                  <div className="not-found">
                    <h1>404</h1>
                    <h2>Page Not Found</h2>
                    <p>The page you are looking for does not exist or has been moved.</p>
                  </div>
                } 
              />
            </Routes>
          </AppLayout>
        </div>
      </Router>
    </AuthProvider>
  );
}

/**
 * Public route component to redirect authenticated users
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading application...</p>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

export default App;
