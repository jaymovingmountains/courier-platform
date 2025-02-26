import React, { useState, useEffect, useMemo } from 'react';
import { useTable, useSortBy, useGlobalFilter } from 'react-table';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import './VehicleManagement.css';

// Validation schema for vehicle form
const vehicleSchema = Yup.object().shape({
  vehicle_name: Yup.string()
    .min(2, 'Vehicle name must be at least 2 characters')
    .required('Vehicle name is required'),
  license_plate: Yup.string()
    .min(2, 'License plate must be at least 2 characters')
    .required('License plate is required'),
});

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deletingVehicle, setDeletingVehicle] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch vehicles from API
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/vehicles', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setVehicles(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch vehicles. Please try again.');
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle creating a new vehicle
  const handleCreateVehicle = async (values, { setSubmitting, resetForm }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3001/vehicles', values, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setSuccessMessage('Vehicle created successfully!');
      resetForm();
      setShowAddForm(false);
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create vehicle. Please try again.');
      console.error('Error creating vehicle:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle updating an existing vehicle
  const handleUpdateVehicle = async (values, { setSubmitting }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3001/vehicles/${editingVehicle.id}`, values, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setSuccessMessage('Vehicle updated successfully!');
      setEditingVehicle(null);
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update vehicle. Please try again.');
      console.error('Error updating vehicle:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle deleting a vehicle
  const handleDeleteVehicle = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3001/vehicles/${deletingVehicle.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setSuccessMessage('Vehicle deleted successfully!');
      setDeletingVehicle(null);
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete vehicle. Please try again.');
      console.error('Error deleting vehicle:', err);
    }
  };

  // Define table columns
  const columns = useMemo(
    () => [
      {
        Header: 'ID',
        accessor: 'id',
      },
      {
        Header: 'Vehicle Name',
        accessor: 'vehicle_name',
      },
      {
        Header: 'License Plate',
        accessor: 'license_plate',
      },
      {
        Header: 'Actions',
        accessor: 'actions',
        Cell: ({ row }) => (
          <div className="action-buttons">
            <button
              className="edit-btn"
              onClick={() => setEditingVehicle(row.original)}
            >
              Edit
            </button>
            <button
              className="delete-btn"
              onClick={() => setDeletingVehicle(row.original)}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // Set up react-table
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    setGlobalFilter,
  } = useTable(
    {
      columns,
      data: vehicles,
    },
    useGlobalFilter,
    useSortBy
  );

  const { globalFilter } = state;

  // Vehicle form component
  const VehicleForm = ({ initialValues, onSubmit, title, submitText }) => (
    <div className="form-container">
      <h2>{title}</h2>
      <Formik
        initialValues={initialValues}
        validationSchema={vehicleSchema}
        onSubmit={onSubmit}
      >
        {({ isSubmitting, errors, touched }) => (
          <Form className="vehicle-form">
            <div className="form-group">
              <label htmlFor="vehicle_name">Vehicle Name</label>
              <Field
                type="text"
                id="vehicle_name"
                name="vehicle_name"
                className={errors.vehicle_name && touched.vehicle_name ? 'error' : ''}
              />
              <ErrorMessage name="vehicle_name" component="div" className="error-message" />
            </div>

            <div className="form-group">
              <label htmlFor="license_plate">License Plate</label>
              <Field
                type="text"
                id="license_plate"
                name="license_plate"
                className={errors.license_plate && touched.license_plate ? 'error' : ''}
              />
              <ErrorMessage name="license_plate" component="div" className="error-message" />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  if (initialValues.id) {
                    setEditingVehicle(null);
                  } else {
                    setShowAddForm(false);
                  }
                }}
              >
                Cancel
              </button>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : submitText}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );

  return (
    <div className="vehicle-management">
      <div className="page-header">
        <h1>Vehicle Management</h1>
        <button
          className="add-btn"
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
        >
          Add New Vehicle
        </button>
      </div>

      {error && (
        <div className="error-alert">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="success-alert">
          <p>{successMessage}</p>
          <button onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}

      {showAddForm && (
        <VehicleForm
          initialValues={{ vehicle_name: '', license_plate: '' }}
          onSubmit={handleCreateVehicle}
          title="Add New Vehicle"
          submitText="Create Vehicle"
        />
      )}

      {editingVehicle && (
        <VehicleForm
          initialValues={{
            vehicle_name: editingVehicle.vehicle_name,
            license_plate: editingVehicle.license_plate,
          }}
          onSubmit={handleUpdateVehicle}
          title="Edit Vehicle"
          submitText="Update Vehicle"
        />
      )}

      {deletingVehicle && (
        <div className="modal-backdrop">
          <div className="confirmation-modal">
            <h2>Confirm Deletion</h2>
            <p>
              Are you sure you want to delete the vehicle "{deletingVehicle.vehicle_name}" with license plate "{deletingVehicle.license_plate}"?
            </p>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setDeletingVehicle(null)}
              >
                Cancel
              </button>
              <button
                className="delete-btn"
                onClick={handleDeleteVehicle}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading vehicles...</div>
      ) : (
        <>
          <div className="table-controls">
            <div className="search-container">
              <input
                value={globalFilter || ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search vehicles..."
                className="search-input"
              />
            </div>
          </div>

          <div className="table-container">
            <table {...getTableProps()} className="vehicles-table">
              <thead>
                {headerGroups.map((headerGroup) => (
                  <tr {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map((column) => (
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
                        <span className="sort-indicator">
                          {column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody {...getTableBodyProps()}>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="no-data">
                      No vehicles found. Add a new vehicle to get started.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    prepareRow(row);
                    return (
                      <tr {...row.getRowProps()}>
                        {row.cells.map((cell) => (
                          <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default VehicleManagement; 