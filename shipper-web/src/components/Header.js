import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Button,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.png';
import NotificationBadge from './NotificationBadge';
import NotificationsPanel from './NotificationsPanel';
import useNotifications from '../hooks/useNotifications';

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Profile menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // Mobile menu state
  const [mobileAnchorEl, setMobileAnchorEl] = useState(null);
  const mobileMenuOpen = Boolean(mobileAnchorEl);
  
  // Notifications state
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  const notificationsOpen = Boolean(notificationsAnchorEl);
  const { unreadCount, pausePolling, resumePolling, resetUnreadCount } = useNotifications();

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuClick = (event) => {
    setMobileAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileClose();
    navigate('/login');
  };

  const handleNotificationsClick = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
    pausePolling(); // Pause polling when viewing notifications
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
    resumePolling(); // Resume polling when closing notifications panel
    
    // Only reset if the panel was actually open (to prevent unnecessary API calls)
    if (notificationsOpen) {
      // Wait a bit before fetching the latest count
      setTimeout(() => {
        resetUnreadCount();
      }, 500);
    }
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        {isMobile && (
          <IconButton 
            edge="start" 
            color="inherit" 
            aria-label="menu"
            onClick={handleMobileMenuClick}
          >
            <MenuIcon />
          </IconButton>
        )}
        
        <Box
          component="img"
          sx={{ height: 40, mr: 2 }}
          alt="Moving Mountains Logo"
          src={logo}
        />
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Shipper Portal
        </Typography>
        
        {!isMobile && user && (
          <Box sx={{ display: 'flex' }}>
            <Button color="inherit" onClick={() => navigate('/')}>
              Dashboard
            </Button>
            <Button color="inherit" onClick={() => navigate('/shipments')}>
              Shipments
            </Button>
            <Button color="inherit" onClick={() => navigate('/clients')}>
              Clients
            </Button>
            <Button color="inherit" onClick={() => navigate('/invoices')}>
              Invoices
            </Button>
          </Box>
        )}
        
        {user && (
          <>
            <NotificationBadge 
              count={unreadCount}
              onClick={handleNotificationsClick}
              sx={{ mr: 1 }}
            />
            
            <IconButton
              onClick={handleProfileClick}
              color="inherit"
              aria-controls={open ? 'profile-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <AccountCircleIcon />
            </IconButton>
          </>
        )}
        
        {/* Profile Menu */}
        <Menu
          id="profile-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleProfileClose}
          MenuListProps={{
            'aria-labelledby': 'profile-button',
          }}
        >
          {user && (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle1">
                {user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          )}
          
          <Divider />
          
          <MenuItem onClick={() => { 
            handleProfileClose();
            navigate('/profile');
          }}>
            My Profile
          </MenuItem>
          
          <MenuItem onClick={() => {
            handleProfileClose();
            navigate('/settings');
          }}>
            Settings
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
        
        {/* Mobile Menu */}
        <Menu
          id="mobile-menu"
          anchorEl={mobileAnchorEl}
          open={mobileMenuOpen}
          onClose={handleMobileMenuClose}
          MenuListProps={{
            'aria-labelledby': 'mobile-menu-button',
          }}
        >
          <MenuItem onClick={() => {
            handleMobileMenuClose();
            navigate('/');
          }}>
            Dashboard
          </MenuItem>
          
          <MenuItem onClick={() => {
            handleMobileMenuClose();
            navigate('/shipments');
          }}>
            Shipments
          </MenuItem>
          
          <MenuItem onClick={() => {
            handleMobileMenuClose();
            navigate('/clients');
          }}>
            Clients
          </MenuItem>
          
          <MenuItem onClick={() => {
            handleMobileMenuClose();
            navigate('/invoices');
          }}>
            Invoices
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={() => {
            handleMobileMenuClose();
            navigate('/profile');
          }}>
            My Profile
          </MenuItem>
          
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
        
        {/* Notifications Panel */}
        <NotificationsPanel
          open={notificationsOpen}
          anchorEl={notificationsAnchorEl}
          onClose={handleNotificationsClose}
        />
      </Toolbar>
    </AppBar>
  );
};

export default Header; 