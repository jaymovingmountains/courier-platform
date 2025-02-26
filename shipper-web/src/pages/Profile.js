import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import './Profile.css';

const Profile = () => {
  const { user, login } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    notifications: user?.notifications || {
      email: true,
      push: true,
      sms: false
    }
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [name]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:3001/users/profile',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Update the stored user data
      login(response.data.token);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile Settings</h1>
        <button 
          className={`edit-button ${isEditing ? 'active' : ''}`}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="profile-content">
        <div className="profile-section">
          <div className="profile-avatar">
            <span>{user?.username?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="profile-info">
            <h2>{user?.username}</h2>
            <p className="role-badge">{user?.role}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <h3>Personal Information</h3>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Notification Preferences</h3>
            <div className="notification-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="email"
                  checked={formData.notifications.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                <span>Email Notifications</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="push"
                  checked={formData.notifications.push}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                <span>Push Notifications</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="sms"
                  checked={formData.notifications.sms}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                <span>SMS Notifications</span>
              </label>
            </div>
          </div>

          {isEditing && (
            <div className="form-actions">
              <button 
                type="submit" 
                className="save-button"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile; 