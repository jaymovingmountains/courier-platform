import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTable, useSortBy, useGlobalFilter } from 'react-table';
import axios from 'axios';
import { API_URL } from '../utils/api';
import './Dashboard.css';
import ShipmentModal from '../components/ShipmentModal';
import AdminService from '../services/AdminService';

const Dashboard = () => {
  const [shipments, setShipments] = useState([]);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [availableEndpoints, setAvailableEndpoints] = useState({
    users: false,
    shipments: false,
    vehicles: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('Fetching dashboard data from:', API_URL);
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('No authentication token found');
          setError('Authentication token is missing. Please log in again.');
          setLoading(false);
          return;
        }
        
        const headers = { Authorization: `Bearer ${token}` };
        const endpointsStatus = { users: false, shipments: false, vehicles: false };
        let errorMessage = '';
        
        // Fetching users (this should work if /list-users is available)
        try {
          console.log('Attempting to fetch users data...');
          // Try /users first
          let usersData = [];
          try {
            const usersRes = await axios.get(`${API_URL}/users`, { headers });
            console.log('Users API response:', usersRes.status);
            usersData = usersRes.data || [];
            endpointsStatus.users = true;
          } catch (usersError) {
            console.log('Falling back to /list-users endpoint...');
            // Fall back to /list-users if /users fails
            try {
              const listUsersRes = await axios.get(`${API_URL}/list-users`, { headers });
              console.log('List-users API response:', listUsersRes.status);
              usersData = listUsersRes.data?.users || listUsersRes.data || [];
              endpointsStatus.users = true;
            } catch (listUsersError) {
              console.error('Both /users and /list-users endpoints failed:', listUsersError);
              errorMessage += 'Failed to fetch users data. ';
            }
          }
          
          setUsers(usersData);
          console.log(`Successfully fetched ${usersData.length} users`);
        } catch (err) {
          console.error('Error fetching users:', err);
          errorMessage += 'Failed to fetch users data. ';
        }
        
        // Attempting to fetch shipments data
        try {
          console.log('Attempting to fetch shipments data...');
          const shipmentsRes = await axios.get(`${API_URL}/shipments`, { headers });
          console.log('Shipments API response:', shipmentsRes.status);
          const shipmentsData = shipmentsRes.data || [];
          setShipments(shipmentsData);
          endpointsStatus.shipments = true;
          console.log(`Successfully fetched ${shipmentsData.length} shipments`);
        } catch (err) {
          console.log('Shipments endpoint not available:', err.message);
          // Use empty array for shipments if endpoint doesn't exist
          setShipments([]);
        }
        
        // Attempting to fetch vehicles data
        try {
          console.log('Attempting to fetch vehicles data...');
          const vehiclesRes = await axios.get(`${API_URL}/vehicles`, { headers });
          console.log('Vehicles API response:', vehiclesRes.status);
          const vehiclesData = vehiclesRes.data || [];
          setVehicles(vehiclesData);
          endpointsStatus.vehicles = true;
          console.log(`Successfully fetched ${vehiclesData.length} vehicles`);
        } catch (err) {
          console.log('Vehicles endpoint not available:', err.message);
          // Use empty array for vehicles if endpoint doesn't exist
          setVehicles([]);
        }
        
        // Update available endpoints status
        setAvailableEndpoints(endpointsStatus);
        
        // Set error if none of the endpoints are available
        if (!endpointsStatus.users && !endpointsStatus.shipments && !endpointsStatus.vehicles) {
          setError('No data available. The API server may not have the required endpoints implemented.');
        } else if (errorMessage) {
          setError(`Limited data available. ${errorMessage}`);
        } else {
          setError(null);
        }
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
        setError(`Failed to load dashboard data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Open modal with shipment details
  const openShipmentModal = (shipment) => {
    setSelectedShipment(shipment);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedShipment(null);
  };

  // Handle printing shipping label
  const handlePrintLabel = (shipmentId) => {
    // Use API_URL instead of hardcoded localhost
    const labelUrl = `${API_URL}/shipments/${shipmentId}/label`;
    window.open(labelUrl, '_blank');
  };

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      totalShipments: shipments.length,
      pendingApprovals: shipments.filter(s => s.status === 'quoted').length,
      pendingQuotes: shipments.filter(s => s.status === 'pending').length,
      totalUsers: users.length,
      totalShippers: users.filter(u => u.role === 'shipper').length,
      totalDrivers: users.filter(u => u.role === 'driver').length
    };
  }, [shipments, users]);

  // Get recent shipments if available
  const recentShipments = availableEndpoints.shipments 
    ? [...shipments]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
    : [];

  // Calculate total revenue from completed shipments
  const totalRevenue = shipments
    .filter(s => s.status === 'delivered')
    .reduce((sum, shipment) => sum + (parseFloat(shipment.quote_amount) || 0), 0);

  // Define table columns
  const columns = useMemo(
    () => [
      {
        Header: 'ID',
        accessor: 'id',
        Cell: ({ value }) => `#${value}`
      },
      {
        Header: 'Type',
        accessor: 'shipment_type',
        Cell: ({ value }) => value.charAt(0).toUpperCase() + value.slice(1)
      },
      {
        Header: 'Shipper',
        accessor: 'shipper_id',
        Cell: ({ value }) => {
          const shipper = users.find(u => u.id === value);
          return shipper 
            ? shipper.name || shipper.username 
            : `Shipper #${value}`;
        }
      },
      {
        Header: 'Status',
        accessor: 'status',
        Cell: ({ value }) => (
          <span className={`status-badge ${value}`}>
            {value.replace('_', ' ')}
          </span>
        )
      },
      {
        Header: 'Quote Amount',
        accessor: 'quote_amount',
        Cell: ({ value }) => value ? `$${value.toFixed(2)}` : 'Pending'
      },
      {
        Header: 'Pickup',
        accessor: row => `${row.pickup_city}, ${row.pickup_postal_code}`
      },
      {
        Header: 'Delivery',
        accessor: row => `${row.delivery_city}, ${row.delivery_postal_code}`
      },
      {
        Header: 'Actions',
        Cell: ({ row }) => (
          <div className="action-buttons">
            {row.original.status === 'pending' && (
              <button
                onClick={() => navigate(`/provide-quotes/${row.original.id}`)}
                className="action-button quote"
              >
                Quote
              </button>
            )}
            {row.original.status === 'quoted' && (
              <button
                onClick={() => navigate(`/approve-shipments/${row.original.id}`)}
                className="action-button approve"
              >
                Approve
              </button>
            )}
            <button
              onClick={() => openShipmentModal(row.original)}
              className="action-button view"
            >
              View
            </button>
          </div>
        )
      }
    ],
    [navigate, users]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    setGlobalFilter,
  } = useTable(
    {
      columns,
      data: recentShipments
    },
    useGlobalFilter,
    useSortBy
  );

  // Add function to test API connection
  const testApiConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionStatus(null);
      
      console.log('Testing API connection to:', API_URL);
      const result = await AdminService.testConnection();
      
      console.log('Connection test result:', result);
      setConnectionStatus(result);
    } catch (error) {
      console.error('Error during connection test:', error);
      setConnectionStatus({
        success: false,
        error: error.message,
        baseUrl: API_URL
      });
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1>Admin Dashboard</h1>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalShipments}</div>
          <div className="stat-label">Total Shipments</div>
        </div>
        <div className="stat-card pending-quotes">
          <div className="stat-value">{stats.pendingQuotes}</div>
          <div className="stat-label">Pending Quotes</div>
        </div>
        <div className="stat-card pending-approvals">
          <div className="stat-value">{stats.pendingApprovals}</div>
          <div className="stat-label">Pending Approvals</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
      </div>

      <div className="quick-actions">
        <button
          className="action-card"
          onClick={() => navigate('/manage-users')}
        >
          <span className="action-icon">👥</span>
          <h3>Manage Users</h3>
          <p>{stats.totalUsers} users ({stats.totalShippers} shippers, {stats.totalDrivers} drivers)</p>
        </button>
        <button
          className="action-card"
          onClick={() => navigate('/approve-shipments')}
        >
          <span className="action-icon">✓</span>
          <h3>Approve Shipments</h3>
          <p>{stats.pendingApprovals} shipments waiting for approval</p>
        </button>
        <button
          className="action-card"
          onClick={() => navigate('/provide-quotes')}
        >
          <span className="action-icon">💰</span>
          <h3>Provide Quotes</h3>
          <p>{stats.pendingQuotes} shipments need quotes</p>
        </button>
      </div>

      <div className="table-section">
        <div className="table-header">
          <h2>Recent Shipments</h2>
          <input
            type="text"
            placeholder="Search shipments..."
            onChange={e => setGlobalFilter(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="table-container">
          <table {...getTableProps()} className="data-table">
            <thead>
              {headerGroups.map(headerGroup => (
                <tr {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map(column => (
                    <th
                      {...column.getHeaderProps(column.getSortByToggleProps())}
                      className={
                        column.isSorted
                          ? column.isSortedDesc
                            ? 'sort-desc'
                            : 'sort-asc'
                          : ''
                      }
                    >
                      {column.render('Header')}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody {...getTableBodyProps()}>
              {rows.map(row => {
                prepareRow(row);
                return (
                  <tr {...row.getRowProps()}>
                    {row.cells.map(cell => (
                      <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shipment Modal */}
      {isModalOpen && (
        <ShipmentModal
          shipment={selectedShipment}
          onClose={closeModal}
          onPrintLabel={handlePrintLabel}
          users={users}
          vehicles={vehicles}
        />
      )}

      {connectionStatus && (
        <div className={`connection-status ${connectionStatus.success ? 'success' : 'failure'}`}>
          <h3>Connection Test Results:</h3>
          <p>API URL: {connectionStatus.baseUrl}</p>
          <p>Status: {connectionStatus.success ? 'Success' : 'Failed'}</p>
          {connectionStatus.status && <p>HTTP Status: {connectionStatus.status}</p>}
          {connectionStatus.duration && <p>Response Time: {connectionStatus.duration}ms</p>}
          {connectionStatus.error && <p>Error: {connectionStatus.error}</p>}
          {connectionStatus.data && <p>Response Data: {JSON.stringify(connectionStatus.data)}</p>}
          <p>
            <strong>Troubleshooting Tips:</strong>
          </p>
          <ul>
            <li>Verify the API server is running at {API_URL}</li>
            <li>Check for CORS issues if the API is on a different domain</li>
            <li>Ensure your auth token is valid in localStorage</li>
            <li>Check browser console for detailed error logs</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 