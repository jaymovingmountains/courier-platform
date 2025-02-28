import React from 'react';

/**
 * A simple notification badge component that displays a count
 * @param {number} props.count - The count to display in the badge
 * @returns {JSX.Element} A notification badge or null if count is 0
 */
const NotificationBadge = ({ count }) => {
  // Don't show anything if count is 0 or less
  if (!count || count <= 0) {
    return null;
  }

  // Display the badge with the count
  return (
    <div className="notification-badge-container" style={{ position: 'relative', display: 'inline-block' }}>
      <i className="fas fa-bell" style={{ fontSize: '24px' }}></i>
      <span 
        className="notification-badge" 
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          backgroundColor: '#f44336',
          color: 'white',
          borderRadius: '50%',
          padding: '2px 6px',
          fontSize: '12px',
          fontWeight: 'bold',
          minWidth: '8px',
          textAlign: 'center'
        }}
      >
        {count > 99 ? '99+' : count}
      </span>
    </div>
  );
};

export default NotificationBadge; 