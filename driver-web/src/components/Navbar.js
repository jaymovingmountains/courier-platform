import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, activeJob } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  if (!user) return null;
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/dashboard">Driver Portal</Link>
        </div>
        
        <div className="navbar-links">
          <Link 
            to="/dashboard" 
            className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          
          {activeJob && (
            <Link 
              to={`/job/${activeJob}`} 
              className={`nav-link active-job ${location.pathname === `/job/${activeJob}` ? 'active' : ''}`}
            >
              Active Job
            </Link>
          )}
        </div>
        
        <div className="navbar-actions">
          <span className="user-info">
            {user.username || 'Driver'}
          </span>
          <button 
            className="logout-button"
            onClick={handleLogout}
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 