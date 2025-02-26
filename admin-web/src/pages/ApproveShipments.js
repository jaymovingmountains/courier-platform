import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ApproveShipments.css';

const ApproveShipments = () => {
  const [shipments, setShipments] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [selections, setSelections] = useState({});

  const fetchShipments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/shipments', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      const quotedShipments = response.data.filter(shipment => shipment.status === 'quoted');
      setShipments(quotedShipments);
      
      // Initialize selections state for each shipment
      const initialSelections = {};
      quotedShipments.forEach(shipment => {
        initialSelections[shipment.id] = {
          driver_id: '',
          vehicle_id: ''
        };
      });
      setSelections(initialSelections);
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch shipments. Please try again.');
      console.error('Error fetching shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      // Filter users to only include drivers
      const driversList = response.data.filter(user => user.role === 'driver');
      setDrivers(driversList);
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setError('Failed to fetch drivers. Please try again.');
    }
  };

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/vehicles', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      setVehicles(response.data);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to fetch vehicles. Please try again.');
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchShipments(),
        fetchDrivers(),
        fetchVehicles()
      ]);
      setLoading(false);
    };
    
    fetchAllData();
  }, []);

  const handleSelectionChange = (shipmentId, field, value) => {
    setSelections(prev => ({
      ...prev,
      [shipmentId]: {
        ...prev[shipmentId],
        [field]: value
      }
    }));
  };

  const handleApprove = async (shipmentId) => {
    // Validate selections
    const shipmentSelections = selections[shipmentId];
    if (!shipmentSelections.driver_id || !shipmentSelections.vehicle_id) {
      setError('Please select both a driver and a vehicle before approving.');
      return;
    }

    try {
      setProcessingId(shipmentId);
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:3001/shipments/${shipmentId}/approve`,
        {
          driver_id: parseInt(shipmentSelections.driver_id),
          vehicle_id: parseInt(shipmentSelections.vehicle_id)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Show success message
      setSuccessMessage('Shipment approved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh data
      await fetchShipments();
      setError(null);
    } catch (err) {
      console.error('Error approving shipment:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.error || 'Failed to approve shipment. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="approve-shipments-container p-6">
        <div className="loading text-center py-8 text-gray-600">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading shipments, drivers, and vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="approve-shipments-container p-6">
      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Approve Shipments</h1>
      </div>

      {error && (
        <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900"
          >
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="success-message bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{successMessage}</span>
          <button 
            onClick={() => setSuccessMessage('')}
            className="text-green-700 hover:text-green-900"
          >
            &times;
          </button>
        </div>
      )}

      {shipments.length === 0 ? (
        <div className="no-shipments bg-gray-50 rounded-lg p-8 text-center text-gray-600">
          <p>No shipments waiting for approval.</p>
        </div>
      ) : (
        <div className="shipments-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shipments.map((shipment) => (
            <div key={shipment.id} className="shipment-card bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="shipment-header bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <span className="shipment-id font-semibold text-gray-700">Shipment #{shipment.id}</span>
                <span className="quote-amount text-green-600 font-bold">${shipment.quote_amount}</span>
              </div>
              
              <div className="shipment-details p-4 space-y-4">
                <div className="detail-group">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
                  <div className="text-gray-800 bg-gray-50 px-3 py-2 rounded-md">{shipment.shipment_type || 'Standard'}</div>
                </div>
                
                <div className="detail-group">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Pickup</label>
                  <div className="text-gray-800 bg-gray-50 px-3 py-2 rounded-md">
                    {shipment.pickup_address}
                    <div className="address-sub text-sm text-gray-600 mt-1">
                      {shipment.pickup_city}, {shipment.pickup_postal_code}
                    </div>
                  </div>
                </div>

                <div className="detail-group">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Delivery</label>
                  <div className="text-gray-800 bg-gray-50 px-3 py-2 rounded-md">
                    {shipment.delivery_address}
                    <div className="address-sub text-sm text-gray-600 mt-1">
                      {shipment.delivery_city}, {shipment.delivery_postal_code}
                    </div>
                  </div>
                </div>

                <div className="detail-group">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Assign Driver</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selections[shipment.id]?.driver_id || ''}
                    onChange={(e) => handleSelectionChange(shipment.id, 'driver_id', e.target.value)}
                    disabled={processingId === shipment.id}
                  >
                    <option value="">Select a driver</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.username} (ID: {driver.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="detail-group">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Assign Vehicle</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selections[shipment.id]?.vehicle_id || ''}
                    onChange={(e) => handleSelectionChange(shipment.id, 'vehicle_id', e.target.value)}
                    disabled={processingId === shipment.id}
                  >
                    <option value="">Select a vehicle</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_name} ({vehicle.license_plate})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="shipment-actions p-4 border-t border-gray-200 bg-gray-50">
                <button
                  className={`w-full py-2 px-4 rounded-md font-medium text-white ${
                    processingId === shipment.id 
                      ? 'bg-blue-400 cursor-not-allowed' 
                      : (!selections[shipment.id]?.driver_id || !selections[shipment.id]?.vehicle_id)
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                  onClick={() => handleApprove(shipment.id)}
                  disabled={processingId === shipment.id || !selections[shipment.id]?.driver_id || !selections[shipment.id]?.vehicle_id}
                >
                  {processingId === shipment.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Approving...
                    </span>
                  ) : 'Approve Shipment'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApproveShipments; 