import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';
import './UpdateStatus.css';

const statusOptions = [
  { value: 'picked_up', label: 'Picked Up', description: 'Package has been picked up from sender' },
  { value: 'in_transit', label: 'In Transit', description: 'Package is in transit to destination' },
  { value: 'delivered', label: 'Delivered', description: 'Package has been delivered to recipient' }
];

const UpdateStatus = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveJob } = useContext(AuthContext);
  
  const [job, setJob] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    fetchJob();
  }, [id]);
  
  const fetchJob = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3001/jobs/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      setJob(response.data);
      
      // Pre-select next logical status
      const currentStatusIndex = statusOptions.findIndex(option => option.value === response.data.status);
      if (currentStatusIndex > -1 && currentStatusIndex < statusOptions.length - 1) {
        setSelectedStatus(statusOptions[currentStatusIndex + 1].value);
      } else {
        setSelectedStatus(statusOptions[0].value);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch job details. Please try again.');
      console.error('Error fetching job:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) {
      setError('Please select a status');
      return;
    }
    
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      
      await axios.put(
        `http://localhost:3001/jobs/${id}/status`,
        {
          status: selectedStatus,
          notes: notes.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );
      
      // If status is 'delivered', remove from active jobs
      if (selectedStatus === 'delivered') {
        setActiveJob(null);
      }
      
      setSuccess(true);
      setError(null);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.response?.data?.error || 'Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };
  
  if (loading) {
    return (
      <div className="update-status-container">
        <div className="loading">Loading job details...</div>
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="update-status-container">
        <div className="success-message">
          Status updated successfully!
          <div className="redirect-message">Redirecting to dashboard...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="update-status-container">
      <div className="page-header">
        <h1>Update Job Status</h1>
        <button
          className="back-button"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="update-status-card">
        <div className="current-status-section">
          <h2>Current Status</h2>
          <span className={`status-badge large ${job?.status}`}>
            {job?.status?.replace('_', ' ')}
          </span>
        </div>
        
        <form onSubmit={handleSubmit} className="status-update-form">
          <div className="form-section">
            <h2>Update Status</h2>
            
            <div className="form-group">
              <label htmlFor="status">New Status</label>
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={updating}
              >
                <option value="">Select new status</option>
                {statusOptions.map(option => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.value === job?.status}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about the status update..."
                disabled={updating}
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button
              type="submit"
              className="update-button"
              disabled={updating || !selectedStatus}
            >
              {updating ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateStatus; 