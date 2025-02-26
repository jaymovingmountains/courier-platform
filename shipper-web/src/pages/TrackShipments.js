import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TrackShipments.css';

const statusOrder = [
  'pending',
  'quoted',
  'approved',
  'assigned',
  'picked_up',
  'in_transit',
  'delivered'
];

const statusInfo = {
  pending: {
    label: 'Pending',
    description: 'Shipment created, waiting for quote',
    icon: '📝'
  },
  quoted: {
    label: 'Quoted',
    description: 'Quote provided, waiting for approval',
    icon: '💰'
  },
  approved: {
    label: 'Approved',
    description: 'Shipment approved, waiting for driver',
    icon: '✅'
  },
  assigned: {
    label: 'Assigned',
    description: 'Driver assigned, waiting for pickup',
    icon: '👤'
  },
  picked_up: {
    label: 'Picked Up',
    description: 'Package picked up by driver',
    icon: '📦'
  },
  in_transit: {
    label: 'In Transit',
    description: 'Package in transit to destination',
    icon: '🚚'
  },
  delivered: {
    label: 'Delivered',
    description: 'Package delivered successfully',
    icon: '🏁'
  }
};

const TrackShipments = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/shipments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setShipments(response.data);
      if (response.data.length > 0) {
        setSelectedShipment(response.data[0]);
      }
      setError(null);
    } catch (err) {
      setError('Failed to fetch shipments. Please try again.');
      console.error('Error fetching shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusProgress = (status) => {
    const currentIndex = statusOrder.indexOf(status);
    return (currentIndex + 1) * (100 / statusOrder.length);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="track-shipments-container">
        <div className="loading">Loading shipments...</div>
      </div>
    );
  }

  return (
    <div className="track-shipments-container">
      <h1>Track Shipments</h1>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {shipments.length === 0 ? (
        <div className="no-shipments">
          <p>No shipments found.</p>
        </div>
      ) : (
        <div className="tracking-content">
          <div className="shipments-list">
            {shipments.map((shipment) => (
              <div
                key={shipment.id}
                className={`shipment-card ${selectedShipment?.id === shipment.id ? 'selected' : ''}`}
                onClick={() => setSelectedShipment(shipment)}
              >
                <div className="shipment-card-header">
                  <span className="shipment-id">#{shipment.id}</span>
                  <span className={`status-badge ${shipment.status}`}>
                    {statusInfo[shipment.status]?.label}
                  </span>
                </div>
                <div className="shipment-card-details">
                  <div className="shipment-type">{shipment.shipment_type}</div>
                  <div className="shipment-addresses">
                    <div className="from">From: {shipment.pickup_city}</div>
                    <div className="to">To: {shipment.delivery_city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedShipment && (
            <div className="shipment-details">
              <h2>Shipment Details #{selectedShipment.id}</h2>
              
              <div className="details-grid">
                <div className="detail-group">
                  <label>Type</label>
                  <div>{selectedShipment.shipment_type}</div>
                </div>
                <div className="detail-group">
                  <label>Created</label>
                  <div>{formatDateTime(selectedShipment.created_at)}</div>
                </div>
                <div className="detail-group">
                  <label>Quote Amount</label>
                  <div>{selectedShipment.quote_amount ? `$${selectedShipment.quote_amount}` : 'Pending'}</div>
                </div>
                {selectedShipment.driver_id && (
                  <div className="detail-group">
                    <label>Driver ID</label>
                    <div>{selectedShipment.driver_id}</div>
                  </div>
                )}
              </div>

              <div className="addresses-section">
                <div className="pickup-address">
                  <h3>Pickup Address</h3>
                  <p>{selectedShipment.pickup_address}</p>
                  <p>{selectedShipment.pickup_city}, {selectedShipment.pickup_postal_code}</p>
                </div>
                <div className="delivery-address">
                  <h3>Delivery Address</h3>
                  <p>{selectedShipment.delivery_address}</p>
                  <p>{selectedShipment.delivery_city}, {selectedShipment.delivery_postal_code}</p>
                </div>
              </div>

              <div className="tracking-timeline">
                <div 
                  className="progress-bar"
                  style={{ width: `${getStatusProgress(selectedShipment.status)}%` }}
                />
                <div className="timeline-steps">
                  {statusOrder.map((status) => (
                    <div
                      key={status}
                      className={`timeline-step ${
                        statusOrder.indexOf(status) <= statusOrder.indexOf(selectedShipment.status)
                          ? 'completed'
                          : ''
                      }`}
                    >
                      <div className="step-icon">{statusInfo[status].icon}</div>
                      <div className="step-label">{statusInfo[status].label}</div>
                      <div className="step-description">{statusInfo[status].description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackShipments; 