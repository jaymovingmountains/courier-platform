import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { API_URL } from '../utils/api';
import './ProvideQuotes.css';
import ShipmentModal from '../components/ShipmentModal';
import { useParams } from 'react-router-dom';

const quoteSchema = Yup.object().shape({
  quote_amount: Yup.number()
    .required('Quote amount is required')
    .positive('Quote amount must be positive')
    .min(1, 'Quote amount must be at least $1')
});

const ProvideQuotes = () => {
  const { id } = useParams();
  const [shipments, setShipments] = useState([]);
  const [users, setUsers] = useState([]);
  const [quoteHistory, setQuoteHistory] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchQuoteHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/shipments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          status: 'quoted'
        }
      });
      setQuoteHistory(response.data);
    } catch (err) {
      console.error('Error fetching quote history:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = {
          Authorization: `Bearer ${token}`,
        };
        
        // Fetch pending shipments (for quotes) and recently quoted ones (for history)
        const [pendingRes, quotedRes, usersRes] = await Promise.all([
          axios.get(`${API_URL}/shipments?status=pending`, { headers }),
          axios.get(`${API_URL}/shipments?status=quoted`, { headers }),
          axios.get(`${API_URL}/users`, { headers })
        ]);
        
        setShipments(pendingRes.data);
        setQuoteHistory(quotedRes.data);
        setUsers(usersRes.data);
        
        setError(null);
      } catch (err) {
        setError('Failed to fetch shipments. Please try again.');
        console.error('Error fetching shipments:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const handleSubmitQuote = async (values, { setSubmitting, resetForm }, shipmentId) => {
    try {
      setProcessingId(shipmentId);
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/shipments/${shipmentId}/quote`,
        { quote_amount: parseFloat(values.quote_amount) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Remove the quoted shipment from the list
      setShipments(prevShipments => prevShipments.filter(s => s.id !== shipmentId));
      
      // Add success message
      setSuccessMessage(`Quote of $${values.quote_amount} successfully submitted for shipment #${shipmentId}`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      // Refresh quote history
      fetchQuoteHistory();
      
      resetForm();
      setError(null);
    } catch (err) {
      setError('Failed to submit quote. Please try again.');
      console.error('Error submitting quote:', err);
    } finally {
      setProcessingId(null);
      setSubmitting(false);
    }
  };

  const calculateEstimatedCost = (shipment) => {
    if (!shipment || !shipment.shipment_type) {
      return 10; // Default base rate if shipment or type is missing
    }
    
    // Simple cost estimation based on shipment type
    const baseRate = {
      'standard': 10,
      'express': 20,
      'priority': 30
    }[shipment.shipment_type] || 10;
    
    // Add distance factor (simplified)
    return baseRate;
  };

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
        `${API_URL}/shipments/${shipmentId}/label`,
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

  if (loading) {
    return (
      <div className="provide-quotes-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="provide-quotes-container">
      <div className="page-header">
        <h1>Provide Quotes</h1>
        <p className="page-description">
          Review pending shipments and provide quotes for customers
        </p>
      </div>

      {error && (
        <div className="error-message">
          <i className="error-icon">⚠️</i> {error}
        </div>
      )}
      
      {successMessage && (
        <div className="success-message">
          <i className="success-icon">✓</i> {successMessage}
        </div>
      )}

      {shipments.length === 0 ? (
        <div className="no-shipments">
          <div className="empty-state-icon">📦</div>
          <h3>No Pending Shipments</h3>
          <p>There are no shipments waiting for quotes at this time.</p>
        </div>
      ) : (
        <>
          <div className="section-header">
            <h2>Pending Shipments ({shipments.length})</h2>
          </div>
          
          <div className="shipments-grid">
            {shipments.map((shipment) => {
              const estimatedCost = calculateEstimatedCost(shipment);
              
              return (
                <div className="shipment-card" key={shipment.id}>
                  <div className="shipment-header">
                    <span className="shipment-id">Shipment #{shipment.id}</span>
                    <span className={`shipment-type ${shipment.shipment_type}`}>
                      {shipment.shipment_type}
                    </span>
                  </div>
                  
                  <div className="shipment-body">
                    <div className="shipper-details">
                      <span className="detail-label">Shipper:</span>
                      <span className="detail-value">
                        {(() => {
                          const shipper = users.find(u => u.id === shipment.shipper_id);
                          return shipper 
                            ? shipper.name || shipper.username 
                            : `Shipper #${shipment.shipper_id}`;
                        })()}
                      </span>
                    </div>
                    
                    <div className="location-details">
                      <div className="pickup-address">
                        <span className="detail-label">Pickup:</span>
                        <span className="detail-value">{shipment.pickup_city}, {shipment.pickup_postal_code}</span>
                      </div>
                      <div className="delivery-address">
                        <span className="detail-label">Delivery:</span>
                        <span className="detail-value">{shipment.delivery_city}, {shipment.delivery_postal_code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="package-details">
                    <div className="detail-item">
                      <span className="detail-label">Weight:</span>
                      <span className="detail-value">{shipment.weight || 'N/A'} kg</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Dimensions:</span>
                      <span className="detail-value">
                        {shipment.length && shipment.width && shipment.height ? 
                          `${shipment.length}×${shipment.width}×${shipment.height} in` : 
                          'N/A'}
                      </span>
                    </div>
                  </div>

                  <Formik
                    initialValues={{ quote_amount: estimatedCost ? estimatedCost.toFixed(2) : '0.00' }}
                    validationSchema={quoteSchema}
                    onSubmit={(values, formikBag) => 
                      handleSubmitQuote(values, formikBag, shipment.id)
                    }
                  >
                    {({ errors, touched, isSubmitting, values }) => (
                      <Form className="quote-form">
                        <div className="quote-header">
                          <h3>Provide Quote</h3>
                          <div className="estimated-cost">
                            Suggested: ${estimatedCost ? estimatedCost.toFixed(2) : '0.00'}
                          </div>
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor={`quote_amount_${shipment.id}`}>
                            Quote Amount ($)
                          </label>
                          <div className="input-group">
                            <span className="currency-symbol">$</span>
                            <Field
                              type="number"
                              id={`quote_amount_${shipment.id}`}
                              name="quote_amount"
                              className={`form-control ${
                                errors.quote_amount && touched.quote_amount ? 'is-invalid' : ''
                              }`}
                              placeholder="Enter amount"
                              step="0.01"
                              min="0"
                            />
                          </div>
                          {errors.quote_amount && touched.quote_amount && (
                            <div className="error-message">{errors.quote_amount}</div>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="submit-button"
                          disabled={isSubmitting || processingId === shipment.id}
                        >
                          {processingId === shipment.id ? 
                            <><span className="spinner-small"></span> Submitting...</> : 
                            `Submit Quote ($${values.quote_amount ? parseFloat(values.quote_amount).toFixed(2) : '0.00'})`}
                        </button>
                      </Form>
                    )}
                  </Formik>
                </div>
              );
            })}
          </div>
        </>
      )}
      
      {quoteHistory.length > 0 && (
        <div className="quote-history-section">
          <div className="section-header">
            <h2>Recently Quoted ({quoteHistory.length})</h2>
          </div>
          
          <div className="quote-history-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Quote Amount</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quoteHistory.slice(0, 5).map(quote => (
                  <tr key={quote.id}>
                    <td>#{quote.id}</td>
                    <td className={`shipment-type-cell ${quote.shipment_type}`}>
                      {quote.shipment_type}
                    </td>
                    <td>{quote.pickup_city}</td>
                    <td>{quote.delivery_city}</td>
                    <td className="quote-amount">${quote.quote_amount ? quote.quote_amount.toFixed(2) : '0.00'}</td>
                    <td>{new Date(quote.created_at).toLocaleDateString()}</td>
                    <td>
                      <button 
                        className="view-button"
                        onClick={() => openShipmentModal(quote)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shipment Modal */}
      {isModalOpen && (
        <ShipmentModal
          shipment={selectedShipment}
          onClose={closeModal}
          onPrintLabel={handlePrintLabel}
          users={users}
        />
      )}
    </div>
  );
};

export default ProvideQuotes; 