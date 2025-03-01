import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ViewShipment.css';
import ShippingLabel from '../components/ShippingLabel';
import { handleApiError, getAuthConfig } from '../utils/apiErrorHandler';
import ErrorMessage from '../components/ErrorMessage';

const ViewShipment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLabelPreview, setShowLabelPreview] = useState(false);

  const fetchShipment = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = `http://localhost:3001/shipments/${id}`;
      
      console.log(`Fetching shipment details for ID: ${id}`);
      const response = await axios.get(endpoint, getAuthConfig());
      
      console.log('Shipment details retrieved:', response.data);
      setShipment(response.data);
      setError(null);
    } catch (err) {
      // Use our utility function to handle the error
      const errorMessage = handleApiError(err, {
        endpoint: `/shipments/${id}`,
        operation: `fetching shipment #${id}`,
        additionalData: { shipmentId: id }
      });
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchShipment();
  }, [fetchShipment]);

  const handlePrintLabel = () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = `http://localhost:3001/shipments/${id}/label?token=${token}`;
      
      console.log(`Opening print label in new window for shipment #${id}`);
      window.open(endpoint, '_blank');
    } catch (err) {
      const errorMessage = handleApiError(err, {
        endpoint: `/shipments/${id}/label`,
        operation: 'opening shipping label',
        additionalData: { shipmentId: id }
      });
      
      setError(errorMessage);
    }
  };

  const toggleLabelPreview = () => {
    setShowLabelPreview(!showLabelPreview);
  };

  if (loading) {
    return (
      <div className="view-shipment-container">
        <div className="loading">Loading shipment details...</div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="view-shipment-container">
        <ErrorMessage 
          message={error || 'Shipment not found'}
          onRetry={fetchShipment}
          variant="error" 
        />
        <button
          className="back-button"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="view-shipment-container">
      <div className="view-shipment-header">
        <h1>Shipment #{shipment.id}</h1>
        <div className="header-actions">
          <button className="back-button" onClick={() => navigate('/shipments')}>
            <i className="fas fa-arrow-left"></i> Back to Shipments
          </button>
          <button className="action-button preview-label-button" onClick={toggleLabelPreview}>
            <i className="fas fa-eye"></i> {showLabelPreview ? 'Hide Label' : 'Preview Label'}
          </button>
          <button className="action-button print-label-button" onClick={handlePrintLabel}>
            <i className="fas fa-print"></i> Print Label
          </button>
        </div>
      </div>

      {showLabelPreview && (
        <div className="label-preview-container">
          <h2>Shipping Label Preview</h2>
          <div className="label-preview">
            <ShippingLabel shipment={shipment} />
          </div>
          <p className="label-note">This is a preview of how your shipping label will look. Click "Print Label" to download the PDF version.</p>
        </div>
      )}

      <div className="shipment-info-card">
        <div className="info-section">
          <h2>Shipment Details</h2>
          <div className="info-grid">
            <div className="info-group">
              <label>Type</label>
              <div>{shipment.shipment_type}</div>
            </div>
            <div className="info-group">
              <label>Status</label>
              <div className={`status-badge ${shipment.status}`}>
                {shipment.status}
              </div>
            </div>
            <div className="info-group">
              <label>Quote Amount</label>
              <div>{shipment.quote_amount ? `$${shipment.quote_amount}` : 'Pending'}</div>
            </div>
            <div className="info-group">
              <label>Created At</label>
              <div>{new Date(shipment.created_at).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h2>Addresses</h2>
          <div className="addresses-grid">
            <div className="address-group">
              <h3>Pickup Address</h3>
              <p>{shipment.pickup_address}</p>
              <p>{shipment.pickup_city}, {shipment.pickup_postal_code}</p>
            </div>
            <div className="address-group">
              <h3>Delivery Address</h3>
              <p>{shipment.delivery_address}</p>
              <p>{shipment.delivery_city}, {shipment.delivery_postal_code}</p>
            </div>
          </div>
        </div>

        {shipment.driver_id && (
          <div className="info-section">
            <h2>Driver Information</h2>
            <div className="info-grid">
              <div className="info-group">
                <label>Driver ID</label>
                <div>{shipment.driver_id}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewShipment; 