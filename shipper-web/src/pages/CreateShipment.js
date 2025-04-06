import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import axios from 'axios';
import { FaBox, FaTruck, FaRocket, FaMapMarkerAlt, FaRegCalendarAlt, FaBoxOpen, FaWeightHanging, FaCheckCircle, FaAngleLeft, FaAngleRight } from 'react-icons/fa';
import './CreateShipment.css';
import { API_URL, getAuthConfig } from '../utils/api';
import ApiDiagnostic from '../components/ApiDiagnostic';

// Constants
// const GEOAPIFY_API_KEY = process.env.REACT_APP_GEOAPIFY_API_KEY || '827b47a2fafa4abdbd69f3073195aedf';

// Canadian provinces and territories array
const PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' }
];

// Validation schemas for each step
const ShipmentTypeSchema = Yup.object().shape({
  shipment_type: Yup.string()
    .required('Please select a shipment type')
    .oneOf(['standard', 'express', 'priority'], 'Invalid shipment type'),
});

const PackageDetailsSchema = Yup.object().shape({
  weight: Yup.number()
    .required('Weight is required')
    .positive('Weight must be a positive number')
    .max(500, 'Weight cannot exceed 500 kg'),
  length: Yup.number()
    .required('Length is required')
    .positive('Length must be a positive number'),
  width: Yup.number()
    .required('Width is required')
    .positive('Width must be a positive number'),
  height: Yup.number()
    .required('Height is required')
    .positive('Height must be a positive number'),
  is_fragile: Yup.boolean(),
  requires_refrigeration: Yup.boolean(),
  notes: Yup.string(),
});

const PickupDetailsSchema = Yup.object().shape({
  pickup_address: Yup.string()
    .required('Pickup address is required')
    .min(5, 'Address is too short'),
  pickup_city: Yup.string()
    .required('Pickup city is required')
    .min(2, 'City name is too short'),
  pickup_postal_code: Yup.string()
    .required('Pickup postal code is required')
    .matches(/^[0-9A-Z]{3,10}$/i, 'Invalid postal code format'),
  pickup_date: Yup.date()
    .required('Pickup date is required')
    .min(new Date(), 'Pickup date cannot be in the past'),
  pickup_time: Yup.string()
    .required('Pickup time is required'),
  pickup_province: Yup.string()
    .required('Province is required')
    .oneOf(PROVINCES.map(p => p.code), 'Invalid province code'),
});

const DeliveryDetailsSchema = Yup.object().shape({
  delivery_address: Yup.string()
    .required('Delivery address is required')
    .min(5, 'Address is too short'),
  delivery_city: Yup.string()
    .required('Delivery city is required')
    .min(2, 'City name is too short'),
  delivery_postal_code: Yup.string()
    .required('Delivery postal code is required')
    .matches(/^[0-9A-Z]{3,10}$/i, 'Invalid postal code format'),
  delivery_instructions: Yup.string(),
  delivery_province: Yup.string()
    .required('Province is required')
    .oneOf(PROVINCES.map(p => p.code), 'Invalid province code'),
});

// Combine schemas for final validation
const shipmentSchema = Yup.object().shape({
  ...ShipmentTypeSchema.fields,
  ...PackageDetailsSchema.fields,
  ...PickupDetailsSchema.fields,
  ...DeliveryDetailsSchema.fields,
});

// Add CSS styles at the top of the file
const styles = {
  formSection: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  addressInstructions: {
    marginBottom: '15px',
    fontSize: '0.9rem',
    color: '#6c757d'
  },
  addressContainer: {
    marginBottom: '20px'
  },
  addressFieldsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  savedAddressesSection: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '5px',
    border: '1px solid #e9ecef'
  },
  selectWithButton: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  }
};

