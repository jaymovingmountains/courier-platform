import React, { useState, useEffect } from 'react';
import {
  Popover,
  List,
  Typography,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Switch,
  CircularProgress,
  Paper
} from '@mui/material';
import NotificationItem from './NotificationItem';
import NotificationService from '../services/NotificationService';
import { toast } from 'react-toastify';

/**
 * A dropdown panel to display notifications
 * @param {boolean} open - Whether the panel is open
 * @param {HTMLElement} anchorEl - The element to anchor the panel to
 * @param {function} onClose - Function to call when closing the panel
 */
const NotificationsPanel = ({ open, anchorEl, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, showUnreadOnly]);

  // Mark notification as read when clicked
  const handleNotificationClick = async (notification) => {
    try {
      // If already read, no need to update
      if (notification.is_read) return;

      // Update locally for immediate feedback
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, is_read: true } 
            : n
        )
      );

      // Update on server
      await NotificationService.markAsRead([notification.id]);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert local change
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...notification } 
            : n
        )
      );
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      // Update locally for immediate feedback
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );

      // Update on server
      await NotificationService.markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Refresh to get accurate state
      fetchNotifications();
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Fetch notifications from server
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await NotificationService.getNotifications(showUnreadOnly);
      setNotifications(result.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        sx: {
          width: 400,
          maxHeight: 500,
          borderRadius: 1,
          boxShadow: 3
        }
      }}
    >
      <Paper elevation={0}>
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          <Button 
            variant="text" 
            size="small"
            disabled={notifications.every(n => n.is_read)}
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </Button>
        </Box>

        <Divider />

        {/* Filter control */}
        <Box sx={{ px: 2, py: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                size="small"
              />
            }
            label="Show unread only"
          />
        </Box>

        <Divider />

        {/* Notification list */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
            <Button 
              variant="outlined" 
              onClick={fetchNotifications} 
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography>
              {showUnreadOnly 
                ? "You've read all your notifications" 
                : "You don't have any notifications yet"
              }
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
                isLast={index === notifications.length - 1}
              />
            ))}
          </List>
        )}
      </Paper>
    </Popover>
  );
};

export default NotificationsPanel; 