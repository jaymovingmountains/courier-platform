import React, { useEffect, useRef, useState } from 'react';
import { GeocoderAutocomplete } from '@geoapify/geocoder-autocomplete';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';
import './ShipmentForm.css';

const ShipmentForm = () => {
  const autocompleteRef = useRef(null);
  const [formData, setFormData] = useState({
    address: '',
    street: '',
    houseNumber: '',
    city: '',
    postalCode: '',
    province: '',
    country: 'Canada',
    formatted: ''
  });
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  // Validate address data
  const validateAddress = () => {
    const errors = {};
    
    if (!formData.address) errors.address = 'Street address is required';
    if (!formData.city) errors.city = 'City is required';
    if (!formData.postalCode) errors.postalCode = 'Postal code is required';
    if (!formData.province) errors.province = 'Province is required';
    
    return errors;
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form data
    const errors = validateAddress();
    
    if (Object.keys(errors).length === 0) {
      // Form is valid, proceed with submission
      console.log('Form submitted with data:', formData);
      // Here you would typically send the data to your API
      alert('Form submitted successfully!');
    } else {
      // Form has errors
      console.error('Form validation errors:', errors);
      // Display error message to user
      alert('Please fill in all required fields');
    }
  };
  
  useEffect(() => {
    // Get the DOM element with ID 'autocomplete'
    const autocompleteContainer = document.getElementById('autocomplete');
    
    if (!autocompleteContainer) return;
    
    // Get API key from environment variables
    const GEOAPIFY_API_KEY = process.env.REACT_APP_GEOAPIFY_API_KEY;
    
    // Initialize the Geoapify Geocoder Autocomplete
    const autocomplete = new GeocoderAutocomplete(
      autocompleteContainer,
      GEOAPIFY_API_KEY,
      {
        language: 'en',
        type: 'street',
        placeholder: 'Enter address',
        limit: 5
      }
    );
    
    // Store the autocomplete instance in the ref
    autocompleteRef.current = autocomplete;
    
    // Handle selection event
    autocomplete.on('select', (location) => {
      if (location) {
        console.log('Selected location:', location);
        
        // Extract address details from the selected location
        const properties = location.properties;
        
        // Extract street address components
        const street = properties.street || '';
        const houseNumber = properties.housenumber || '';
        const streetAddress = houseNumber ? `${houseNumber} ${street}` : properties.street || '';
        
        // Update form data with the selected address details
        setFormData({
          address: streetAddress || properties.formatted,
          street: street,
          houseNumber: houseNumber,
          city: properties.city || '',
          postalCode: properties.postcode || '',
          province: properties.state_code || '',
          country: properties.country || 'Canada',
          formatted: properties.formatted || ''
        });
        
        // Log the extracted data for debugging
        console.log('Extracted address data:', {
          street: streetAddress,
          city: properties.city,
          postalCode: properties.postcode,
          province: properties.state_code,
          formatted: properties.formatted
        });
      }
    });
    
    // Handle error event
    autocomplete.on('error', (error) => {
      console.error('Geoapify Geocoder Error:', error);
    });
    
    // Cleanup function to run when component unmounts
    return () => {
      if (autocompleteRef.current) {
        // Clean up event listeners
        const parent = autocompleteContainer.parentNode;
        if (parent) {
          const clone = autocompleteContainer.cloneNode(true);
          parent.replaceChild(clone, autocompleteContainer);
        }
        
        // Clear the reference
        autocompleteRef.current = null;
      }
    };
  }, []); // Empty dependency array means this effect runs once after initial render
  
  return (
    <div className="shipment-form">
      <h2>Shipment Address</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="autocomplete">Find Address</label>
          <div id="autocomplete" className="geoapify-autocomplete-container"></div>
          {formData.formatted && (
            <div className="selected-address">
              <p><strong>Selected Address:</strong> {formData.formatted}</p>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="address">Street Address</label>
          <input 
            type="text" 
            id="address" 
            name="address" 
            className="form-control"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street address"
          />
        </div>
        
        <div className="address-row">
          <div className="form-group">
            <label htmlFor="houseNumber">House/Building Number</label>
            <input 
              type="text" 
              id="houseNumber" 
              name="houseNumber" 
              className="form-control"
              value={formData.houseNumber}
              onChange={handleChange}
              placeholder="House number"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="street">Street</label>
            <input 
              type="text" 
              id="street" 
              name="street" 
              className="form-control"
              value={formData.street}
              onChange={handleChange}
              placeholder="Street name"
            />
          </div>
        </div>
        
        <div className="address-row">
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input 
              type="text" 
              id="city" 
              name="city" 
              className="form-control"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="postalCode">Postal Code</label>
            <input 
              type="text" 
              id="postalCode" 
              name="postalCode" 
              className="form-control"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="Postal code"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="province">Province</label>
          <select 
            id="province" 
            name="province" 
            className="form-control"
            value={formData.province}
            onChange={handleChange}
          >
            <option value="">Select Province</option>
            <option value="AB">Alberta</option>
            <option value="BC">British Columbia</option>
            <option value="MB">Manitoba</option>
            <option value="NB">New Brunswick</option>
            <option value="NL">Newfoundland and Labrador</option>
            <option value="NS">Nova Scotia</option>
            <option value="ON">Ontario</option>
            <option value="PE">Prince Edward Island</option>
            <option value="QC">Quebec</option>
            <option value="SK">Saskatchewan</option>
            <option value="NT">Northwest Territories</option>
            <option value="NU">Nunavut</option>
            <option value="YT">Yukon</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="country">Country</label>
          <input 
            type="text" 
            id="country" 
            name="country" 
            className="form-control"
            value={formData.country}
            onChange={handleChange}
            placeholder="Country"
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Submit Address</button>
          <button type="button" className="btn btn-secondary" onClick={() => setFormData({
            address: '',
            street: '',
            houseNumber: '',
            city: '',
            postalCode: '',
            province: '',
            country: 'Canada',
            formatted: ''
          })}>
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShipmentForm; 