import { useState, useEffect } from 'react';
import NotificationService from '../services/NotificationService';

/**
 * A hook to manage notifications and polling
 * @returns {object} Object containing unread notification count
 */
const useNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Set up polling for unread count
  useEffect(() => {
    // Function to fetch unread count
    const fetchUnreadCount = async () => {
      try {
        const count = await NotificationService.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };
    
    // Fetch immediately
    fetchUnreadCount();
    
    // Then poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    // Clean up on unmount
    return () => clearInterval(interval);
  }, []);
  
  // Function to reset unread count to 0
  const resetUnreadCount = () => {
    setUnreadCount(0);
  };
  
  return { 
    unreadCount,
    resetUnreadCount
  };
};

export default useNotifications; 