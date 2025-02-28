import React from 'react';
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

  // Handle generating and viewing invoice
  const handleViewInvoice = () => {
    if (!shipment.id) return;
    
    // Get the token
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Authentication required to view invoice');
      return;
    }
    
    // Open the invoice in a new tab
    const invoiceUrl = `http://localhost:3001/shipments/${shipment.id}/invoice`;
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
            </div>
          </div>
          
          <div className="shipment-details-grid">
            <div className="detail-section">
              <h3>Package Details</h3>
              <div className="detail-item">
                <span className="detail-label">Weight:</span>
                <span className="detail-value">{shipment.weight ? `${shipment.weight} kg` : 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Dimensions:</span>
                <span className="detail-value">
                  {shipment.length && shipment.width && shipment.height ? 
                    `${shipment.length}×${shipment.width}×${shipment.height} in` : 
                    'N/A'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Special Handling:</span>
                <span className="detail-value">
                  {shipment.is_fragile ? 'Fragile' : ''}
                  {shipment.is_fragile && shipment.requires_refrigeration ? ', ' : ''}
                  {shipment.requires_refrigeration ? 'Refrigeration Required' : ''}
                  {!shipment.is_fragile && !shipment.requires_refrigeration ? 'None' : ''}
                </span>
              </div>
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
                <span className="detail-label">Shipper ID:</span>
                <span className="detail-value">{shipment.shipper_id || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Driver:</span>
                <span className="detail-value">
                  {shipment.driver_id 
                    ? (() => {
                        const driver = users.find(user => user.id === shipment.driver_id);
                        return driver 
                          ? `${driver.username} (ID: ${driver.id})` 
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
                          ? `${vehicle.vehicle_name} (${vehicle.license_plate})` 
                          : `ID: ${shipment.vehicle_id}`;
                      })() 
                    : 'Not Assigned'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="print-label-button"
            onClick={() => onPrintLabel(shipment.id)}
            disabled={!shipment.id}
          >
            Print Shipping Label
          </button>
          <button 
            className="view-invoice-button"
            onClick={handleViewInvoice}
            disabled={!shipment.id || !shipment.quote_amount}
          >
            View Invoice
          </button>
          <button className="close-modal-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShipmentModal; 