import React, { useState } from 'react';
import { checkApiConnection, API_URL } from '../utils/api';

const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '5px',
    padding: '15px',
    margin: '15px 0',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  title: {
    margin: '0',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  checkButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    cursor: 'pointer',
  },
  detailsContainer: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
  },
  statusItem: {
    display: 'flex',
    margin: '5px 0',
    alignItems: 'center',
  },
  statusLabel: {
    fontWeight: 'bold',
    marginRight: '10px',
    width: '150px',
  },
  success: {
    color: '#28a745',
  },
  warning: {
    color: '#ffc107',
  },
  error: {
    color: '#dc3545',
  },
  infoMessage: {
    backgroundColor: '#e2f3fd',
    border: '1px solid #b6e0fe',
    borderRadius: '4px',
    padding: '10px',
    marginTop: '10px',
    color: '#0c5460',
  }
};

const ApiDiagnostic = () => {
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const result = await checkApiConnection();
      setDiagnosticResult(result);
      setShowDetails(true);
    } catch (error) {
      console.error('Error running diagnostic:', error);
      setDiagnosticResult({
        apiReachable: false,
        authValid: false,
        error: error,
        message: 'Failed to run diagnostic check.'
      });
      setShowDetails(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusElement = (status, label) => {
    let icon, style;
    if (status === true) {
      icon = '✅';
      style = styles.success;
    } else if (status === false) {
      icon = '❌';
      style = styles.error;
    } else {
      icon = '⚠️';
      style = styles.warning;
    }

    return (
      <div style={styles.statusItem}>
        <span style={styles.statusLabel}>{label}:</span>
        <span style={style}>{icon} {status ? 'OK' : 'Failed'}</span>
      </div>
    );
  };

  const getHelpfulMessage = () => {
    if (!diagnosticResult) return null;
    
    let message = '';
    const token = localStorage.getItem('token');
    
    if (!diagnosticResult.apiReachable) {
      message = `
        The API server at ${API_URL} is not responding. This could be due to:
        • The server may be down or restarting
        • Your network connection may be offline
        • CORS issues might be blocking requests
        
        Try refreshing the page or checking your internet connection.
      `;
    } else if (!token) {
      message = `
        No authentication token found. You need to log in again.
        
        Click the "Log out" button and then log in with your credentials.
      `;
    } else if (!diagnosticResult.authValid) {
      message = `
        Your authentication token is invalid or expired. You need to log in again.
        
        Click the "Log out" button and then log in with your credentials.
      `;
    }
    
    return message ? (
      <div style={styles.infoMessage}>
        <strong>Suggestions:</strong>
        <pre style={{whiteSpace: 'pre-wrap', margin: '5px 0'}}>{message}</pre>
      </div>
    ) : null;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>API Connection Diagnostic</h3>
        <button 
          style={styles.checkButton} 
          onClick={runDiagnostic}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Run Diagnostic'}
        </button>
      </div>
      
      {showDetails && diagnosticResult && (
        <div style={styles.detailsContainer}>
          {getStatusElement(diagnosticResult.apiReachable, 'API Connection')}
          {getStatusElement(diagnosticResult.authValid, 'Authentication')}
          
          <div style={{margin: '10px 0'}}>
            <strong>API URL:</strong> {API_URL}
          </div>
          
          {diagnosticResult.message && (
            <div style={{margin: '10px 0'}}>
              <strong>Message:</strong> {diagnosticResult.message}
            </div>
          )}
          
          {getHelpfulMessage()}
        </div>
      )}
    </div>
  );
};

export default ApiDiagnostic; 