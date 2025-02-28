import React from 'react';
import {
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  Avatar,
  Box,
  Divider,
  Chip
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InventoryIcon from '@mui/icons-material/Inventory';
import FlightIcon from '@mui/icons-material/Flight';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { formatDistanceToNow } from 'date-fns';

// Get icon based on notification type
const getTypeIcon = (type) => {
  switch (type) {
    case 'quote':
      return <AttachMoneyIcon />;
    case 'assignment':
      return <PersonIcon />;
    case 'picked_up':
      return <InventoryIcon />;
    case 'in_transit':
      return <FlightIcon />;
    case 'delivered':
      return <CheckCircleIcon />;
    case 'status_update':
      return <AutorenewIcon />;
    default:
      return <NotificationsIcon />;
  }
};

// Get color based on notification type
const getTypeColor = (type) => {
  switch (type) {
    case 'quote':
      return '#4caf50'; // green
    case 'assignment':
      return '#2196f3'; // blue
    case 'picked_up':
      return '#9c27b0'; // purple
    case 'in_transit':
      return '#3f51b5'; // indigo
    case 'delivered':
      return '#00bfa5'; // mint
    case 'status_update':
      return '#ff9800'; // orange
    default:
      return '#757575'; // gray
  }
};

// Format date to relative time (e.g. "2 hours ago")
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return dateString;
  }
};

/**
 * A component to display a single notification
 * @param {object} notification - The notification object
 * @param {function} onClick - Function to call when clicking the notification
 * @param {boolean} isLast - Whether this is the last item in the list (to remove divider)
 */
const NotificationItem = ({ notification, onClick, isLast = false }) => {
  // Get icon and color based on notification type
  const icon = getTypeIcon(notification.type);
  const color = getTypeColor(notification.type);
  
  return (
    <>
      <ListItem 
        alignItems="flex-start" 
        sx={{ 
          cursor: 'pointer',
          backgroundColor: notification.is_read ? 'inherit' : 'rgba(25, 118, 210, 0.05)',
          py: 2
        }}
        onClick={() => onClick && onClick(notification)}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: color }}>
            {icon}
          </Avatar>
        </ListItemAvatar>
        
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" component="span" fontWeight={notification.is_read ? 'normal' : 'bold'}>
                {notification.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(notification.created_at)}
              </Typography>
            </Box>
          }
          secondary={
            <Box>
              <Typography
                sx={{ display: 'block', mt: 1 }}
                component="span"
                variant="body2"
                color="text.primary"
              >
                {notification.message}
              </Typography>
              
              {/* Additional details section */}
              {notification.shipment_type && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                  <Chip
                    icon={<LocalShippingIcon fontSize="small" />}
                    label={notification.shipment_type}
                    size="small"
                    variant="outlined"
                  />
                  
                  {notification.driver_name && (
                    <Chip
                      icon={<PersonIcon fontSize="small" />}
                      label={notification.driver_name}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              )}
              
              {!notification.is_read && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Chip label="New" size="small" color="primary" />
                </Box>
              )}
            </Box>
          }
        />
      </ListItem>
      {!isLast && <Divider variant="inset" component="li" />}
    </>
  );
};

export default NotificationItem; 