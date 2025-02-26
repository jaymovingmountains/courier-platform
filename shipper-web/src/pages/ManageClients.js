import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import './ManageClients.css';

// Enhanced client schema with additional fields
const clientSchema = Yup.object().shape({
  name: Yup.string()
    .required('Client name is required')
    .min(2, 'Name is too short'),
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  phone: Yup.string()
    .matches(/^[0-9+\-() ]{7,20}$/, 'Invalid phone number format')
    .required('Phone number is required'),
  address: Yup.string()
    .required('Address is required')
    .min(5, 'Address is too short'),
  city: Yup.string()
    .required('City is required')
    .min(2, 'City name is too short'),
  postal_code: Yup.string()
    .required('Postal code is required')
    .matches(/^[0-9A-Z]{3,10}$/i, 'Invalid postal code format'),
  notes: Yup.string()
    .max(500, 'Notes must be less than 500 characters'),
  company: Yup.string()
    .max(100, 'Company name must be less than 100 characters'),
  company_size: Yup.string(),
  industry: Yup.string(),
  website: Yup.string().url('Invalid URL format').nullable(),
  logo_url: Yup.string().url('Invalid URL format').nullable(),
});

// Define validation schemas for individual steps
const stepValidationSchema = [
  // Step 1: Company Information
  Yup.object().shape({
    company: Yup.string().nullable(),
    industry: Yup.string().nullable(),
    company_size: Yup.string().nullable(),
    website: Yup.string().url('Invalid URL format').nullable(),
  }),
  // Step 2: Contact Information
  Yup.object().shape({
    name: Yup.string().required('Contact name is required').min(2, 'Name is too short'),
    email: Yup.string().email('Invalid email format').required('Email is required'),
    phone: Yup.string().matches(/^[0-9+\-() ]{7,20}$/, 'Invalid phone number format').required('Phone number is required'),
  }),
  // Step 3: Address Information
  Yup.object().shape({
    address: Yup.string().required('Address is required').min(5, 'Address is too short'),
    city: Yup.string().required('City is required').min(2, 'City name is too short'),
    postal_code: Yup.string().required('Postal code is required').matches(/^[0-9A-Z]{3,10}$/i, 'Invalid postal code format'),
  }),
  // Step 4: Additional Information
  Yup.object().shape({
    notes: Yup.string().max(500, 'Notes must be less than 500 characters'),
  }),
];

// Industry options
const industryOptions = [
  { value: "", label: "Select an industry" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "healthcare", label: "Healthcare" },
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Finance & Insurance" },
  { value: "education", label: "Education" },
  { value: "logistics", label: "Logistics & Transportation" },
  { value: "food", label: "Food & Beverage" },
  { value: "construction", label: "Construction" },
  { value: "other", label: "Other" }
];

// Company size options
const companySizeOptions = [
  { value: "", label: "Select company size" },
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" }
];

const ManageClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [selectedClient, setSelectedClient] = useState(null);

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/clients', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setClients(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch clients. Please try again.');
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update initialValues to include new fields
  const emptyClient = {
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    postal_code: '',
    notes: '',
    company_size: '',
    industry: '',
    website: '',
    logo_url: '',
  };

  const handleCreateClient = async (values, { setSubmitting, resetForm }) => {
    try {
      console.log('Submitting client data:', values);
      // Create a clean copy of values without the new UI-only fields
      const clientData = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        company: values.company || null,
        address: values.address,
        city: values.city,
        postal_code: values.postal_code,
        notes: values.notes || null
      };
      
      const token = localStorage.getItem('token');
      console.log('Sending data to server:', clientData);
      const response = await axios.post(
        'http://localhost:3001/clients',
        clientData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );
      console.log('Server response:', response.data);
      await fetchClients();
      setShowAddForm(false);
      resetForm();
      setError(null);
    } catch (err) {
      console.error('Error creating client:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to create client. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClient = async (values, { setSubmitting }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:3001/clients/${editingClient.id}`,
        values,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );
      await fetchClients();
      setEditingClient(null);
      // Show success message
      setError(null);
    } catch (err) {
      setError('Failed to update client. Please try again.');
      console.error('Error updating client:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:3001/clients/${deletingClient.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await fetchClients();
      setDeletingClient(null);
      // Show success message
      setError(null);
    } catch (err) {
      setError('Failed to delete client. Please try again.');
      console.error('Error deleting client:', err);
    }
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Enhanced ClientForm component with multi-step wizard
  const ClientForm = ({ initialValues, onSubmit, buttonText }) => {
    const [currentStep, setCurrentStep] = useState(0);
    
    const steps = [
      "Company Information",
      "Contact Information",
      "Address Information",
      "Additional Information",
      "Review & Confirm"
    ];

    const handleNext = (values, bag) => {
      // Validate the current step
      try {
        stepValidationSchema[currentStep]?.validateSync(values, { abortEarly: false });
        setCurrentStep(currentStep + 1);
        bag.setTouched({});
      } catch (err) {
        bag.setErrors(err.inner.reduce((acc, error) => {
          return { ...acc, [error.path]: error.message };
        }, {}));
      }
    };

    const handleBack = (values) => {
      setCurrentStep(currentStep - 1);
    };

    const handleSubmit = (values, bag) => {
      if (currentStep === steps.length - 1) {
        onSubmit(values, bag);
      } else {
        handleNext(values, bag);
      }
    };

    return (
      <Formik
        initialValues={initialValues}
        validationSchema={clientSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ errors, touched, isSubmitting, values, handleSubmit: formikHandleSubmit, setFieldValue }) => (
          <Form className="client-form">
            {/* Progress bar */}
            <div className="form-progress-container">
              <div className="form-progress-bar">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`form-progress-step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
                  >
                    <div className="step-indicator">
                      {index < currentStep ? (
                        <i className="fas fa-check"></i>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="step-label">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Company Information */}
            {currentStep === 0 && (
              <div className="form-step company-step">
                <div className="form-section-title">
                  <i className="fas fa-building"></i>
                  <span>Company Information</span>
                </div>
                
                <div className="company-logo-section">
                  <div className="logo-placeholder">
                    {values.logo_url ? (
                      <img src={values.logo_url} alt="Company logo" className="company-logo" />
                    ) : (
                      <i className="fas fa-building company-icon"></i>
                    )}
                  </div>
                  <div className="logo-input">
                    <label htmlFor="logo_url">Company Logo URL (optional)</label>
                    <Field
                      type="text"
                      name="logo_url"
                      className="form-control"
                      placeholder="Enter URL to company logo"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="company">Company Name*</label>
                  <Field
                    type="text"
                    name="company"
                    className={`form-control ${
                      errors.company && touched.company ? 'is-invalid' : ''
                    }`}
                    placeholder="Enter company name"
                  />
                  {errors.company && touched.company && (
                    <div className="error-message">{errors.company}</div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="industry">Industry*</label>
                    <Field
                      as="select"
                      name="industry"
                      className={`form-control ${
                        errors.industry && touched.industry ? 'is-invalid' : ''
                      }`}
                    >
                      {industryOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Field>
                    {errors.industry && touched.industry && (
                      <div className="error-message">{errors.industry}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="company_size">Company Size*</label>
                    <Field
                      as="select"
                      name="company_size"
                      className={`form-control ${
                        errors.company_size && touched.company_size ? 'is-invalid' : ''
                      }`}
                    >
                      {companySizeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Field>
                    {errors.company_size && touched.company_size && (
                      <div className="error-message">{errors.company_size}</div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="website">Company Website (optional)</label>
                  <Field
                    type="text"
                    name="website"
                    className={`form-control ${
                      errors.website && touched.website ? 'is-invalid' : ''
                    }`}
                    placeholder="https://www.example.com"
                  />
                  {errors.website && touched.website && (
                    <div className="error-message">{errors.website}</div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Contact Information */}
            {currentStep === 1 && (
              <div className="form-step contact-step">
                <div className="form-section-title">
                  <i className="fas fa-user"></i>
                  <span>Contact Information</span>
                </div>
                
                <div className="form-group">
                  <label htmlFor="name">Contact Name*</label>
                  <Field
                    type="text"
                    name="name"
                    className={`form-control ${
                      errors.name && touched.name ? 'is-invalid' : ''
                    }`}
                    placeholder="Enter contact person's name"
                  />
                  {errors.name && touched.name && (
                    <div className="error-message">{errors.name}</div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email*</label>
                    <Field
                      type="email"
                      name="email"
                      className={`form-control ${
                        errors.email && touched.email ? 'is-invalid' : ''
                      }`}
                      placeholder="Enter email address"
                    />
                    {errors.email && touched.email && (
                      <div className="error-message">{errors.email}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number*</label>
                    <Field
                      type="text"
                      name="phone"
                      className={`form-control ${
                        errors.phone && touched.phone ? 'is-invalid' : ''
                      }`}
                      placeholder="Enter phone number"
                    />
                    {errors.phone && touched.phone && (
                      <div className="error-message">{errors.phone}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Address Information */}
            {currentStep === 2 && (
              <div className="form-step address-step">
                <div className="form-section-title">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>Address Information</span>
                </div>
                
                <div className="form-group">
                  <label htmlFor="address">Street Address*</label>
                  <Field
                    type="text"
                    name="address"
                    className={`form-control ${
                      errors.address && touched.address ? 'is-invalid' : ''
                    }`}
                    placeholder="Enter street address"
                  />
                  {errors.address && touched.address && (
                    <div className="error-message">{errors.address}</div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City*</label>
                    <Field
                      type="text"
                      name="city"
                      className={`form-control ${
                        errors.city && touched.city ? 'is-invalid' : ''
                      }`}
                      placeholder="Enter city"
                    />
                    {errors.city && touched.city && (
                      <div className="error-message">{errors.city}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="postal_code">Postal Code*</label>
                    <Field
                      type="text"
                      name="postal_code"
                      className={`form-control ${
                        errors.postal_code && touched.postal_code ? 'is-invalid' : ''
                      }`}
                      placeholder="Enter postal code"
                    />
                    {errors.postal_code && touched.postal_code && (
                      <div className="error-message">{errors.postal_code}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Additional Information */}
            {currentStep === 3 && (
              <div className="form-step notes-step">
                <div className="form-section-title">
                  <i className="fas fa-sticky-note"></i>
                  <span>Additional Information</span>
                </div>
                
                <div className="form-group">
                  <label htmlFor="notes">Notes</label>
                  <Field
                    as="textarea"
                    name="notes"
                    className={`form-control ${
                      errors.notes && touched.notes ? 'is-invalid' : ''
                    }`}
                    placeholder="Enter any additional notes about this client"
                    rows="6"
                  />
                  {errors.notes && touched.notes && (
                    <div className="error-message">{errors.notes}</div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Review & Confirm */}
            {currentStep === 4 && (
              <div className="form-step review-step">
                <div className="form-section-title">
                  <i className="fas fa-check-circle"></i>
                  <span>Review & Confirm</span>
                </div>
                
                <div className="review-section">
                  <h3>Company Information</h3>
                  <div className="review-content">
                    {values.logo_url && (
                      <div className="review-logo">
                        <img src={values.logo_url} alt="Company logo" className="review-company-logo" />
                      </div>
                    )}
                    <div className="review-item">
                      <span className="review-label">Company:</span>
                      <span className="review-value">{values.company || 'N/A'}</span>
                    </div>
                    <div className="review-item">
                      <span className="review-label">Industry:</span>
                      <span className="review-value">
                        {industryOptions.find(opt => opt.value === values.industry)?.label || 'N/A'}
                      </span>
                    </div>
                    <div className="review-item">
                      <span className="review-label">Size:</span>
                      <span className="review-value">
                        {companySizeOptions.find(opt => opt.value === values.company_size)?.label || 'N/A'}
                      </span>
                    </div>
                    <div className="review-item">
                      <span className="review-label">Website:</span>
                      <span className="review-value">{values.website || 'N/A'}</span>
                    </div>
                    <button 
                      type="button" 
                      className="edit-section-button"
                      onClick={() => setCurrentStep(0)}
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>
                  </div>
                </div>

                <div className="review-section">
                  <h3>Contact Information</h3>
                  <div className="review-content">
                    <div className="review-item">
                      <span className="review-label">Name:</span>
                      <span className="review-value">{values.name}</span>
                    </div>
                    <div className="review-item">
                      <span className="review-label">Email:</span>
                      <span className="review-value">{values.email}</span>
                    </div>
                    <div className="review-item">
                      <span className="review-label">Phone:</span>
                      <span className="review-value">{values.phone}</span>
                    </div>
                    <button 
                      type="button" 
                      className="edit-section-button"
                      onClick={() => setCurrentStep(1)}
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>
                  </div>
                </div>

                <div className="review-section">
                  <h3>Address</h3>
                  <div className="review-content">
                    <div className="review-item">
                      <span className="review-label">Street:</span>
                      <span className="review-value">{values.address}</span>
                    </div>
                    <div className="review-item">
                      <span className="review-label">City:</span>
                      <span className="review-value">{values.city}</span>
                    </div>
                    <div className="review-item">
                      <span className="review-label">Postal Code:</span>
                      <span className="review-value">{values.postal_code}</span>
                    </div>
                    <button 
                      type="button" 
                      className="edit-section-button"
                      onClick={() => setCurrentStep(2)}
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>
                  </div>
                </div>

                {values.notes && (
                  <div className="review-section">
                    <h3>Notes</h3>
                    <div className="review-content">
                      <div className="review-notes">{values.notes}</div>
                      <button 
                        type="button" 
                        className="edit-section-button"
                        onClick={() => setCurrentStep(3)}
                      >
                        <i className="fas fa-edit"></i> Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              {currentStep > 0 && (
                <button
                  type="button"
                  className="back-button"
                  onClick={() => handleBack(values)}
                >
                  <i className="fas fa-arrow-left"></i> Back
                </button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  className="next-button"
                  onClick={() => handleNext(values, { setErrors: errors => errors, setTouched: touched => touched })}
                >
                  Next <i className="fas fa-arrow-right"></i>
                </button>
              ) : (
                <button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span> Creating Client...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle"></i> {buttonText}
                    </>
                  )}
                </button>
              )}
            </div>
          </Form>
        )}
      </Formik>
    );
  };

  if (loading && clients.length === 0) {
    return (
      <div className="manage-clients-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div>Loading clients...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-clients-container">
      <div className="clients-header">
        <h1>Manage Clients</h1>
        <button
          className="add-button"
          onClick={() => {
            setShowAddForm(true);
            setEditingClient(null);
            setSelectedClient(null);
          }}
        >
          <i className="fas fa-plus"></i> Add New Client
        </button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {(showAddForm || editingClient) && (
        <div className="form-section onboarding-wizard">
          <h2>{editingClient ? 'Edit Client' : 'Client Onboarding'}</h2>
          <ClientForm
            initialValues={
              editingClient
                ? {
                    name: editingClient.name || '',
                    email: editingClient.email || '',
                    phone: editingClient.phone || '',
                    company: editingClient.company || '',
                    address: editingClient.address || '',
                    city: editingClient.city || '',
                    postal_code: editingClient.postal_code || '',
                    notes: editingClient.notes || '',
                    company_size: '',
                    industry: '',
                    website: '',
                    logo_url: '',
                  }
                : emptyClient
            }
            onSubmit={editingClient ? handleUpdateClient : handleCreateClient}
            buttonText={editingClient ? 'Update Client' : 'Create Client'}
          />
        </div>
      )}

      {!showAddForm && !editingClient && (
        <>
          <div className="clients-toolbar">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  className="clear-search" 
                  onClick={() => setSearchTerm('')}
                >
                  ×
                </button>
              )}
            </div>
            <div className="view-toggle">
              <button 
                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <i className="fas fa-th"></i>
              </button>
              <button 
                className={`view-button ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <i className="fas fa-list"></i>
              </button>
            </div>
          </div>

          {filteredClients.length === 0 ? (
            <div className="no-clients">
              <div className="no-clients-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>No clients found</h3>
              <p>
                {searchTerm 
                  ? `No clients match your search for "${searchTerm}"`
                  : "You haven't added any clients yet. Add your first client to get started!"}
              </p>
              {searchTerm && (
                <button 
                  className="clear-search-button"
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="clients-grid">
              {filteredClients.map((client) => (
                <div 
                  key={client.id} 
                  className={`client-card ${selectedClient?.id === client.id ? 'selected' : ''}`}
                  onClick={() => setSelectedClient(selectedClient?.id === client.id ? null : client)}
                >
                  <div className="client-card-header">
                    <h3>{client.name}</h3>
                    {client.company && <div className="client-company">{client.company}</div>}
                  </div>
                  <div className="client-card-body">
                    {client.email && (
                      <div className="client-detail">
                        <i className="fas fa-envelope"></i>
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="client-detail">
                        <i className="fas fa-phone"></i>
                        <span>{client.phone}</span>
                      </div>
                    )}
                    <div className="client-detail">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{client.address}, {client.city}, {client.postal_code}</span>
                    </div>
                  </div>
                  <div className="client-card-actions">
                    <button
                      className="edit-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingClient(client);
                        setShowAddForm(false);
                      }}
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingClient(client);
                      }}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="clients-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.name}</td>
                      <td>{client.company || '-'}</td>
                      <td>
                        {client.email && <div>{client.email}</div>}
                        {client.phone && <div>{client.phone}</div>}
                      </td>
                      <td>
                        <div>{client.address}</div>
                        <div>{client.city}, {client.postal_code}</div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit-button"
                            onClick={() => {
                              setEditingClient(client);
                              setShowAddForm(false);
                            }}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => setDeletingClient(client)}
                          >
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Client Detail Sidebar */}
      {selectedClient && !showAddForm && !editingClient && (
        <div className="client-detail-sidebar">
          <div className="sidebar-header">
            <h2>Client Details</h2>
            <button 
              className="close-sidebar"
              onClick={() => setSelectedClient(null)}
            >
              ×
            </button>
          </div>
          <div className="client-detail-content">
            <div className="client-detail-section">
              <h3>Basic Information</h3>
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{selectedClient.name}</span>
              </div>
              {selectedClient.company && (
                <div className="detail-item">
                  <span className="detail-label">Company:</span>
                  <span className="detail-value">{selectedClient.company}</span>
                </div>
              )}
              {selectedClient.email && (
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">
                    <a href={`mailto:${selectedClient.email}`}>{selectedClient.email}</a>
                  </span>
                </div>
              )}
              {selectedClient.phone && (
                <div className="detail-item">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">
                    <a href={`tel:${selectedClient.phone}`}>{selectedClient.phone}</a>
                  </span>
                </div>
              )}
            </div>
            
            <div className="client-detail-section">
              <h3>Address</h3>
              <div className="detail-item">
                <span className="detail-label">Street:</span>
                <span className="detail-value">{selectedClient.address}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">City:</span>
                <span className="detail-value">{selectedClient.city}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Postal Code:</span>
                <span className="detail-value">{selectedClient.postal_code}</span>
              </div>
            </div>
            
            {selectedClient.notes && (
              <div className="client-detail-section">
                <h3>Notes</h3>
                <div className="detail-notes">{selectedClient.notes}</div>
              </div>
            )}
            
            <div className="sidebar-actions">
              <button
                className="edit-button full-width"
                onClick={() => {
                  setEditingClient(selectedClient);
                  setShowAddForm(false);
                }}
              >
                <i className="fas fa-edit"></i> Edit Client
              </button>
              <button
                className="delete-button full-width"
                onClick={() => setDeletingClient(selectedClient)}
              >
                <i className="fas fa-trash"></i> Delete Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingClient && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirm Deletion</h2>
            <p>
              Are you sure you want to delete client <strong>{deletingClient.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setDeletingClient(null)}
              >
                Cancel
              </button>
              <button
                className="delete-button"
                onClick={handleDeleteClient}
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageClients; 