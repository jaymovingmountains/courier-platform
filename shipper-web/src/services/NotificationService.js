import { handleApiError, getAuthConfig } from '../utils/apiErrorHandler';

// Base API URL - centralized for consistency
const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Service to handle notifications API calls
 */
const NotificationService = {
  /**
   * Get notifications for the current user
   * @param {boolean} unreadOnly - Whether to fetch only unread notifications
   * @param {number} limit - Maximum number of notifications to fetch
   * @returns {Promise} Promise object with notifications data
   */
  getNotifications: async (unreadOnly = false, limit = 50) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { notifications: [], unread_count: 0 };
      
      // Build query string with all parameters
      const params = new URLSearchParams();
      if (unreadOnly) params.append('unread', 'true');
      if (limit) params.append('limit', limit.toString());
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      console.log(`Fetching notifications with params: ${queryString || 'none'}`);
      
      // Make API call using our auth config utility
      const response = await fetch(
        `${API_BASE_URL}/notifications${queryString}`, 
        getAuthConfig()
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Successfully fetched ${data.notifications?.length || 0} notifications`);
      return data;
    } catch (error) {
      // Use our error handling utility
      handleApiError(error, {
        endpoint: '/api/notifications',
        operation: 'fetching notifications',
        additionalData: { unreadOnly, limit }
      });
      
      // Return empty data on error
      return { notifications: [], unread_count: 0 };
    }
  },

  /**
   * Get unread notification count
   * @returns {Promise<number>} Promise that resolves to the unread count
   */
  getUnreadCount: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return 0;
      
      console.log('Fetching unread notification count');
      
      // Make API call using our auth config utility
      const response = await fetch(
        `${API_BASE_URL}/notifications/count`, 
        getAuthConfig()
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch unread count: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Unread notification count: ${data.unread_count || 0}`);
      return data.unread_count || 0;
    } catch (error) {
      // Use our error handling utility
      handleApiError(error, {
        endpoint: '/api/notifications/count',
        operation: 'fetching unread notification count'
      });
      
      // Return 0 on error
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
      if (!notificationIds || notificationIds.length === 0) {
        console.warn('No notification IDs provided to mark as read');
        return { success: false, message: 'No notification IDs provided' };
      }
      
      const token = localStorage.getItem('token');
      if (!token) return { success: false, message: 'No authentication token found' };
      
      console.log(`Marking ${notificationIds.length} notifications as read: ${notificationIds.join(', ')}`);
      
      // Make API call with auth config and body
      const response = await fetch(`${API_BASE_URL}/notifications/read`, {
        method: 'PUT',
        ...getAuthConfig(),
        body: JSON.stringify({ notification_ids: notificationIds })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to mark notifications as read: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Successfully marked notifications as read');
      return result;
    } catch (error) {
      // Use our error handling utility
      handleApiError(error, {
        endpoint: '/api/notifications/read',
        operation: 'marking notifications as read',
        additionalData: { notificationIds }
      });
      
      // Return error result
      return { 
        success: false, 
        message: 'Failed to mark notifications as read' 
      };
    }
  },

  /**
   * Mark all notifications as read
   * @returns {Promise} Promise object with success message
   */
  markAllAsRead: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { success: false, message: 'No authentication token found' };
      
      console.log('Marking all notifications as read');
      
      // Make API call with auth config
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        ...getAuthConfig()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to mark all notifications as read: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Successfully marked all notifications as read');
      return result;
    } catch (error) {
      // Use our error handling utility
      handleApiError(error, {
        endpoint: '/api/notifications/read-all',
        operation: 'marking all notifications as read'
      });
      
      // Return error result
      return { 
        success: false, 
        message: 'Failed to mark all notifications as read' 
      };
    }
  }
};

export default NotificationService; 