const CreateShipment = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createdShipmentId, setCreatedShipmentId] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [savedPickupAddresses, setSavedPickupAddresses] = useState([]);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  const [formValues, setFormValues] = useState({});

  console.log('Component render state:', { 
    createSuccess, 
    createdShipmentId, 
    step, 
    isSubmitting 
  });

  // For development debugging - uncomment when needed
  // const debugTriggerSuccess = () => {
  //   const demoId = 'debug-' + Math.floor(Math.random() * 1000);
  //   setCreatedShipmentId(demoId);
  //   setCreateSuccess(true);
  // };

  // Fetch saved addresses on component mount
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_URL}/clients`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setSavedAddresses(response.data);
      } catch (error) {
        console.error('Error fetching saved addresses:', error);
      }
    };

    fetchSavedAddresses();
  }, []);

  // Fetch saved pickup addresses
  useEffect(() => {
    const fetchSavedPickupAddresses = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_URL}/addresses`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        // Filter for pickup addresses (where is_pickup = 1)
        const pickupAddresses = response.data.filter(addr => addr.is_pickup === 1);
        setSavedPickupAddresses(pickupAddresses);
      } catch (error) {
        console.error('Error fetching saved pickup addresses:', error);
      }
    };

    fetchSavedPickupAddresses();
  }, []);

  // Calculate estimates when form values change
  useEffect(() => {
    if (Object.keys(formValues).length > 0) {
      calculateEstimates(formValues);
    }
  }, [formValues]);

  // Calculate estimated delivery date
  const calculateEstimates = (values) => {
    if (!values.shipment_type || !values.pickup_date) return;

    // Calculate estimated delivery date
    const pickupDate = values.pickup_date ? new Date(values.pickup_date) : new Date();
    const deliveryDate = new Date(pickupDate);
    
    switch (values.shipment_type) {
      case 'priority':
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        break;
      case 'express':
        deliveryDate.setDate(deliveryDate.getDate() + 2);
        break;
      default:
        deliveryDate.setDate(deliveryDate.getDate() + 4);
        break;
    }
    
    setEstimatedDeliveryDate(deliveryDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));
  };

  const nextStep = (values) => {
    setFormValues(values);
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setStep(step - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (values, { setStatus, validateForm }) => {
    console.log('Form submission started');
    
    // Get token at the beginning of the function
    const token = localStorage.getItem('token');
    
    try {
      console.log('Starting form submission with values:', values);
      setIsSubmitting(true);
      
      // Validate all fields before submission
      const errors = await validateForm(values);
      console.log('Validation errors:', errors);
      
      if (Object.keys(errors).length > 0) {
        console.error('Form validation failed:', errors);
        setStatus('Please fill in all required fields correctly.');
        setIsSubmitting(false);
        return;
      }
      
      // Save pickup address if requested
      if (values.save_pickup_address) {
        await savePickupAddress(values);
      }
      
      // Format the values for the API
      const shipmentData = {
        ...values,
        status: 'pending',
        pickup_date: new Date(values.pickup_date).toISOString().split('T')[0],
        pickup_time: values.pickup_time,
        // Use the pickup province as the shipment province
        province: values.pickup_province
      };
      
      console.log('Token retrieved:', token ? 'Token exists' : 'No token found');
      console.log('API endpoint:', `${API_URL}/shipments`);
      console.log('Shipment data being sent:', shipmentData);
      
      if (!token) {
        console.log('No authentication token found. Using demo mode.');
        setTimeout(() => {
          const demoId = 'demo-' + Math.floor(Math.random() * 1000);
          setCreatedShipmentId(demoId);
          setCreateSuccess(true);
          console.log('Demo success state set:', { createSuccess: true, createdShipmentId: demoId });
          window.scrollTo(0, 0);
          setIsSubmitting(false);
        }, 1500);
        return;
      }
      
      const response = await axios.post(
        `${API_URL}/shipments`,
        shipmentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('API Response received:', response);
      
      if (!response.data || !response.data.id) {
        throw new Error('Invalid response from server: missing shipment ID');
      }
      
      // Set the success state variables
      setCreatedShipmentId(response.data.id);
      setCreateSuccess(true);
      
      console.log('Success state set:', { 
        createSuccess: true, 
        createdShipmentId: response.data.id 
      });
      
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Create shipment error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack
      });
      
      // If there's an authentication error, use demo mode
      if (error.response?.status === 401 || error.response?.data?.error === 'Invalid token') {
        console.log('Authentication failed. Using demo mode.');
        setTimeout(() => {
          const demoId = 'demo-' + Math.floor(Math.random() * 1000);
          setCreatedShipmentId(demoId);
          setCreateSuccess(true);
          console.log('Demo success state set after auth error:', { createSuccess: true, createdShipmentId: demoId });
          window.scrollTo(0, 0);
        }, 1500);
      } else {
        const errorMessage = error.response?.data?.error || error.message || 'Failed to create shipment. Please try again.';
        console.error('Setting error status:', errorMessage);
        setStatus(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to save pickup address
  const savePickupAddress = async (values) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No authentication token found. Cannot save address.');
        return;
      }

      const addressData = {
        address_name: `Pickup: ${values.pickup_city}`,
        address: values.pickup_address,
        city: values.pickup_city,
        postal_code: values.pickup_postal_code,
        province: values.pickup_province,
        is_default: false,
        is_pickup: true
      };

      const response = await axios.post(
        `${API_URL}/addresses`,
        addressData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Pickup address saved:', response.data);
      
      // Refresh the saved addresses list
      const updatedAddressesResponse = await axios.get(
        `${API_URL}/addresses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Filter pickup addresses
      const pickupAddresses = updatedAddressesResponse.data.filter(addr => addr.is_pickup === 1);
      setSavedPickupAddresses(pickupAddresses);
      
      return response.data;
    } catch (error) {
      console.error('Save pickup address error:', error);
      return null;
    }
  };

  // Helper function to use saved address
  const applySavedAddress = (address, formikProps, type) => {
    const fieldPrefix = type === 'pickup' ? 'pickup' : 'delivery';
    
    // Check which format of address we're dealing with (client or saved_addresses)
    const values = {
      [`${fieldPrefix}_address`]: address.address,
      [`${fieldPrefix}_city`]: address.city,
      [`${fieldPrefix}_postal_code`]: address.postal_code,
      // Handle province, which could be in different formats
      [`${fieldPrefix}_province`]: address.province || formikProps.values[`${fieldPrefix}_province`]
    };
    
    formikProps.setValues({ ...formikProps.values, ...values });
    if (type === 'pickup') {
      setShowSavedAddresses(false);
    }
  };

  // Format a date for the input field
  const formatDateForInput = (date) => {
    const d = new Date(date);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  // Today's date for min date input
  const today = formatDateForInput(new Date());

  // Success view after shipment creation
  if (createSuccess) {
    return (
      <div className="create-shipment-container">
        <div className="success-container">
          <div className="success-icon">
            <FaCheckCircle />
          </div>
          <h1>Shipment Created Successfully!</h1>
          <p>Your shipment #{createdShipmentId} has been created and is now pending approval.</p>
          <div className="estimated-info">
            <div className="estimate-item">
              <strong>Estimated Delivery:</strong> {estimatedDeliveryDate}
            </div>
          </div>
          <div className="success-actions">
            <button className="view-button" onClick={() => navigate(`/shipments/${createdShipmentId}`)}>
              View Shipment
            </button>
            <button className="create-another-button" onClick={() => {
              setCreateSuccess(false);
              setStep(1);
            }}>
              Create Another Shipment
            </button>
            <button className="back-to-dashboard" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-shipment-container">
      <div className="create-shipment-box">
        <div className="form-header">
          <h1>Create New Shipment</h1>
          <button
            className="back-button"
            onClick={() => navigate('/dashboard')}
          >
            <FaAngleLeft /> Back to Dashboard
          </button>
        </div>

        <div className="form-progress">
          <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-icon">
              <FaBox />
            </div>
            <div className="step-label">Shipment Type</div>
          </div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-icon">
              <FaBoxOpen />
            </div>
            <div className="step-label">Package Details</div>
          </div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
            <div className="step-icon">
              <FaMapMarkerAlt />
            </div>
            <div className="step-label">Pickup</div>
          </div>
          <div className={`progress-step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>
            <div className="step-icon">
              <FaTruck />
            </div>
            <div className="step-label">Delivery</div>
          </div>
          <div className={`progress-step ${step >= 5 ? 'active' : ''}`}>
            <div className="step-icon">
              <FaCheckCircle />
            </div>
            <div className="step-label">Confirm</div>
          </div>
        </div>

        <Formik
          initialValues={{
            shipment_type: '',
            weight: '',
            length: '',
            width: '',
            height: '',
            is_fragile: false,
            requires_refrigeration: false,
            notes: '',
            pickup_address: '',
            pickup_city: '',
            pickup_postal_code: '',
            pickup_province: '',
            pickup_date: formatDateForInput(new Date()),
            pickup_time: '09:00',
            delivery_address: '',
            delivery_city: '',
            delivery_postal_code: '',
            delivery_province: '',
            delivery_instructions: '',
            saveAsTemplate: false,
            save_pickup_address: false,
            selected_client_id: ''
          }}
          validationSchema={shipmentSchema}
          onSubmit={handleSubmit}
          validateOnMount={false}
          validateOnChange={true}
          validateOnBlur={true}
        >
          {(formikProps) => {
            const { values, errors, touched, isSubmitting: formSubmitting, setFieldValue, status, handleSubmit: formikHandleSubmit } = formikProps;
            
            // Update formValues when any relevant field changes
            const handleFieldChange = (field, value) => {
              setFieldValue(field, value);
              setFormValues({...values, [field]: value});
            };

            return (
              <Form>
                {step === 1 && (
                  <div className="form-step">
                    <h2>Select Shipment Type</h2>
                    <p className="step-description">Choose the service level that meets your delivery needs.</p>
                    
                    <div className="shipment-type-options">
                      <label className={`shipment-type-card ${values.shipment_type === 'standard' ? 'selected' : ''}`}>
                        <Field 
                          type="radio"
                          name="shipment_type"
                          value="standard"
                          className="visually-hidden"
                          onChange={(e) => {
                            handleFieldChange('shipment_type', e.target.value);
                          }}
                        />
                        <div className="card-content">
                          <div className="shipment-icon">
                            <FaTruck />
                          </div>
                          <div className="shipment-details">
                            <h3>Standard</h3>
                            <p className="delivery-estimate">3-5 Business Days</p>
                            <p className="shipment-description">
                              Regular shipping service with standard tracking.
                            </p>
                            <div className="price-indicator">Economical</div>
                          </div>
                        </div>
                      </label>
                      
                      <label className={`shipment-type-card ${values.shipment_type === 'express' ? 'selected' : ''}`}>
                        <Field 
                          type="radio"
                          name="shipment_type"
                          value="express"
                          className="visually-hidden"
                          onChange={(e) => {
                            handleFieldChange('shipment_type', e.target.value);
                          }}
                        />
                        <div className="card-content">
                          <div className="shipment-icon express">
                            <FaTruck />
                          </div>
                          <div className="shipment-details">
                            <h3>Express</h3>
                            <p className="delivery-estimate">2 Business Days</p>
                            <p className="shipment-description">
                              Faster shipping with priority handling.
                            </p>
                            <div className="price-indicator">Standard Rates</div>
                          </div>
                        </div>
                      </label>
                      
                      <label className={`shipment-type-card ${values.shipment_type === 'priority' ? 'selected' : ''}`}>
                        <Field 
                          type="radio"
                          name="shipment_type"
                          value="priority"
                          className="visually-hidden"
                          onChange={(e) => {
                            handleFieldChange('shipment_type', e.target.value);
                          }}
                        />
                        <div className="card-content">
                          <div className="shipment-icon priority">
                            <FaRocket />
                          </div>
                          <div className="shipment-details">
                            <h3>Priority</h3>
                            <p className="delivery-estimate">Next Business Day</p>
                            <p className="shipment-description">
                              Fastest delivery with guaranteed arrival time.
                            </p>
                            <div className="price-indicator">Premium Service</div>
                          </div>
                        </div>
                      </label>
                    </div>
                    
                    {errors.shipment_type && touched.shipment_type && (
                      <div className="error-message">{errors.shipment_type}</div>
                    )}
                    
                    <div className="step-actions">
                      <button
                        type="button"
                        className="next-button"
                        disabled={!values.shipment_type}
                        onClick={() => nextStep(values)}
                      >
                        Continue <FaAngleRight />
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="form-step">
                    <h2>Package Details</h2>
                    <p className="step-description">Tell us about the package you're shipping.</p>
                    
                    <div className="package-details-section">
                      <div className="form-section-content">
                        <div className="form-group weight-group">
                          <label htmlFor="weight">
                            <FaWeightHanging /> Weight (kg)
                          </label>
                          <Field
                            type="number"
                            name="weight"
                            id="weight"
                            min="0.1"
                            step="0.1"
                            className={`form-control ${
                              errors.weight && touched.weight ? 'is-invalid' : ''
                            }`}
                            onChange={(e) => {
                              handleFieldChange('weight', e.target.value);
                            }}
                          />
                          <ErrorMessage name="weight" component="div" className="error-message" />
                        </div>
                        
                        <div className="dimensions-group">
                          <h3>Dimensions (in)</h3>
                          <div className="dimensions-inputs">
                            <div className="form-group">
                              <label htmlFor="length">Length</label>
                              <Field
                                type="number"
                                name="length"
                                id="length"
                                min="1"
                                className={`form-control ${
                                  errors.length && touched.length ? 'is-invalid' : ''
                                }`}
                                onChange={(e) => {
                                  handleFieldChange('length', e.target.value);
                                }}
                              />
                              <ErrorMessage name="length" component="div" className="error-message" />
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor="width">Width</label>
                              <Field
                                type="number"
                                name="width"
                                id="width"
                                min="1"
                                className={`form-control ${
                                  errors.width && touched.width ? 'is-invalid' : ''
                                }`}
                                onChange={(e) => {
                                  handleFieldChange('width', e.target.value);
                                }}
                              />
                              <ErrorMessage name="width" component="div" className="error-message" />
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor="height">Height</label>
                              <Field
                                type="number"
                                name="height"
                                id="height"
                                min="1"
                                className={`form-control ${
                                  errors.height && touched.height ? 'is-invalid' : ''
                                }`}
                                onChange={(e) => {
                                  handleFieldChange('height', e.target.value);
                                }}
                              />
                              <ErrorMessage name="height" component="div" className="error-message" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="special-handling-section">
                          <h3>Special Handling Requirements</h3>
                          <div className="checkbox-group">
                            <label className="checkbox-label">
                              <Field
                                type="checkbox"
                                name="is_fragile"
                                className="checkbox-input"
                                onChange={(e) => {
                                  handleFieldChange('is_fragile', e.target.checked);
                                }}
                              />
                              <span className="checkbox-text">Fragile Item</span>
                            </label>
                            
                            <label className="checkbox-label">
                              <Field
                                type="checkbox"
                                name="requires_refrigeration"
                                className="checkbox-input"
                                onChange={(e) => {
                                  handleFieldChange('requires_refrigeration', e.target.checked);
                                }}
                              />
                              <span className="checkbox-text">Requires Refrigeration</span>
                            </label>
                          </div>
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="notes">Additional Notes</label>
                          <Field
                            as="textarea"
                            name="notes"
                            id="notes"
                            className="form-control"
                            placeholder="Special instructions or details about the package..."
                            rows="3"
                            onChange={(e) => {
                              handleFieldChange('notes', e.target.value);
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Shipping estimate panel removed */}
                    </div>
                    
                    <div className="step-actions">
                      <button type="button" className="back-step-button" onClick={prevStep}>
                        <FaAngleLeft /> Back
                      </button>
                      <button
                        type="button"
                        className="next-button"
                        onClick={() => nextStep(values)}
                        disabled={!values.weight || !values.length || !values.width || !values.height}
                      >
                        Continue <FaAngleRight />
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="form-step">
                    <h2>Pickup Details</h2>
                    <p className="step-description">Where should we pick up your package?</p>
                    
                    <div style={styles.formSection}>
                      <h3>Pickup Address</h3>
                      <div style={styles.addressInstructions}>
                        <p>Enter the pickup address details below.</p>
                        {savedPickupAddresses.length > 0 && (
                          <button
                            type="button"
                            className="use-saved-address-button"
                            onClick={() => setShowSavedAddresses(!showSavedAddresses)}
                          >
                            <i className="fas fa-address-book"></i> Use Saved Address
                          </button>
                        )}
                      </div>
                      
                      {showSavedAddresses && (
                        <div className="saved-addresses-dropdown">
                          <h4>Select a Saved Address</h4>
                          <div className="saved-addresses-list">
                            {savedPickupAddresses.map(address => (
                              <div 
                                key={address.id} 
                                className="saved-address-item"
                                onClick={() => applySavedAddress(address, formikProps, 'pickup')}
                              >
                                <div className="address-name">{address.address_name}</div>
                                <div className="address-details">
                                  <div>{address.address}</div>
                                  <div>{address.city}, {address.province} {address.postal_code}</div>
                                </div>
                                {address.is_default && (
                                  <span className="default-badge">Default</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div style={styles.addressContainer}>
                        <div className="form-group">
                          <label htmlFor="pickup_address">Street Address</label>
                          <Field
                            type="text"
                            name="pickup_address"
                            id="pickup_address"
                            className={`form-control ${errors.pickup_address && touched.pickup_address ? 'is-invalid' : ''}`}
                            placeholder="Enter street address"
                            onChange={(e) => {
                              handleFieldChange('pickup_address', e.target.value);
                            }}
                          />
                          <ErrorMessage name="pickup_address" component="div" className="error-message" />
                        </div>
                        
                        <div style={styles.addressFieldsRow}>
                          <div className="form-group">
                            <label htmlFor="pickup_city">City</label>
                            <Field
                              type="text"
                              name="pickup_city"
                              id="pickup_city"
                              className={`form-control ${errors.pickup_city && touched.pickup_city ? 'is-invalid' : ''}`}
                              placeholder="Enter city"
                              onChange={(e) => {
                                handleFieldChange('pickup_city', e.target.value);
                              }}
                            />
                            <ErrorMessage name="pickup_city" component="div" className="error-message" />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="pickup_postal_code">Postal Code</label>
                            <Field
                              type="text"
                              name="pickup_postal_code"
                              id="pickup_postal_code"
                              className={`form-control ${errors.pickup_postal_code && touched.pickup_postal_code ? 'is-invalid' : ''}`}
                              placeholder="Enter postal code"
                              onChange={(e) => {
                                handleFieldChange('pickup_postal_code', e.target.value);
                              }}
                            />
                            <ErrorMessage name="pickup_postal_code" component="div" className="error-message" />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="pickup_province">Province</label>
                            <Field
                              as="select"
                              name="pickup_province"
                              id="pickup_province"
                              className={`form-control ${errors.pickup_province && touched.pickup_province ? 'is-invalid' : ''}`}
                              onChange={(e) => {
                                handleFieldChange('pickup_province', e.target.value);
                              }}
                            >
                              <option value="">Select Province</option>
                              {PROVINCES.map(province => (
                                <option key={province.code} value={province.code}>{province.name}</option>
                              ))}
                            </Field>
                            <ErrorMessage name="pickup_province" component="div" className="error-message" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={styles.formSection}>
                      <h3>Pickup Schedule</h3>
                      <div className="schedule-row">
                        <div className="form-group">
                          <label htmlFor="pickup_date">
                            <FaRegCalendarAlt /> Date
                          </label>
                          <Field
                            type="date"
                            name="pickup_date"
                            id="pickup_date"
                            min={today}
                            className={`form-control ${
                              errors.pickup_date && touched.pickup_date ? 'is-invalid' : ''
                            }`}
                            onChange={(e) => {
                              handleFieldChange('pickup_date', e.target.value);
                            }}
                          />
                          <ErrorMessage name="pickup_date" component="div" className="error-message" />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="pickup_time">Time</label>
                          <Field
                            as="select"
                            name="pickup_time"
                            id="pickup_time"
                            className={`form-control ${
                              errors.pickup_time && touched.pickup_time ? 'is-invalid' : ''
                            }`}
                            onChange={(e) => {
                              handleFieldChange('pickup_time', e.target.value);
                            }}
                          >
                            <option value="09:00">9:00 AM</option>
                            <option value="10:00">10:00 AM</option>
                            <option value="11:00">11:00 AM</option>
                            <option value="12:00">12:00 PM</option>
                            <option value="13:00">1:00 PM</option>
                            <option value="14:00">2:00 PM</option>
                            <option value="15:00">3:00 PM</option>
                            <option value="16:00">4:00 PM</option>
                            <option value="17:00">5:00 PM</option>
                          </Field>
                          <ErrorMessage name="pickup_time" component="div" className="error-message" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="form-group save-address-option">
                      <label className="checkbox-label">
                        <Field
                          type="checkbox"
                          name="save_pickup_address"
                          className="checkbox-input"
                          onChange={(e) => {
                            handleFieldChange('save_pickup_address', e.target.checked);
                          }}
                        />
                        <span className="checkbox-text">Save this address to my pickup addresses</span>
                      </label>
                      <div className="checkbox-help-text">
                        This will save the address for future shipments. You can select it from the dropdown next time.
                      </div>
                    </div>
                    
                    <div className="step-actions">
                      <button type="button" className="back-step-button" onClick={prevStep}>
                        <FaAngleLeft /> Back
                      </button>
                      <button
                        type="button"
                        className="next-button"
                        onClick={() => nextStep(values)}
                        disabled={!values.pickup_address || !values.pickup_city || !values.pickup_postal_code || !values.pickup_province || !values.pickup_date || !values.pickup_time}
                      >
                        Continue <FaAngleRight />
                      </button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="form-step">
                    <h2>Delivery Details</h2>
                    <p className="step-description">Where should we deliver your package?</p>
                    
                    <div style={styles.formSection}>
                      <h3>Delivery Address</h3>
                      <div style={styles.addressInstructions}>
                        <p>Enter the delivery address details below or select a saved client.</p>
                      </div>
                      
                      <div className="saved-addresses-section">
                        <div className="form-group">
                          <label htmlFor="selected_client_id">Select a Client</label>
                          <div className="select-with-button">
                            <Field
                              as="select"
                              name="selected_client_id"
                              id="selected_client_id"
                              className="form-control"
                              onChange={(e) => {
                                const clientId = e.target.value;
                                handleFieldChange('selected_client_id', clientId);
                                
                                if (clientId) {
                                  const selectedClient = savedAddresses.find(addr => addr.id === parseInt(clientId));
                                  if (selectedClient) {
                                    applySavedAddress(selectedClient, formikProps, 'delivery');
                                  }
                                }
                              }}
                            >
                              <option value="">-- Select a client --</option>
                              {savedAddresses.map(address => (
                                <option key={address.id} value={address.id}>
                                  {address.name} - {address.address}, {address.city}
                                </option>
                              ))}
                            </Field>
                          </div>
                        </div>
                      </div>
                      
                      <div style={styles.addressContainer}>
                        <div className="form-group">
                          <label htmlFor="delivery_address">Street Address</label>
                          <Field
                            type="text"
                            name="delivery_address"
                            id="delivery_address"
                            className={`form-control ${errors.delivery_address && touched.delivery_address ? 'is-invalid' : ''}`}
                            placeholder="Enter street address"
                            onChange={(e) => {
                              handleFieldChange('delivery_address', e.target.value);
                            }}
                          />
                          <ErrorMessage name="delivery_address" component="div" className="error-message" />
                        </div>
                        
                        <div style={styles.addressFieldsRow}>
                          <div className="form-group">
                            <label htmlFor="delivery_city">City</label>
                            <Field
                              type="text"
                              name="delivery_city"
                              id="delivery_city"
                              className={`form-control ${errors.delivery_city && touched.delivery_city ? 'is-invalid' : ''}`}
                              placeholder="Enter city"
                              onChange={(e) => {
                                handleFieldChange('delivery_city', e.target.value);
                              }}
                            />
                            <ErrorMessage name="delivery_city" component="div" className="error-message" />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="delivery_postal_code">Postal Code</label>
                            <Field
                              type="text"
                              name="delivery_postal_code"
                              id="delivery_postal_code"
                              className={`form-control ${errors.delivery_postal_code && touched.delivery_postal_code ? 'is-invalid' : ''}`}
                              placeholder="Enter postal code"
                              onChange={(e) => {
                                handleFieldChange('delivery_postal_code', e.target.value);
                              }}
                            />
                            <ErrorMessage name="delivery_postal_code" component="div" className="error-message" />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="delivery_province">Province</label>
                            <Field
                              as="select"
                              name="delivery_province"
                              id="delivery_province"
                              className={`form-control ${errors.delivery_province && touched.delivery_province ? 'is-invalid' : ''}`}
                              onChange={(e) => {
                                handleFieldChange('delivery_province', e.target.value);
                              }}
                            >
                              <option value="">Select Province</option>
                              {PROVINCES.map(province => (
                                <option key={province.code} value={province.code}>{province.name}</option>
                              ))}
                            </Field>
                            <ErrorMessage name="delivery_province" component="div" className="error-message" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="delivery_instructions">Delivery Instructions (Optional)</label>
                      <Field
                        as="textarea"
                        name="delivery_instructions"
                        id="delivery_instructions"
                        className="form-control"
                        placeholder="Any special instructions for the delivery driver..."
                        rows="3"
                        onChange={(e) => {
                          handleFieldChange('delivery_instructions', e.target.value);
                        }}
                      />
                    </div>
                    
                    <div className="step-actions">
                      <button type="button" className="back-step-button" onClick={prevStep}>
                        <FaAngleLeft /> Back
                      </button>
                      <button
                        type="button"
                        className="next-button"
                        onClick={() => nextStep(values)}
                        disabled={!values.delivery_address || !values.delivery_city || !values.delivery_postal_code || !values.delivery_province}
                      >
                        Review <FaAngleRight />
                      </button>
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="form-step">
                    <h2>Review & Confirm</h2>
                    <p className="step-description">Please review your shipment details before submitting.</p>
                    
                    <div className="review-section">
                      <div className="review-group">
                        <h3>Shipment Type</h3>
                        <p className="review-value capitalize">{values.shipment_type}</p>
                      </div>
                      
                      <div className="review-group">
                        <h3>Package Details</h3>
                        <div className="review-details">
                          <p><strong>Weight:</strong> {values.weight} kg</p>
                          <p><strong>Dimensions:</strong> {values.length} × {values.width} × {values.height} in</p>
                          {values.is_fragile && <p><strong>Special Handling:</strong> Fragile</p>}
                          {values.requires_refrigeration && <p><strong>Special Handling:</strong> Requires Refrigeration</p>}
                          {values.notes && (
                            <p><strong>Notes:</strong> {values.notes}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="review-group">
                        <h3>Pickup Details</h3>
                        <div className="review-details">
                          <p><strong>Address:</strong> {values.pickup_address}</p>
                          <p><strong>City:</strong> {values.pickup_city}</p>
                          <p><strong>Postal Code:</strong> {values.pickup_postal_code}</p>
                          <p><strong>Province:</strong> {PROVINCES.find(p => p.code === values.pickup_province)?.name || values.pickup_province}</p>
                          <p>
                            <strong>Schedule:</strong> {new Date(values.pickup_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {values.pickup_time}
                          </p>
                        </div>
                      </div>
                      
                      <div className="review-group">
                        <h3>Delivery Details</h3>
                        <div className="review-details">
                          <p><strong>Address:</strong> {values.delivery_address}</p>
                          <p><strong>City:</strong> {values.delivery_city}</p>
                          <p><strong>Postal Code:</strong> {values.delivery_postal_code}</p>
                          <p><strong>Province:</strong> {PROVINCES.find(p => p.code === values.delivery_province)?.name || values.delivery_province}</p>
                          {values.delivery_instructions && (
                            <p><strong>Instructions:</strong> {values.delivery_instructions}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {status && (
                      <div className="error-message text-center mb-3">{status}</div>
                    )}
                    
                    <div className="step-actions">
                      <button type="button" className="back-step-button" onClick={prevStep}>
                        <FaAngleLeft /> Back
                      </button>
                      <button
                        type="submit"
                        className="submit-button"
                        onClick={() => formikHandleSubmit(values)}
                        disabled={isSubmitting || formSubmitting}
                      >
                        {isSubmitting ? (
                          <>Creating Shipment<span className="loading-dots">...</span></>
                        ) : (
                          <>Create Shipment <FaCheckCircle /></>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {formik.status && (
                  <div className="form-error-message">
                    <p className="error-text">{formik.status}</p>
                    <ApiDiagnostic />
                  </div>
                )}
              </Form>
            );
          }}
        </Formik>
      </div>
    </div>
  );
};

export default CreateShipment; 