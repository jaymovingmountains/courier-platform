import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaFileInvoiceDollar, FaDownload, FaSpinner, FaCheck, FaTimesCircle } from 'react-icons/fa';
import './Invoices.css';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [invoiceDetails, setInvoiceDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }
      
      const response = await axios.get('http://localhost:3001/api/invoices', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Fetch details for each invoice
      const invoices = response.data;
      const detailsPromises = invoices.map(async (invoice) => {
        try {
          const detailsResponse = await axios.get(`http://localhost:3001/api/shipments/${invoice.shipmentId}/invoice-details`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          return detailsResponse.data;
        } catch (err) {
          console.error(`Error fetching details for invoice #${invoice.shipmentId}:`, err);
          return null;
        }
      });
      
      const invoiceDetailsList = await Promise.all(detailsPromises);
      
      // Create a map of shipmentId -> details
      const detailsMap = {};
      invoiceDetailsList.forEach(details => {
        if (details) {
          detailsMap[details.shipment_id] = details;
        }
      });
      
      setInvoiceDetails(detailsMap);
      setInvoices(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="invoices-container">
        <div className="loading-spinner">
          <FaSpinner className="spinner-icon" />
          <p>Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invoices-container">
        <div className="error-message">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="invoices-container">
      <div className="invoices-header">
        <h1>
          <FaFileInvoiceDollar className="header-icon" />
          Invoices
        </h1>
        <p className="subtitle">View and download your shipment invoices</p>
      </div>

      {invoices.length === 0 ? (
        <div className="no-invoices">
          <p>No invoices available</p>
          <p className="no-invoices-subtext">
            Invoices are generated automatically when your shipments are picked up by a driver.
          </p>
        </div>
      ) : (
        <div className="invoices-table-container">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Shipment ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => {
                const details = invoiceDetails[invoice.shipmentId] || {};
                return (
                  <tr key={invoice.shipmentId}>
                    <td>#{invoice.shipmentId}</td>
                    <td>{formatDate(invoice.date)}</td>
                    <td className="amount-column">
                      ${details.base_amount ? details.base_amount.toFixed(2) : 'N/A'}
                      {details.tax_amount > 0 && (
                        <span className="tax-note">
                          +${details.tax_amount.toFixed(2)} tax
                        </span>
                      )}
                    </td>
                    <td className="status-column">
                      {details.payment_status ? (
                        <span className={`status-badge ${details.payment_status}`}>
                          {details.payment_status === 'paid' ? (
                            <><FaCheck /> Paid</>
                          ) : (
                            <><FaTimesCircle /> Unpaid</>
                          )}
                        </span>
                      ) : (
                        'Unknown'
                      )}
                    </td>
                    <td>
                      <a 
                        href={`http://localhost:3001${invoice.invoiceUrl}`} 
                        className="download-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FaDownload className="download-icon" />
                        Download
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Invoices; 