import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './ShipperManagement.css';

const ShipperManagement = () => {
  const { id } = useParams();
  const [shipper, setShipper] = useState(null);
  const [clients, setClients] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [activeTab, setActiveTab] = useState('clients');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchShipperData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Fetch shipper details
        const shipperResponse = await axios.get(`http://localhost:3001/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setShipper(shipperResponse.data);
        
        // Fetch shipper's clients
        const clientsResponse = await axios.get(`http://localhost:3001/admin/shippers/${id}/clients`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setClients(clientsResponse.data);
        
        // Fetch shipper's saved addresses
        const addressesResponse = await axios.get(`http://localhost:3001/admin/shippers/${id}/addresses`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setAddresses(addressesResponse.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching shipper data:', err);
        setError('Failed to load shipper data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchShipperData();
  }, [id]);

  const renderAddressesTable = () => {
    if (addresses.length === 0) {
      return <p className="no-data-message">This shipper has no saved addresses.</p>;
    }
    
    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Address</th>
            <th>City</th>
            <th>Postal Code</th>
            <th>Province</th>
            <th>Type</th>
            <th>Default</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {addresses.map(address => (
            <tr key={address.id}>
              <td>{address.address_name}</td>
              <td>{address.address}</td>
              <td>{address.city}</td>
              <td>{address.postal_code}</td>
              <td>{address.province}</td>
              <td>{address.is_pickup ? 'Pickup' : 'Delivery'}</td>
              <td>{address.is_default ? 'Yes' : 'No'}</td>
              <td>{new Date(address.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderClientsTable = () => {
    if (clients.length === 0) {
      return <p className="no-data-message">This shipper has no saved clients.</p>;
    }
    
    return (
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Company</th>
            <th>Address</th>
            <th>City</th>
            <th>Postal Code</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(client => (
            <tr key={client.id}>
              <td>{client.name}</td>
              <td>{client.email}</td>
              <td>{client.phone}</td>
              <td>{client.company || '-'}</td>
              <td>{client.address}</td>
              <td>{client.city}</td>
              <td>{client.postal_code}</td>
              <td>{new Date(client.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  if (loading) {
    return (
      <div className="shipper-management container">
        <div className="loading">Loading shipper data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shipper-management container">
        <div className="error-message">{error}</div>
        <Link to="/manage-users" className="back-button">Back to Users</Link>
      </div>
    );
  }

  if (!shipper) {
    return (
      <div className="shipper-management container">
        <div className="error-message">Shipper not found</div>
        <Link to="/manage-users" className="back-button">Back to Users</Link>
      </div>
    );
  }

  return (
    <div className="shipper-management container">
      <div className="header">
        <h1>Shipper Account Management</h1>
        <Link to="/manage-users" className="back-button">Back to Users</Link>
      </div>
      
      <div className="shipper-info">
        <h2>{shipper.name} ({shipper.username})</h2>
        <p>Email: {shipper.email || 'Not provided'}</p>
        <p>Phone: {shipper.phone || 'Not provided'}</p>
      </div>
      
      <div className="tabs">
        <button 
          className={activeTab === 'clients' ? 'active' : ''} 
          onClick={() => setActiveTab('clients')}
        >
          Clients ({clients.length})
        </button>
        <button 
          className={activeTab === 'addresses' ? 'active' : ''} 
          onClick={() => setActiveTab('addresses')}
        >
          Saved Addresses ({addresses.length})
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'clients' ? renderClientsTable() : renderAddressesTable()}
      </div>
    </div>
  );
};

export default ShipperManagement; 