// Simple service to handle notifications API calls
const NotificationService = {
  /**
   * Get notifications for the current user
   * @param {boolean} unreadOnly - Whether to fetch only unread notifications
   * @returns {Promise} Promise object with notifications data
   */
  getNotifications: async (unreadOnly = false) => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) return { notifications: [], unread_count: 0 };
      
      // Build query string
      const queryParams = unreadOnly ? '?unread=true' : '';
      
      // Make API call
      const response = await fetch(`http://localhost:3001/api/notifications${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], unread_count: 0 };
    }
  },

  /**
   * Get unread notification count
   * @returns {Promise<number>} Promise that resolves to the unread count
   */
  getUnreadCount: async () => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) return 0;
      
      // Make API call
      const response = await fetch('http://localhost:3001/api/notifications/count', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }
      
      const data = await response.json();
      return data.unread_count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  },

  /**
   * Mark specific notifications as read
   * @param {Array<number>} notificationIds - Array of notification IDs to mark as read
   * @returns {Promise} Promise object with success message
   */
  markAsRead: async (notificationIds) => {
    try {
      if (!notificationIds || notificationIds.length === 0) return;
      
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Make API call
      const response = await fetch('http://localhost:3001/api/notifications/read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notification_ids: notificationIds })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  },

  /**
   * Mark all notifications as read
   * @returns {Promise} Promise object with success message
   */
  markAllAsRead: async () => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Make API call
      const response = await fetch('http://localhost:3001/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
};

export default NotificationService; 