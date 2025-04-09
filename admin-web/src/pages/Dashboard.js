import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTable, useSortBy, useGlobalFilter } from 'react-table';
import axios from 'axios';
import './Dashboard.css';
import ShipmentModal from '../components/ShipmentModal';

const Dashboard = () => {
  const [shipments, setShipments] = useState([]);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        // Fetch shipments, users and vehicles data
        const [shipmentsRes, usersRes, vehiclesRes] = await Promise.all([
          axios.get('http://localhost:3001/shipments', { headers }),
          axios.get('http://localhost:3001/users', { headers }),
          axios.get('http://localhost:3001/vehicles', { headers })
        ]);

        setShipments(shipmentsRes.data);
        setUsers(usersRes.data);
        setVehicles(vehiclesRes.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please try again.');
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
  const handlePrintLabel = async (shipmentId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Get the shipping label PDF
      const response = await axios.get(
        `http://localhost:3001/shipments/${shipmentId}/label`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob', // Important for handling PDF data
        }
      );
      
      // Create a blob URL for the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Open the PDF in a new tab
      const printWindow = window.open(url, '_blank');
      
      // Trigger print dialog when PDF is loaded
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    } catch (err) {
      console.error('Error printing shipping label:', err);
      alert('Failed to print shipping label. Please try again.');
    }
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
      data: shipments
    },
    useGlobalFilter,
    useSortBy
  );

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
    </div>
  );
};

export default Dashboard; 