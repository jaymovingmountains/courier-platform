import React from 'react';
import PropTypes from 'prop-types';

/**
 * A notification badge component that displays a count with visual feedback
 * @param {Object} props - Component props
 * @param {number|string} props.count - The count to display in the badge
 * @param {string} props.color - Badge color (default: '#f44336')
 * @param {boolean} props.pulse - Whether to add a pulse animation (default: true)
 * @param {number} props.maxCount - Maximum number to display before showing '+' (default: 99)
 * @param {Function} props.onClick - Optional click handler
 * @returns {JSX.Element} A notification badge or null if count is 0
 */
const NotificationBadge = ({ 
  count,
  color = '#f44336',
  pulse = true,
  maxCount = 99,
  onClick
}) => {
  // Safely parse count as number, ensuring we handle all edge cases
  let safeCount = 0;
  
  // Handle different count types
  if (count === null || count === undefined) {
    safeCount = 0;
  } else if (typeof count === 'number') {
    safeCount = isNaN(count) ? 0 : Math.max(0, count);
  } else {
    // Try to parse string as number
    try {
      safeCount = Math.max(0, parseInt(count, 10) || 0);
    } catch (err) {
      console.error('Error parsing notification count:', err);
      safeCount = 0;
    }
  }
  
  // Don't show anything if count is 0 or less
  if (safeCount <= 0) {
    return null;
  }

  // Create pulse animation style if enabled
  const pulseAnimation = pulse ? {
    animation: 'pulse 2s infinite',
    boxShadow: `0 0 0 0 ${color}70`
  } : {};
  
  // Format the displayed count
  const displayCount = safeCount > maxCount ? `${maxCount}+` : safeCount.toString();
  
  // Handle click event
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }
  };
  
  // Display the badge with the count
  return (
    <div 
      className="notification-badge-container" 
      style={{ 
        position: 'relative', 
        display: 'inline-block',
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={handleClick}
      role={onClick ? 'button' : 'status'}
      aria-label={`${safeCount} ${safeCount === 1 ? 'notification' : 'notifications'}`}
    >
      <i className="fas fa-bell" style={{ fontSize: '24px' }}></i>
      <span 
        className="notification-badge" 
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          backgroundColor: color,
          color: 'white',
          borderRadius: '50%',
          padding: '2px 6px',
          fontSize: '12px',
          fontWeight: 'bold',
          minWidth: '8px',
          textAlign: 'center',
          ...pulseAnimation
        }}
        data-count={safeCount}
        data-testid="notification-badge-count"
      >
        {displayCount}
      </span>
    </div>
  );
};

NotificationBadge.propTypes = {
  count: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  color: PropTypes.string,
  pulse: PropTypes.bool,
  maxCount: PropTypes.number,
  onClick: PropTypes.func
};

export default NotificationBadge; 