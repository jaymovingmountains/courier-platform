import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import axios from 'axios';
import { AuthContext } from '../App';
import './JobDetails.css';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Import truck icon for vehicle section
const TruckIcon = () => (
  <svg className="w-6 h-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"></rect>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
    <circle cx="5.5" cy="18.5" r="2.5"></circle>
    <circle cx="18.5" cy="18.5" r="2.5"></circle>
  </svg>
);

const statusInfo = {
  approved: {
    label: 'Approved',
    description: 'Shipment approved, waiting for pickup',
    icon: '✅'
  },
  assigned: {
    label: 'Assigned',
    description: 'Driver assigned, waiting for pickup',
    icon: '👤'
  },
  picked_up: {
    label: 'Picked Up',
    description: 'Package picked up by driver',
    icon: '📦'
  },
  in_transit: {
    label: 'In Transit',
    description: 'Package in transit to destination',
    icon: '🚚'
  },
  delivered: {
    label: 'Delivered',
    description: 'Package delivered successfully',
    icon: '🏁'
  }
};

const statusOrder = ['approved', 'assigned', 'picked_up', 'in_transit', 'delivered'];

const JobDetails = ({ id: propId }) => {
  const { id: paramId } = useParams();
  const jobId = propId || paramId;
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [directions, setDirections] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [mapBounds, setMapBounds] = useState(null);
  const [vehicleInfo, setVehicleInfo] = useState(null);
  
  const navigate = useNavigate();
  const { activeJob } = useContext(AuthContext);

  const fetchJobDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Try fetching from /jobs first (for available jobs)
      try {
        const response = await axios.get(`http://localhost:3001/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        setJob(response.data);
        
        // If job has a vehicle_id, fetch vehicle details
        if (response.data.vehicle_id) {
          fetchVehicleInfo(response.data.vehicle_id, token);
        }
      } catch (err) {
        // If not found in /jobs, try /shipments (for assigned/completed jobs)
        const response = await axios.get(`http://localhost:3001/shipments/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        setJob(response.data);
        
        // If job has a vehicle_id, fetch vehicle details
        if (response.data.vehicle_id) {
          fetchVehicleInfo(response.data.vehicle_id, token);
        }
      }
      
      // Geocode addresses to get coordinates
      const pickup = await geocodeAddress(
        `${job.pickup_address}, ${job.pickup_city}`
      );
      const delivery = await geocodeAddress(
        `${job.delivery_address}, ${job.delivery_city}`
      );
      
      // Calculate map center and bounds
      const center = {
        lat: (pickup.lat + delivery.lat) / 2,
        lng: (pickup.lng + delivery.lng) / 2
      };
      setMapCenter(center);
      
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: pickup.lat, lng: pickup.lng });
      bounds.extend({ lat: delivery.lat, lng: delivery.lng });
      setMapBounds(bounds);
      
      // Get directions
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: `${job.pickup_address}, ${job.pickup_city}`,
          destination: `${job.delivery_address}, ${job.delivery_city}`,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          }
        }
      );
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch job details. Please try again.');
      console.error('Error fetching job details:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Fetch vehicle information
  const fetchVehicleInfo = async (vehicleId, token) => {
    try {
      // Note: Drivers can't access /vehicles endpoint directly, so we're using the vehicle info from the job
      // This is a workaround since the vehicle details should be included in the job response
      const response = await axios.get(`http://localhost:3001/shipments/${jobId}/vehicle`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      setVehicleInfo(response.data);
    } catch (err) {
      console.error('Error fetching vehicle info:', err);
      // If we can't fetch detailed vehicle info, we'll just use what's in the job
      setVehicleInfo({
        id: vehicleId,
        vehicle_name: job?.vehicle_name || 'Unknown Vehicle',
        license_plate: job?.license_plate || 'Unknown'
      });
    }
  };

  useEffect(() => {
    fetchJobDetails();
  }, [fetchJobDetails]);

  const geocodeAddress = async (address) => {
    return new Promise((resolve, reject) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK') {
          const { lat, lng } = results[0].geometry.location;
          resolve({ lat: lat(), lng: lng() });
        } else {
          reject(new Error('Geocoding failed'));
        }
      });
    });
  };

  const getStatusProgress = (status) => {
    const currentIndex = statusOrder.indexOf(status);
    return ((currentIndex + 1) * (100 / statusOrder.length));
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="job-details-container p-5">
        <div className="loading flex items-center justify-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-lg text-gray-600">Loading job details...</span>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="job-details-container p-5">
        <div className="error-message bg-red-100 text-red-700 p-4 rounded-lg mb-4">
          {error || 'Job not found'}
        </div>
        <button
          className="back-button bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="job-details-container p-5 max-w-6xl mx-auto">
      <div className="page-header flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Job #{job.id}</h1>
        <button
          className="back-button bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>

      <div className="job-info-card bg-white rounded-lg shadow-md p-6">
        <div className="info-section mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Job Details</h2>
          <div className="info-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="info-group">
              <label className="text-sm text-gray-600 mb-1">Type</label>
              <div className="font-medium text-gray-800">{job.shipment_type || 'Standard'}</div>
            </div>
            <div className="info-group">
              <label className="text-sm text-gray-600 mb-1">Status</label>
              <div className={`status-badge inline-block px-3 py-1 rounded-full text-sm font-medium ${job.status}`}>
                {job.status.replace('_', ' ')}
              </div>
            </div>
            <div className="info-group">
              <label className="text-sm text-gray-600 mb-1">Quote Amount</label>
              <div className="font-medium text-gray-800">${job.quote_amount || '0.00'}</div>
            </div>
            <div className="info-group">
              <label className="text-sm text-gray-600 mb-1">Created At</label>
              <div className="font-medium text-gray-800">{formatDateTime(job.created_at)}</div>
            </div>
          </div>
        </div>

        {/* Vehicle Information Section - Enhanced with Tailwind */}
        {job.vehicle_id && (
          <div className="info-section mb-8 bg-blue-50 rounded-lg p-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-blue-200 flex items-center">
              <TruckIcon />
              <span className="ml-2">Assigned Vehicle</span>
            </h2>
            <div className="vehicle-info flex flex-col md:flex-row md:items-center gap-4">
              <div className="vehicle-card bg-white p-4 rounded-lg shadow-sm flex-1 border border-blue-200">
                <div className="text-lg font-semibold text-blue-700">{vehicleInfo?.vehicle_name || 'Loading...'}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">License Plate:</span> {vehicleInfo?.license_plate || 'Loading...'}
                </div>
              </div>
              <div className="vehicle-info-text flex-1">
                <p className="text-gray-700">
                  This job has been assigned to the vehicle shown above. Make sure you're using the correct vehicle for this delivery.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="info-section mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Addresses</h2>
          <div className="addresses-grid grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="address-group bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Pickup Address</h3>
              <p className="text-gray-700">{job.pickup_address}</p>
              <p className="text-gray-600">{job.pickup_city}, {job.pickup_postal_code}</p>
            </div>
            <div className="address-group bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Delivery Address</h3>
              <p className="text-gray-700">{job.delivery_address}</p>
              <p className="text-gray-600">{job.delivery_city}, {job.delivery_postal_code}</p>
            </div>
          </div>
        </div>

        <div className="map-section mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Route Map</h2>
          <div className="map-container h-96 rounded-lg overflow-hidden shadow-md">
            <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
              <GoogleMap
                mapContainerClassName="map w-full h-full"
                center={mapCenter}
                zoom={12}
                onLoad={(map) => {
                  if (mapBounds) {
                    map.fitBounds(mapBounds);
                  }
                }}
              >
                {!directions && (
                  <>
                    <Marker
                      position={mapCenter}
                      label="P"
                      title="Pickup Location"
                    />
                    <Marker
                      position={mapCenter}
                      label="D"
                      title="Delivery Location"
                    />
                  </>
                )}
                {directions && (
                  <DirectionsRenderer
                    directions={directions}
                    options={{
                      polylineOptions: {
                        strokeColor: '#4285F4',
                        strokeWeight: 5,
                      },
                    }}
                  />
                )}
              </GoogleMap>
            </LoadScript>
          </div>
        </div>

        <div className="info-section mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Status Timeline</h2>
          <div className="tracking-timeline relative py-5 mt-5">
            <div 
              className="progress-bar absolute top-1/2 left-0 h-1 bg-green-500 transition-all duration-300"
              style={{ width: `${getStatusProgress(job.status)}%` }}
            />
            <div className="timeline-steps flex justify-between relative">
              {statusOrder.map((status) => (
                <div
                  key={status}
                  className={`timeline-step flex-1 text-center relative ${
                    statusOrder.indexOf(status) <= statusOrder.indexOf(job.status)
                      ? 'completed'
                      : ''
                  }`}
                >
                  <div className={`step-icon w-10 h-10 bg-white border-2 ${
                    statusOrder.indexOf(status) <= statusOrder.indexOf(job.status)
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 text-gray-500'
                    } rounded-full flex items-center justify-center mx-auto mb-2 relative z-10`}
                  >
                    {statusInfo[status].icon}
                  </div>
                  <div className="step-label font-medium text-gray-800 mb-1">{statusInfo[status].label}</div>
                  <div className="step-description text-xs text-gray-600 max-w-[150px] mx-auto">
                    {statusInfo[status].description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {job.id === activeJob && job.status !== 'delivered' && (
          <div className="action-section mt-8 text-center">
            <button
              className="update-status-button bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-sm"
              onClick={() => navigate(`/update-status/${job.id}`)}
            >
              Update Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetails; 