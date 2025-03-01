import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/images/moving-mountains-logo.png';

/**
 * AdminNavigation component for the Admin Portal
 * Displays the main navigation with the Moving Mountains logo
 */
const AdminNavigation = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  
  const isActive = (path) => {
    // Check if the current path starts with the given path
    if (path !== '/admin' && path !== '/admin/dashboard') {
      return location.pathname.startsWith(path);
    }
    // Exact match for admin home and dashboard
    return location.pathname === path;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };
  
  // Get user from local storage or context
  const user = JSON.parse(localStorage.getItem('admin-user')) || { username: 'Admin' };
  
  // Admin navigation links
  const navLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'fa-tachometer-alt' },
    { name: 'Users', path: '/admin/users', icon: 'fa-users' },
    { name: 'Vehicles', path: '/admin/vehicles', icon: 'fa-truck' },
    { name: 'Reports', path: '/admin/reports', icon: 'fa-chart-bar' },
    { name: 'Settings', path: '/admin/settings', icon: 'fa-cog' },
    { name: 'Logs', path: '/admin/logs', icon: 'fa-clipboard-list' }
  ];
  
  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-secondary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/admin/dashboard">
          <img 
            src={logo} 
            alt="Moving Mountains Logo" 
            height="40" 
            className="me-2"
            style={{ maxHeight: '40px' }}
          />
          <span>Admin Portal</span>
        </Link>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          onClick={toggleMenu}
          aria-controls="navbarNav" 
          aria-expanded={isMenuOpen ? "true" : "false"} 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`} id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {navLinks.map((link, index) => (
              <li className="nav-item" key={index}>
                <Link 
                  className={`nav-link ${isActive(link.path) ? 'active' : ''}`} 
                  to={link.path}
                  aria-current={isActive(link.path) ? 'page' : undefined}
                >
                  <i className={`fas ${link.icon} me-1`}></i>
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="navbar-nav dropdown">
            <a 
              className="nav-link dropdown-toggle" 
              href="#" 
              id="navbarDropdown" 
              role="button" 
              onClick={toggleProfileDropdown}
              aria-expanded={profileDropdownOpen ? "true" : "false"}
            >
              <i className="fas fa-user-shield me-1"></i>
              {user.username}
            </a>
            <ul 
              className={`dropdown-menu dropdown-menu-end ${profileDropdownOpen ? 'show' : ''}`} 
              aria-labelledby="navbarDropdown"
            >
              <li><Link className="dropdown-item" to="/admin/profile"><i className="fas fa-user-circle me-2"></i>Profile</Link></li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('admin-user');
                    window.location.href = '/admin/login';
                  }}
                >
                  <i className="fas fa-sign-out-alt me-2"></i>Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavigation; 