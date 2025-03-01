import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import useNotifications from '../hooks/useNotifications';
import ErrorMessage from '../components/ErrorMessage';
import { handleApiError } from '../utils/apiErrorHandler';

const NotificationsPage = () => {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead, 
    pausePolling,
    resumePolling 
  } = useNotifications({
    initialFetch: false, // We'll fetch manually
    pollingInterval: 60000 // Longer interval for the notifications page
  });

  // Pause polling when viewing notifications page
  useEffect(() => {
    // Pause polling since we're on the notifications page
    pausePolling();
    
    // Fetch notifications when component mounts or filter changes
    fetchNotifications(showUnreadOnly);
    
    // Resume polling when unmounting
    return () => resumePolling();
  }, [fetchNotifications, pausePolling, resumePolling, showUnreadOnly]);

  // Mark a notification as read and refetch to keep counts in sync
  const handleMarkAsRead = async (notificationId) => {
    try {
      const success = await markAsRead(notificationId);
      if (success) {
        console.log(`Successfully marked notification #${notificationId} as read`);
      } else {
        console.error(`Failed to mark notification #${notificationId} as read`);
      }
    } catch (err) {
      // Use our error handling utility
      const errorMessage = handleApiError(err, {
        endpoint: '/api/notifications/read',
        operation: 'marking notification as read',
        additionalData: { notificationId }
      });
      
      console.error(errorMessage);
    }
  };

  // Mark all notifications as read and refetch to keep counts in sync
  const handleMarkAllAsRead = async () => {
    try {
      const success = await markAllAsRead();
      if (success) {
        console.log('Successfully marked all notifications as read');
      } else {
        console.error('Failed to mark all notifications as read');
      }
    } catch (err) {
      // Use our error handling utility
      const errorMessage = handleApiError(err, {
        endpoint: '/api/notifications/read-all',
        operation: 'marking all notifications as read'
      });
      
      console.error(errorMessage);
    }
  };

  // Format the notification date
  const formatDate = (dateString) => {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (err) {
      console.error('Error formatting date:', err, dateString);
      return dateString;
    }
  };

  // Get appropriate icon class based on notification type
  const getIconClass = (type) => {
    switch (type) {
      case 'shipment_status':
        return 'fa-truck';
      case 'quote':
        return 'fa-file-invoice-dollar';
      case 'driver_assigned':
        return 'fa-user-hard-hat';
      case 'payment':
        return 'fa-credit-card';
      case 'document':
        return 'fa-file-alt';
      default:
        return 'fa-bell';
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">Notifications</h1>
        <div>
          <button 
            className="btn btn-outline-primary btn-sm me-2" 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </button>
          <div className="form-check form-switch d-inline-block ms-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="showUnreadOnly"
              checked={showUnreadOnly}
              onChange={() => setShowUnreadOnly(!showUnreadOnly)}
            />
            <label className="form-check-label" htmlFor="showUnreadOnly">
              Show unread only
            </label>
          </div>
        </div>
      </div>

      {error && (
        <ErrorMessage 
          message={error}
          onRetry={() => fetchNotifications(showUnreadOnly)}
          variant="error"
        />
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-bell-slash fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">No notifications found</h5>
          {showUnreadOnly && (
            <p className="text-muted">
              You have no unread notifications. 
              <button 
                className="btn btn-link p-0 ms-1" 
                onClick={() => setShowUnreadOnly(false)}
              >
                View all notifications
              </button>
            </p>
          )}
        </div>
      ) : (
        <div className="list-group notification-list">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`list-group-item list-group-item-action ${!notification.is_read ? 'unread' : ''}`}
              style={{
                backgroundColor: !notification.is_read ? 'rgba(13, 110, 253, 0.05)' : '',
                position: 'relative',
                padding: '16px'
              }}
            >
              {!notification.is_read && (
                <span 
                  className="position-absolute" 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    backgroundColor: '#0d6efd', 
                    borderRadius: '50%', 
                    top: '16px', 
                    left: '4px' 
                  }}
                ></span>
              )}
              
              <div className="d-flex">
                <div 
                  className="flex-shrink-0 me-3 notification-icon" 
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    backgroundColor: '#0d6efd', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <i className={`fas ${getIconClass(notification.type)}`}></i>
                </div>
                
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between">
                    <h5 className="mb-1">{notification.title}</h5>
                    <small className="text-muted">
                      {formatDate(notification.created_at)}
                    </small>
                  </div>
                  <p className="mb-1">{notification.message}</p>
                  
                  {!notification.is_read && (
                    <button 
                      className="btn btn-sm btn-link p-0 mt-2" 
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Mark as read
                    </button>
                  )}
                  
                  {notification.shipment_id && (
                    <a 
                      href={`/shipments/${notification.shipment_id}`} 
                      className="btn btn-sm btn-outline-primary mt-2"
                    >
                      View Shipment
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage; 