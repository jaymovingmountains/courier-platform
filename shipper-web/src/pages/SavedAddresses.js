import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import './SavedAddresses.css';
import { handleApiError, getAuthConfig } from '../utils/apiErrorHandler';
import CustomErrorMessage from '../components/ErrorMessage';
import { PROVINCES } from '../utils/constants';

// Check authentication and display proper error
const checkAuth = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No authentication token found!');
    return false;
  }
  return true;
};

// Validation schema for address form
const addressSchema = Yup.object().shape({
  address_name: Yup.string()
    .required('Address name is required')
    .min(3, 'Address name must be at least 3 characters'),
  address: Yup.string()
    .required('Street address is required')
    .min(5, 'Street address is too short'),
  city: Yup.string()
    .required('City is required')
    .min(2, 'City name is too short'),
  postal_code: Yup.string()
    .required('Postal code is required')
    .matches(/^[0-9A-Z]{3,10}$/i, 'Invalid postal code format'),
  province: Yup.string()
    .required('Province is required'),
  is_pickup: Yup.boolean(),
  is_default: Yup.boolean()
});

const SavedAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [filteredAddresses, setFilteredAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deletingAddress, setDeletingAddress] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'pickup', 'delivery'

  // Fetch all addresses
  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!checkAuth()) {
        setError('Your session has expired. Please log in again to view addresses.');
        setLoading(false);
        return;
      }
      
      const config = getAuthConfig();
      console.log('Fetching addresses with config:', config);
      
      const response = await axios.get('http://localhost:3001/addresses', config);
      console.log('Fetched addresses:', response.data);
      
      setAddresses(response.data);
      applyFilter(response.data, filterType);
      setError(null);
    } catch (err) {
      console.error('Error fetching addresses:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      let errorMessage;
      
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 404) {
        errorMessage = 'The address service is currently unavailable.';
      } else {
        errorMessage = handleApiError(err, {
          endpoint: '/addresses',
          operation: 'fetching addresses'
        });
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  // Apply filter to addresses
  const applyFilter = (addressList, filter) => {
    switch (filter) {
      case 'pickup':
        setFilteredAddresses(addressList.filter(a => a.is_pickup === 1));
        break;
      case 'delivery':
        setFilteredAddresses(addressList.filter(a => a.is_pickup === 0));
        break;
      default:
        setFilteredAddresses(addressList);
    }
  };

  // Update filter type
  const handleFilterChange = (newFilter) => {
    setFilterType(newFilter);
    applyFilter(addresses, newFilter);
  };

  // Load addresses on component mount
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Show success message temporarily
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle form submission for creating/editing address
  const handleAddressSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      if (!checkAuth()) {
        setError('Your session has expired. Please log in again to save addresses.');
        setSubmitting(false);
        return;
      }

      const config = getAuthConfig();
      console.log('Submitting address with values:', values);
      console.log('Request config:', config);
      
      if (editingAddress) {
        // Update existing address
        const updateUrl = `http://localhost:3001/addresses/${editingAddress.id}`;
        console.log(`Updating address at: ${updateUrl}`);
        
        const response = await axios.put(updateUrl, values, config);
        console.log('Update response:', response.data);
        
        setSuccessMessage('Address updated successfully');
        setEditingAddress(null);
      } else {
        // Create new address
        const createUrl = 'http://localhost:3001/addresses';
        console.log(`Creating address at: ${createUrl}`);
        
        const response = await axios.post(createUrl, values, config);
        console.log('Create response:', response.data);
        
        setSuccessMessage('New address added successfully');
        setShowAddressForm(false);
      }
      
      // Refresh addresses list
      await fetchAddresses();
      resetForm();
    } catch (err) {
      console.error('Error saving address:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        stack: err.stack
      });
      
      let errorMessage;
      
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 404) {
        errorMessage = 'The address service is currently unavailable. Please try again later.';
      } else {
        errorMessage = handleApiError(err, {
          endpoint: editingAddress ? `/addresses/${editingAddress.id}` : '/addresses',
          operation: editingAddress ? 'updating address' : 'creating address'
        });
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle address deletion
  const handleDeleteAddress = async () => {
    if (!deletingAddress) return;

    try {
      await axios.delete(
        `http://localhost:3001/addresses/${deletingAddress.id}`,
        getAuthConfig()
      );
      
      setSuccessMessage('Address deleted successfully');
      await fetchAddresses();
      setDeletingAddress(null);
    } catch (err) {
      const errorMessage = handleApiError(err, {
        endpoint: `/addresses/${deletingAddress.id}`,
        operation: 'deleting address'
      });
      setError(errorMessage);
    }
  };

  // Set address as default
  const handleSetDefault = async (address) => {
    try {
      await axios.put(
        `http://localhost:3001/addresses/${address.id}`,
        { is_default: true },
        getAuthConfig()
      );
      
      setSuccessMessage(`"${address.address_name}" set as default ${address.is_pickup ? 'pickup' : 'delivery'} address`);
      await fetchAddresses();
    } catch (err) {
      const errorMessage = handleApiError(err, {
        endpoint: `/addresses/${address.id}`,
        operation: 'setting default address'
      });
      setError(errorMessage);
    }
  };

  // Address form component
  const AddressForm = ({ initialValues, onSubmit, title }) => (
    <div className="address-form-container">
      <div className="address-form-header">
        <h2>{title}</h2>
        <button 
          className="close-button" 
          onClick={() => {
            setShowAddressForm(false);
            setEditingAddress(null);
          }}
        >
          ×
        </button>
      </div>
      
      <Formik
        initialValues={initialValues}
        validationSchema={addressSchema}
        onSubmit={onSubmit}
      >
        {({ errors, touched, isSubmitting, values }) => (
          <Form className="address-form">
            <div className="form-group">
              <label htmlFor="address_name">Address Name</label>
              <Field
                type="text"
                name="address_name"
                className={`form-control ${errors.address_name && touched.address_name ? 'is-invalid' : ''}`}
                placeholder="e.g., Home, Office, Warehouse"
              />
              <ErrorMessage name="address_name" component="div" className="error-message" />
            </div>
            
            <div className="form-group">
              <label htmlFor="address">Street Address</label>
              <Field
                type="text"
                name="address"
                className={`form-control ${errors.address && touched.address ? 'is-invalid' : ''}`}
                placeholder="Enter full street address"
              />
              <ErrorMessage name="address" component="div" className="error-message" />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <Field
                  type="text"
                  name="city"
                  className={`form-control ${errors.city && touched.city ? 'is-invalid' : ''}`}
                  placeholder="Enter city"
                />
                <ErrorMessage name="city" component="div" className="error-message" />
              </div>
              
              <div className="form-group">
                <label htmlFor="province">Province</label>
                <Field
                  as="select"
                  name="province"
                  className={`form-control ${errors.province && touched.province ? 'is-invalid' : ''}`}
                >
                  <option value="">Select Province</option>
                  {PROVINCES.map(province => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </Field>
                <ErrorMessage name="province" component="div" className="error-message" />
              </div>
              
              <div className="form-group">
                <label htmlFor="postal_code">Postal Code</label>
                <Field
                  type="text"
                  name="postal_code"
                  className={`form-control ${errors.postal_code && touched.postal_code ? 'is-invalid' : ''}`}
                  placeholder="Enter postal code"
                />
                <ErrorMessage name="postal_code" component="div" className="error-message" />
              </div>
            </div>
            
            <div className="form-row checkbox-row">
              <div className="form-group">
                <label className="checkbox-label">
                  <Field
                    type="checkbox"
                    name="is_pickup"
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">Use as pickup address</span>
                </label>
              </div>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <Field
                    type="checkbox"
                    name="is_default"
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">Set as default {values.is_pickup ? 'pickup' : 'delivery'} address</span>
                </label>
              </div>
            </div>
            
            <div className="form-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : editingAddress ? 'Update Address' : 'Save Address'}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );

  return (
    <div className="saved-addresses-page">
      <div className="page-header">
        <h1>Saved Addresses</h1>
        <button 
          className="add-address-button"
          onClick={() => setShowAddressForm(true)}
        >
          Add New Address
        </button>
      </div>
      
      {successMessage && (
        <div className="success-message">
          <i className="fas fa-check-circle"></i> {successMessage}
        </div>
      )}
      
      {error && (
        <CustomErrorMessage 
          message={error}
          onRetry={fetchAddresses}
          onDismiss={() => setError(null)}
          variant="error"
        />
      )}
      
      <div className="address-filters">
        <button 
          className={`filter-button ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All Addresses
        </button>
        <button 
          className={`filter-button ${filterType === 'pickup' ? 'active' : ''}`}
          onClick={() => handleFilterChange('pickup')}
        >
          Pickup Addresses
        </button>
        <button 
          className={`filter-button ${filterType === 'delivery' ? 'active' : ''}`}
          onClick={() => handleFilterChange('delivery')}
        >
          Delivery Addresses
        </button>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your saved addresses...</p>
        </div>
      ) : filteredAddresses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-map-marker-alt"></i>
          </div>
          <h3>No Saved Addresses</h3>
          <p>
            {filterType === 'all' 
              ? 'You have no saved addresses yet. Add your first address to get started.' 
              : `You have no saved ${filterType} addresses yet.`}
          </p>
          {filterType !== 'all' && (
            <button 
              className="empty-action-button"
              onClick={() => handleFilterChange('all')}
            >
              View All Addresses
            </button>
          )}
        </div>
      ) : (
        <div className="addresses-grid">
          {filteredAddresses.map(address => (
            <div key={address.id} className="address-card">
              <div className="address-card-header">
                <h3>{address.address_name}</h3>
                {address.is_default && (
                  <span className="default-badge">Default</span>
                )}
                <span className={`address-type-badge ${address.is_pickup ? 'pickup' : 'delivery'}`}>
                  {address.is_pickup ? 'Pickup' : 'Delivery'}
                </span>
              </div>
              
              <div className="address-card-body">
                <p className="street-address">{address.address}</p>
                <p className="city-province">
                  {address.city}, {address.province} {address.postal_code}
                </p>
              </div>
              
              <div className="address-card-actions">
                {!address.is_default && (
                  <button 
                    className="default-button"
                    onClick={() => handleSetDefault(address)}
                  >
                    Set as Default
                  </button>
                )}
                <button 
                  className="edit-button"
                  onClick={() => setEditingAddress(address)}
                >
                  Edit
                </button>
                <button 
                  className="delete-button"
                  onClick={() => setDeletingAddress(address)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Address Form Modal */}
      {(showAddressForm || editingAddress) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <AddressForm
              initialValues={editingAddress || {
                address_name: '',
                address: '',
                city: '',
                postal_code: '',
                province: '',
                is_pickup: true,
                is_default: false
              }}
              onSubmit={handleAddressSubmit}
              title={editingAddress ? "Edit Address" : "Add New Address"}
            />
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deletingAddress && (
        <div className="modal-overlay">
          <div className="modal-content confirmation-modal">
            <div className="confirmation-header">
              <h2>Delete Address</h2>
              <button 
                className="close-button" 
                onClick={() => setDeletingAddress(null)}
              >
                ×
              </button>
            </div>
            
            <div className="confirmation-body">
              <p>Are you sure you want to delete this address?</p>
              <div className="address-preview">
                <p><strong>{deletingAddress.address_name}</strong></p>
                <p>{deletingAddress.address}</p>
                <p>{deletingAddress.city}, {deletingAddress.province} {deletingAddress.postal_code}</p>
              </div>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            
            <div className="confirmation-actions">
              <button 
                className="cancel-button"
                onClick={() => setDeletingAddress(null)}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-button"
                onClick={handleDeleteAddress}
              >
                Delete Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedAddresses; 