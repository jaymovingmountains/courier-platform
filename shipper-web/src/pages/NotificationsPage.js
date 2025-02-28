import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import NotificationService from '../services/NotificationService';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Fetch notifications when component mounts or filter changes
  useEffect(() => {
    fetchNotifications();
  }, [showUnreadOnly]);

  // Function to fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const fetchedNotifications = await NotificationService.getNotifications(showUnreadOnly);
      setNotifications(fetchedNotifications);
      
      // Count unread notifications
      const unreadNotifications = fetchedNotifications.filter(n => !n.is_read);
      setUnreadCount(unreadNotifications.length);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      await NotificationService.markAsRead([notificationId]);
      
      // Update local state to mark this notification as read
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, is_read: true } 
          : notification
      ));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      alert('Failed to mark notification as read');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    
    try {
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);
      
      if (unreadIds.length === 0) return;
      
      await NotificationService.markAllAsRead();
      
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      alert('Failed to mark all notifications as read');
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
            onClick={markAllAsRead}
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

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading notifications...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
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
                      onClick={() => markAsRead(notification.id)}
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