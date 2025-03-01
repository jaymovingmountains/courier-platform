import { useState, useEffect, useCallback, useRef } from 'react';
import NotificationService from '../services/NotificationService';
import { handleApiError } from '../utils/apiErrorHandler';

/**
 * A hook to manage notifications and polling
 * @param {Object} options - Configuration options
 * @param {number} options.pollingInterval - Polling interval in milliseconds (default: 30000)
 * @param {boolean} options.initialFetch - Whether to fetch immediately (default: true)
 * @returns {Object} Notification state and methods
 */
const useNotifications = (options = {}) => {
  const { 
    pollingInterval = 30000, 
    initialFetch = true 
  } = options;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use refs to store the interval ID and control polling state
  const intervalRef = useRef(null);
  const isPausePollingRef = useRef(false);
  const isInitialFetchDoneRef = useRef(false);
  
  // Function to fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    // Skip if polling is paused
    if (isPausePollingRef.current) return;
    
    try {
      // We don't set loading=true here to avoid UI flicker for background polling
      const count = await NotificationService.getUnreadCount();
      
      // Only update if the count actually changed to avoid unnecessary renders
      setUnreadCount(prevCount => {
        if (prevCount !== count) {
          console.log(`Notification count changed: ${prevCount} → ${count}`);
          return count;
        }
        return prevCount;
      });
      
      if (error) setError(null);
      return count;
    } catch (err) {
      console.error('Error fetching notification count:', err);
      const errorMessage = handleApiError(err, {
        endpoint: '/api/notifications/count',
        operation: 'fetching notification count',
        showToast: false
      });
      
      // Only set error if polling fails repeatedly
      if (!isInitialFetchDoneRef.current) {
        setError(errorMessage);
      }
      
      return 0;
    }
  }, [error]);
  
  // Function to fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    try {
      setLoading(true);
      const result = await NotificationService.getNotifications(unreadOnly);
      
      // Update both notifications and unread count from the result
      setNotifications(result.notifications || []);
      setUnreadCount(result.unread_count || 0);
      
      if (error) setError(null);
      isInitialFetchDoneRef.current = true;
      
      return result;
    } catch (err) {
      console.error('Error fetching notifications:', err);
      const errorMessage = handleApiError(err, {
        endpoint: '/api/notifications',
        operation: 'fetching notifications',
        additionalData: { unreadOnly },
        showToast: false
      });
      
      setError(errorMessage);
      return { notifications: [], unread_count: 0 };
    } finally {
      setLoading(false);
    }
  }, [error]);
  
  // Function to mark a notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const result = await NotificationService.markAsRead([notificationId]);
      
      if (result && result.success) {
        // Update local state to mark this notification as read
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true } 
              : notification
          )
        );
        
        // Update unread count if necessary
        setUnreadCount(prevCount => {
          const notification = notifications.find(n => n.id === notificationId);
          if (notification && !notification.is_read) {
            return Math.max(0, prevCount - 1);
          }
          return prevCount;
        });
        
        return true;
      } else {
        console.error('API returned failure:', result?.message || 'Unknown error');
        return false;
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      handleApiError(err, {
        endpoint: '/api/notifications/read',
        operation: 'marking notification as read',
        additionalData: { notificationId },
        showToast: true
      });
      
      return false;
    }
  }, [notifications]);
  
  // Function to mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const result = await NotificationService.markAllAsRead();
      
      if (result && result.success) {
        // Update local state to mark all notifications as read
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, is_read: true }))
        );
        setUnreadCount(0);
        
        return true;
      } else {
        console.error('API returned failure:', result?.message || 'Unknown error');
        return false;
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      handleApiError(err, {
        endpoint: '/api/notifications/read-all',
        operation: 'marking all notifications as read',
        showToast: true
      });
      
      return false;
    }
  }, []);
  
  // Function to pause polling - useful when viewing notifications
  const pausePolling = useCallback(() => {
    isPausePollingRef.current = true;
    console.log('Notification polling paused');
  }, []);
  
  // Function to resume polling
  const resumePolling = useCallback(() => {
    isPausePollingRef.current = false;
    console.log('Notification polling resumed');
    
    // Trigger an immediate fetch when resuming
    fetchUnreadCount();
  }, [fetchUnreadCount]);
  
  // Set up polling for unread count
  useEffect(() => {
    // Fetch immediately if initialFetch is true
    if (initialFetch) {
      fetchUnreadCount();
    }
    
    // Set up polling interval
    intervalRef.current = setInterval(fetchUnreadCount, pollingInterval);
    
    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchUnreadCount, initialFetch, pollingInterval]);
  
  return {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    
    // Actions
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    pausePolling,
    resumePolling
  };
};

export default useNotifications; 