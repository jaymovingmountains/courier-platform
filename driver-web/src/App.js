import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import './App.css';
import Navbar from './components/Navbar';
import MapTest from './components/MapTest';

// Import pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import JobDetails from './pages/JobDetails';
import UpdateStatus from './pages/UpdateStatus';

// Create Auth Context
export const AuthContext = createContext();

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const { user, loading } = React.useContext(AuthContext);
  
  console.log('ProtectedRoute rendered with:', { user, loading });
  
  useEffect(() => {
    console.log('ProtectedRoute useEffect with:', { user, loading });
    if (!loading && !user) {
      console.log('No user and not loading, navigating to /login');
      navigate('/login');
    }
  }, [user, loading, navigate]);
  
  if (loading) {
    console.log('Loading, showing loading screen');
    return <div className="loading-screen">Loading...</div>;
  }
  
  console.log('User exists, rendering children');
  return user ? children : null;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState(null);
  
  // Check for token on initial load
  useEffect(() => {
    console.log('App.js initial useEffect running');
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token ? token.substring(0, 20) + '...' : 'null');
    
    if (token) {
      try {
        // Verify token and set user
        const decoded = jwtDecode(token);
        console.log('Token decoded in initial useEffect:', decoded);
        
        // Check if token is expired
        if (decoded.exp * 1000 < Date.now()) {
          console.log('Token expired, removing from localStorage');
          localStorage.removeItem('token');
          setUser(null);
        } else if (decoded.role !== 'driver') {
          // Ensure user is a driver
          console.log('User is not a driver, removing token');
          localStorage.removeItem('token');
          setUser(null);
        } else {
          console.log('Token valid, setting user');
          setUser(decoded);
          
          // Fetch active job if any
          fetchActiveJob(token);
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('token');
        setUser(null);
      }
    } else {
      console.log('No token found in localStorage');
    }
    
    console.log('Setting loading to false');
    setLoading(false);
  }, []);
  
  // Fetch active job for the driver
  const fetchActiveJob = async (token) => {
    try {
      const response = await axios.get('http://localhost:3001/shipments', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Find the active job from the shipments
      const activeShipment = response.data.find(shipment => 
        shipment.driver_id && 
        ['assigned', 'picked_up', 'in_transit'].includes(shipment.status)
      );
      
      if (activeShipment) {
        setActiveJob(activeShipment.id);
      }
    } catch (error) {
      console.error('Error fetching active job:', error);
    }
  };
  
  // Login function
  const login = (token) => {
    console.log('App.js login function called with token:', token.substring(0, 20) + '...');
    localStorage.setItem('token', token);
    console.log('Token stored in localStorage');
    
    const decoded = jwtDecode(token);
    console.log('Token decoded:', decoded);
    
    setUser(decoded);
    console.log('User state set:', decoded);
    
    fetchActiveJob(token);
    console.log('fetchActiveJob called');
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setActiveJob(null);
  };
  
  // Auth context value
  const authContextValue = {
    user,
    loading,
    login,
    logout,
    activeJob,
    setActiveJob
  };
  
  return (
    <AuthContext.Provider value={authContextValue}>
      <Router>
        <div className="App">
          {user && <Navbar />}
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
                path="/test-map" 
                element={
                  <ProtectedRoute>
                    <MapTest />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/job/:id" 
                element={
                  <ProtectedRoute>
                    <JobDetails />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/update-status/:id" 
                element={
                  <ProtectedRoute>
                    <UpdateStatus />
                  </ProtectedRoute>
                } 
              />
              
              {/* Redirect root to dashboard if logged in, otherwise to login */}
              <Route 
                path="/" 
                element={
                  user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
                } 
              />
              
              {/* Catch all route - redirect to dashboard if logged in, otherwise to login */}
              <Route 
                path="*" 
                element={
                  user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
                } 
              />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
