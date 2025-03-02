import React, { useState } from 'react';
import axios from 'axios';
import './Settings.css';

const Settings = () => {
  // User will be used in future implementation for personalized settings
  // const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'en',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    security: {
      twoFactorAuth: false,
      sessionTimeout: '30',
      emailAlerts: true
    },
    display: {
      compactView: false,
      showNotifications: true,
      animationsEnabled: true
    }
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [category, setting] = name.split('.');
      setSettings(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [setting]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
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
      await axios.put(
        'http://localhost:3001/users/settings',
        settings,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setSuccess('Settings updated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-section">
          <h2>Appearance</h2>
          <div className="form-group">
            <label htmlFor="theme">Theme</label>
            <select
              id="theme"
              name="theme"
              value={settings.theme}
              onChange={handleInputChange}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System Default</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              name="language"
              value={settings.language}
              onChange={handleInputChange}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="timeZone">Time Zone</label>
            <select
              id="timeZone"
              name="timeZone"
              value={settings.timeZone}
              onChange={handleInputChange}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>Security</h2>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="security.twoFactorAuth"
                checked={settings.security.twoFactorAuth}
                onChange={handleInputChange}
              />
              <span>Enable Two-Factor Authentication</span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="sessionTimeout">Session Timeout (minutes)</label>
            <select
              id="sessionTimeout"
              name="security.sessionTimeout"
              value={settings.security.sessionTimeout}
              onChange={handleInputChange}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="security.emailAlerts"
                checked={settings.security.emailAlerts}
                onChange={handleInputChange}
              />
              <span>Security Alert Emails</span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h2>Display Preferences</h2>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="display.compactView"
                checked={settings.display.compactView}
                onChange={handleInputChange}
              />
              <span>Compact View</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="display.showNotifications"
                checked={settings.display.showNotifications}
                onChange={handleInputChange}
              />
              <span>Show Notifications</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="display.animationsEnabled"
                checked={settings.display.animationsEnabled}
                onChange={handleInputChange}
              />
              <span>Enable Animations</span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="save-button"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings; 