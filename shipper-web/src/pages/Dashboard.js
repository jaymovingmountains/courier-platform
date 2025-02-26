import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/shipments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setShipments(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch shipments. Please try again later.');
      console.error('Error fetching shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      pending: 'badge-warning',
      quoted: 'badge-info',
      approved: 'badge-primary',
      assigned: 'badge-secondary',
      picked_up: 'badge-success',
      in_transit: 'badge-success',
      delivered: 'badge-success',
    };
    return `badge ${statusClasses[status] || 'badge-default'}`;
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      pending: '⏳',
      quoted: '💰',
      approved: '✅',
      assigned: '🚚',
      picked_up: '📦',
      in_transit: '🔄',
      delivered: '🏁',
    };
    return statusIcons[status] || '📋';
  };

  const getShipmentStats = () => {
    const total = shipments.length;
    const pending = shipments.filter(s => s.status === 'pending').length;
    const inProgress = shipments.filter(s => ['quoted', 'approved', 'assigned', 'picked_up', 'in_transit'].includes(s.status)).length;
    const delivered = shipments.filter(s => s.status === 'delivered').length;
    
    return { total, pending, inProgress, delivered };
  };

  const getRecentActivity = () => {
    // Sort shipments by created_at date (most recent first)
    return [...shipments]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedShipments = () => {
    const filtered = shipments.filter(shipment => {
      // Filter by search term
      const matchesSearch = 
        searchTerm === '' || 
        shipment.id.toString().includes(searchTerm) ||
        shipment.shipment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.pickup_city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.delivery_city.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by status
      const matchesStatus = 
        filterStatus === 'all' || 
        shipment.status === filterStatus;
      
      // Filter by tab
      const matchesTab = 
        activeTab === 'all' || 
        (activeTab === 'active' && ['pending', 'quoted', 'approved', 'assigned', 'picked_up', 'in_transit'].includes(shipment.status)) ||
        (activeTab === 'delivered' && shipment.status === 'delivered');
      
      return matchesSearch && matchesStatus && matchesTab;
    });

    return [...filtered].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = getShipmentStats();
  const recentActivity = getRecentActivity();

  return (
    <div className="dashboard-container">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>Welcome to your Shipment Dashboard</h1>
          <p>Track, manage, and create shipments all in one place</p>
        </div>
        <div className="dashboard-actions">
          <button
            className="action-button create-button"
            onClick={() => navigate('/create-shipment')}
          >
            <span className="button-icon">+</span>
            Create Shipment
          </button>
          <button
            className="action-button manage-button"
            onClick={() => navigate('/manage-clients')}
          >
            <span className="button-icon">👥</span>
            Manage Clients
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-section">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Shipments</h3>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending</h3>
            <div className="stat-value">{stats.pending}</div>
          </div>
        </div>
        <div className="stat-card in-progress">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <h3>In Progress</h3>
            <div className="stat-value">{stats.inProgress}</div>
          </div>
        </div>
        <div className="stat-card delivered">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Delivered</h3>
            <div className="stat-value">{stats.delivered}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Shipments Table Section */}
        <div className="shipments-section">
          <div className="section-header">
            <h2>Your Shipments</h2>
            <div className="filter-controls">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search shipments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <span className="search-icon">
                  <i className="fas fa-search"></i>
                </span>
              </div>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="status-filter"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="quoted">Quoted</option>
                <option value="approved">Approved</option>
                <option value="assigned">Assigned</option>
                <option value="picked_up">Picked Up</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Shipments
            </button>
            <button 
              className={`tab ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Active
            </button>
            <button 
              className={`tab ${activeTab === 'delivered' ? 'active' : ''}`}
              onClick={() => setActiveTab('delivered')}
            >
              Delivered
            </button>
          </div>

          {shipments.length === 0 ? (
            <div className="no-shipments">
              <div className="empty-state-icon">📦</div>
              <h3>No shipments found</h3>
              <p>Create your first shipment to get started!</p>
              <button
                className="action-button create-button"
                onClick={() => navigate('/create-shipment')}
              >
                Create Shipment
              </button>
            </div>
          ) : sortedShipments().length === 0 ? (
            <div className="no-shipments">
              <div className="empty-state-icon">🔍</div>
              <h3>No matching shipments</h3>
              <p>Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="shipments-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className={sortConfig.key === 'id' ? sortConfig.direction : ''}>
                      ID <span className="sort-arrow"></span>
                    </th>
                    <th onClick={() => handleSort('shipment_type')} className={sortConfig.key === 'shipment_type' ? sortConfig.direction : ''}>
                      Type <span className="sort-arrow"></span>
                    </th>
                    <th onClick={() => handleSort('pickup_city')} className={sortConfig.key === 'pickup_city' ? sortConfig.direction : ''}>
                      Pickup <span className="sort-arrow"></span>
                    </th>
                    <th onClick={() => handleSort('delivery_city')} className={sortConfig.key === 'delivery_city' ? sortConfig.direction : ''}>
                      Delivery <span className="sort-arrow"></span>
                    </th>
                    <th onClick={() => handleSort('status')} className={sortConfig.key === 'status' ? sortConfig.direction : ''}>
                      Status <span className="sort-arrow"></span>
                    </th>
                    <th onClick={() => handleSort('created_at')} className={sortConfig.key === 'created_at' ? sortConfig.direction : ''}>
                      Date <span className="sort-arrow"></span>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedShipments().map((shipment) => (
                    <tr key={shipment.id} className="shipment-row">
                      <td className="shipment-id">#{shipment.id}</td>
                      <td className="shipment-type">{shipment.shipment_type}</td>
                      <td>
                        <div className="location-cell">
                          <span className="location-icon">📍</span>
                          <div>
                            <div>{shipment.pickup_address}</div>
                            <div className="text-muted">
                              {shipment.pickup_city}, {shipment.pickup_postal_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="location-cell">
                          <span className="location-icon">🏁</span>
                          <div>
                            <div>{shipment.delivery_address}</div>
                            <div className="text-muted">
                              {shipment.delivery_city}, {shipment.delivery_postal_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="status-cell">
                          <span className={getStatusBadgeClass(shipment.status)}>
                            <span className="status-icon">{getStatusIcon(shipment.status)}</span>
                            {shipment.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="date-cell">
                        {formatDate(shipment.created_at)}
                      </td>
                      <td>
                        <div className="action-cell">
                          <button
                            className="view-button"
                            onClick={() => navigate(`/shipments/${shipment.id}`)}
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Section */}
        <div className="activity-section">
          <div className="section-header">
            <h2>Recent Activity</h2>
          </div>
          <div className="activity-list">
            {recentActivity.length === 0 ? (
              <div className="no-activity">
                <p>No recent activity</p>
              </div>
            ) : (
              recentActivity.map((shipment) => (
                <div key={shipment.id} className="activity-item" onClick={() => navigate(`/shipments/${shipment.id}`)}>
                  <div className="activity-icon">
                    {getStatusIcon(shipment.status)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">
                      Shipment #{shipment.id} - {shipment.status.replace('_', ' ')}
                    </div>
                    <div className="activity-details">
                      {shipment.pickup_city} to {shipment.delivery_city}
                    </div>
                    <div className="activity-time">
                      {formatDate(shipment.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 