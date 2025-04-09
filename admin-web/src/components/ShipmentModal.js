import React, { useState } from 'react';
import { API_URL } from '../utils/api';
import './ShipmentModal.css';

const ShipmentModal = ({ shipment, onClose, onPrintLabel, users = [], vehicles = [] }) => {
  if (!shipment) return null;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get status badge class
  const getStatusClass = (status) => {
    const statusMap = {
      'pending': 'status-pending',
      'quoted': 'status-quoted',
      'approved': 'status-approved',
      'assigned': 'status-assigned',
      'picked_up': 'status-picked-up',
      'in_transit': 'status-in-transit',
      'delivered': 'status-delivered'
    };
    return statusMap[status] || 'status-pending';
  };

  // Format status text
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Find the shipper details from users array
  const getShipperDetails = () => {
    if (!shipment.shipper_id) return { name: 'Unknown', username: 'Unknown' };
    const shipper = users.find(user => user.id === shipment.shipper_id);
    return shipper || { name: `Unknown (ID: ${shipment.shipper_id})`, username: 'Unknown' };
  };

  // Get shipper information
  const shipper = getShipperDetails();

  // Handle generating and viewing invoice
  const handlePrintInvoice = () => {
    const invoiceUrl = `${API_URL}/shipments/${shipment.id}/invoice`;
    window.open(invoiceUrl, '_blank');
  };

  return (
    <div className="shipment-modal-overlay" onClick={onClose}>
      <div className="shipment-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Shipment #{shipment.id}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="shipment-status-section">
            <span className={`status-badge ${getStatusClass(shipment.status)}`}>
              {formatStatus(shipment.status)}
            </span>
            <span className="shipment-type-badge">
              {shipment.shipment_type?.toUpperCase() || 'STANDARD'}
            </span>
          </div>
          
          <div className="shipment-details-grid">
            <div className="detail-section">
              <h3>Pickup Details</h3>
              <div className="detail-item">
                <span className="detail-label">Address:</span>
                <span className="detail-value">{shipment.pickup_address || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">City:</span>
                <span className="detail-value">{shipment.pickup_city || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Postal Code:</span>
                <span className="detail-value">{shipment.pickup_postal_code || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Province:</span>
                <span className="detail-value">{shipment.province || 'N/A'}</span>
              </div>
            </div>
            
            <div className="detail-section">
              <h3>Delivery Details</h3>
              <div className="detail-item">
                <span className="detail-label">Address:</span>
                <span className="detail-value">{shipment.delivery_address || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">City:</span>
                <span className="detail-value">{shipment.delivery_city || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Postal Code:</span>
                <span className="detail-value">{shipment.delivery_postal_code || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Province:</span>
                <span className="detail-value">{shipment.province || 'N/A'}</span>
              </div>
            </div>
            
            <div className="detail-section">
              <h3>Shipper Information</h3>
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{shipper.name || shipper.username || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Username:</span>
                <span className="detail-value">{shipper.username || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">ID:</span>
                <span className="detail-value">{shipment.shipper_id || 'N/A'}</span>
              </div>
              {shipper.email && (
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{shipper.email}</span>
                </div>
              )}
            </div>
            
            <div className="detail-section">
              <h3>Shipment Information</h3>
              <div className="detail-item">
                <span className="detail-label">Created:</span>
                <span className="detail-value">{formatDate(shipment.created_at)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Quote Amount:</span>
                <span className="detail-value">
                  {shipment.quote_amount ? `$${shipment.quote_amount.toFixed(2)}` : 'Pending'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Driver:</span>
                <span className="detail-value">
                  {shipment.driver_id 
                    ? (() => {
                        const driver = users.find(user => user.id === shipment.driver_id);
                        return driver 
                          ? `${driver.name || driver.username} (ID: ${driver.id})` 
                          : `ID: ${shipment.driver_id}`;
                      })() 
                    : 'Not Assigned'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Vehicle:</span>
                <span className="detail-value">
                  {shipment.vehicle_id 
                    ? (() => {
                        const vehicle = vehicles.find(v => v.id === shipment.vehicle_id);
                        return vehicle 
                          ? `${vehicle.vehicle_name} (License: ${vehicle.license_plate})` 
                          : `ID: ${shipment.vehicle_id}`;
                      })() 
                    : 'Not Assigned'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="modal-actions">
            <button className="action-button print" onClick={() => onPrintLabel(shipment.id)}>
              <i className="fas fa-print"></i> Print Label
            </button>
            {['picked_up', 'in_transit', 'delivered'].includes(shipment.status) && (
              <button className="action-button invoice" onClick={handlePrintInvoice}>
                <i className="fas fa-file-invoice-dollar"></i> View Invoice
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentModal; 