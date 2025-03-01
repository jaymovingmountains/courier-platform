import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useNotifications from '../hooks/useNotifications';
import NotificationBadge from './NotificationBadge';
import logo from '../assets/images/moving-mountains-logo.png'; // Using PNG file

const Navigation = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { 
    unreadCount, 
    pausePolling, 
    resumePolling, 
    fetchUnreadCount 
  } = useNotifications();
  
  // Fetch unread count when component mounts
  useEffect(() => {
    fetchUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const isActive = (path) => {
    // Check if the current path starts with the given path
    // This helps with matching parent paths like /shipments for /shipments/123
    if (path !== '/' && path !== '/dashboard') {
      return location.pathname.startsWith(path);
    }
    // Exact match for home and dashboard
    return location.pathname === path;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };
  
  // Define navigation links based on user role
  const getNavLinks = () => {
    const links = [
      { name: 'Dashboard', path: '/dashboard', icon: 'fa-tachometer-alt', roles: ['shipper', 'admin'] },
      { name: 'Shipments', path: '/shipments', icon: 'fa-truck', roles: ['shipper', 'admin'] },
      { name: 'Create Shipment', path: '/shipments/new', icon: 'fa-plus', roles: ['shipper'] },
      { name: 'Clients', path: '/manage-clients', icon: 'fa-users', roles: ['shipper'] },
      { name: 'Invoices', path: '/invoices', icon: 'fa-file-invoice-dollar', roles: ['shipper'] },
    ];
    
    // Only allow admin to access these pages
    // Note: App.js has routes for both /users and /manage-users, both pointing to ManageUsers component
    if (user && user.role === 'admin') {
      links.push({ name: 'Manage Users', path: '/manage-users', icon: 'fa-users-cog', roles: ['admin'] });
    }
    
    // Common links for all authenticated users
    links.push({ 
      name: 'Notifications', 
      path: '/notifications', 
      icon: 'fa-bell', 
      badge: unreadCount > 0 ? unreadCount : null,
      roles: ['shipper', 'admin'] 
    });
    links.push({ name: 'Help', path: '/help', icon: 'fa-question-circle', roles: ['shipper', 'admin'] });
    
    return links.filter(link => !link.roles || (user && link.roles.includes(user.role)));
  };
  
  const navLinks = getNavLinks();
  
  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/dashboard">
          <img 
            src={logo} 
            alt="Moving Mountains Logo" 
            height="40" 
            className="me-2"
            style={{ maxHeight: '40px' }}
          />
          <span>Shipper Portal</span>
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
                  {link.badge && link.name === 'Notifications' && (
                    <span 
                      className="badge bg-danger ms-1 notification-count" 
                      style={{
                        fontSize: '0.7em',
                        verticalAlign: 'middle',
                        borderRadius: '10px'
                      }}
                      data-testid="nav-notification-badge"
                    >
                      {link.badge > 99 ? '99+' : link.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          
          {user && (
            <div className="navbar-nav dropdown">
              <a 
                className="nav-link dropdown-toggle" 
                href="#" 
                id="navbarDropdown" 
                role="button" 
                onClick={toggleProfileDropdown}
                aria-expanded={profileDropdownOpen ? "true" : "false"}
              >
                <i className="fas fa-user-circle me-1"></i>
                {user.username || user.email || 'User'}
              </a>
              <ul 
                className={`dropdown-menu dropdown-menu-end ${profileDropdownOpen ? 'show' : ''}`} 
                aria-labelledby="navbarDropdown"
              >
                <li><Link className="dropdown-item" to="/profile"><i className="fas fa-user me-2"></i>Profile</Link></li>
                <li><Link className="dropdown-item" to="/settings"><i className="fas fa-cog me-2"></i>Settings</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item" onClick={logout}>
                    <i className="fas fa-sign-out-alt me-2"></i>Logout
                  </button>
                </li>
              </ul>
            </div>
          )}
          
          {!user && (
            <div className="navbar-nav">
              <Link className="nav-link" to="/login">Login</Link>
            </div>
          )}
          
          {/* Standalone Notifications Badge in header */}
          {user && (
            <Link 
              to="/notifications" 
              className="nav-link d-none d-lg-block position-relative ms-2"
              onMouseEnter={pausePolling}
              onMouseLeave={resumePolling}
              aria-label="View notifications"
              data-testid="notification-badge-container"
            >
              <NotificationBadge 
                count={unreadCount} 
                pulse={unreadCount > 0}
                color="#dc3545"
                maxCount={99}
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navigation; 