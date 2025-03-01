import React from 'react';
import PropTypes from 'prop-types';

/**
 * A reusable component for displaying error messages consistently throughout the application
 */
const ErrorMessage = ({ 
  message, 
  onRetry = null, 
  onDismiss = null,
  variant = 'error',
  showIcon = true
}) => {
  // Define styles based on variant
  const getStyles = () => {
    const baseStyle = {
      padding: '15px 20px',
      marginBottom: '20px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      maxWidth: '100%'
    };
    
    const variants = {
      error: {
        backgroundColor: '#FEE2E2',
        color: '#B91C1C',
        borderLeft: '4px solid #DC2626'
      },
      warning: {
        backgroundColor: '#FEF3C7',
        color: '#92400E',
        borderLeft: '4px solid #D97706'
      },
      info: {
        backgroundColor: '#E0F2FE',
        color: '#0369A1',
        borderLeft: '4px solid #0EA5E9'
      }
    };
    
    return { ...baseStyle, ...variants[variant] };
  };
  
  // Define icon based on variant
  const getIcon = () => {
    switch (variant) {
      case 'error':
        return <i className="fas fa-exclamation-circle" />;
      case 'warning':
        return <i className="fas fa-exclamation-triangle" />;
      case 'info':
        return <i className="fas fa-info-circle" />;
      default:
        return <i className="fas fa-exclamation-circle" />;
    }
  };
  
  if (!message) return null;
  
  return (
    <div
      className={`error-message error-message-${variant}`} 
      role="alert"
      style={getStyles()}
    >
      {showIcon && (
        <div className="error-icon" style={{ marginRight: '12px', fontSize: '18px' }}>
          {getIcon()}
        </div>
      )}
      
      <div className="error-content" style={{ flex: '1' }}>
        <div className="error-text">{message}</div>
        
        {(onRetry || onDismiss) && (
          <div className="error-actions" style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            {onRetry && (
              <button 
                onClick={onRetry}
                style={{
                  border: 'none',
                  background: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: 'inherit',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(0,0,0,0.05)'
                }}
              >
                <i className="fas fa-redo-alt" style={{ marginRight: '5px' }} />
                Try Again
              </button>
            )}
            
            {onDismiss && (
              <button 
                onClick={onDismiss}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  padding: '5px 10px'
                }}
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
      
      {onDismiss && !onRetry && (
        <button 
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            marginLeft: '10px',
            color: 'inherit',
            opacity: '0.6'
          }}
        >
          <i className="fas fa-times" />
        </button>
      )}
    </div>
  );
};

ErrorMessage.propTypes = {
  message: PropTypes.string,
  onRetry: PropTypes.func,
  onDismiss: PropTypes.func,
  variant: PropTypes.oneOf(['error', 'warning', 'info']),
  showIcon: PropTypes.bool
};

export default ErrorMessage; 