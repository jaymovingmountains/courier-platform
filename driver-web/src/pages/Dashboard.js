import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';
import { jwtDecode } from 'jwt-decode';
import { GoogleMap, LoadScript, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import './Dashboard.css';
import PropTypes from 'prop-types';

/**
 * Driver Dashboard Component
 * 
 * Features:
 * - Displays active jobs assigned to the driver
 * - Shows available jobs that can be accepted
 * - Displays completed job history
 * - Shows vehicle information for assigned jobs
 * - Interactive map with job locations
 * - Dark mode support
 * 
 * Recent Updates:
 * - Added vehicle information display for active and completed jobs
 * - Added dedicated vehicle information card for active jobs
 * - Improved navigation to job details and status update pages
 * - Enhanced job cards with vehicle details
 */

// Import icons
import { 
  IconTruck, IconPackage, IconMapPin, IconClock, IconCalendar, 
  IconChevronRight, IconCheck, IconX, IconRefresh, IconStar,
  IconMoon, IconSun, IconDashboard, IconHistory, IconWallet,
  IconArrowRight
} from './DashboardIcons';

// Helper functions
const getProgressPercentage = (status) => {
  const stages = ['approved', 'assigned', 'picked_up', 'in_transit', 'delivered'];
  const currentIndex = stages.indexOf(status);
  return ((currentIndex + 1) / stages.length) * 100;
};

const mockCoordinates = (job, index) => {
  const baseCoords = { 
    pickup: { lat: 37.7749 + (index * 0.01), lng: -122.4194 - (index * 0.01) },
    delivery: { lat: 37.7749 + (index * 0.02), lng: -122.4194 - (index * 0.02) }
  };
  
  return {
    ...job,
    pickup_lat: job.pickup_lat || baseCoords.pickup.lat,
    pickup_lng: job.pickup_lng || baseCoords.pickup.lng,
    delivery_lat: job.delivery_lat || baseCoords.delivery.lat,
    delivery_lng: job.delivery_lng || baseCoords.delivery.lng
  };
};

// Formatters
const formatters = {
  formatDistance: (distance) => distance || '12.5 mi',
  formatEarnings: (amount) => `$${amount.toFixed(2)}`,
  formatDate: (dateString) => dateString || 'Today, 2:30 PM',
};

// Extract reusable components
const LoadingScreen = () => (
  <div className="dashboard-container h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <div className="loading-screen text-center">
      <div className="loading-spinner size-16 border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
      <div className="loading-text text-xl font-medium text-gray-700 dark:text-gray-300">Loading your dashboard...</div>
    </div>
  </div>
);

const ErrorMessage = ({ error, onDismiss }) => (
  <div className="error-message mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
    <div className="flex items-center">
      <IconX className="error-icon size-5 text-red-500 dark:text-red-400 mr-2" />
      <span className="text-red-700 dark:text-red-400">{error}</span>
    </div>
    <button 
      className="dismiss-button p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800 text-red-500 dark:text-red-400"
      onClick={onDismiss}
    >
      <IconX className="size-4" />
    </button>
  </div>
);

// Extract more reusable components
const DashboardSidebar = React.memo(({ activeTab, setActiveTab, darkMode, toggleDarkMode, stats }) => (
  <aside className="dashboard-sidebar w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-sm">
    <div className="sidebar-header">
      <div className="logo">
        <IconTruck className="logo-icon" />
        <span>DeliverEase</span>
      </div>
      <button className="theme-toggle" onClick={toggleDarkMode}>
        {darkMode ? <IconSun /> : <IconMoon />}
      </button>
    </div>
    
    <nav className="sidebar-nav">
      <button 
        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
      >
        <IconDashboard />
        <span>Dashboard</span>
      </button>
      <button 
        className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => setActiveTab('history')}
      >
        <IconHistory />
        <span>History</span>
      </button>
      <button 
        className={`nav-item ${activeTab === 'earnings' ? 'active' : ''}`}
        onClick={() => setActiveTab('earnings')}
      >
        <IconWallet />
        <span>Earnings</span>
      </button>
    </nav>
    
    <div className="driver-stats">
      <div className="stat-card">
        <div className="stat-value">{stats.deliveries.total}</div>
        <div className="stat-label">Deliveries</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.rating}</div>
        <div className="stat-label">Rating</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.hoursActive}h</div>
        <div className="stat-label">Active</div>
      </div>
    </div>
  </aside>
));

const DashboardHeader = React.memo(({ activeTab, activeJobData, error, fetchJobs }) => (
  <header className="dashboard-header sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
    <h1>Driver Dashboard</h1>
    <div className="header-actions">
      <button className="refresh-button" onClick={fetchJobs}>
        <IconRefresh />
        <span>Refresh</span>
      </button>
    </div>
  </header>
));

const JobCard = React.memo(({ job, index, onAccept, acceptingJobId, formatDistance, formatDate, formatEarnings }) => (
  <div className="job-card">
    <div className="job-header">
      <div className="job-id">Job #{job.id}</div>
      <div className="job-type">{job.shipment_type || 'Standard'}</div>
    </div>
    
    <div className="job-route-compact">
      <div className="route-point pickup">
        <div className="point-label">From</div>
        <div className="point-address text-sm font-medium truncate">
          {job.pickup_address || '123 Pickup Street'}
        </div>
      </div>
      
      <IconArrowRight className="route-arrow" />
      
      <div className="route-point delivery">
        <div className="point-label">To</div>
        <div className="point-address text-sm font-medium truncate">
          {job.delivery_address || '456 Delivery Avenue'}
        </div>
      </div>
    </div>
    
    <div className="job-details">
      <div className="detail-item">
        <IconMapPin className="detail-icon" />
        <span>{formatDistance(job.distance || 3.5)}</span>
      </div>
      
      <div className="detail-item">
        <IconClock className="detail-icon" />
        <span>{formatDate(job.created_at || new Date())}</span>
      </div>
      
      <div className="detail-item">
        <IconPackage className="detail-icon" />
        <span>{job.size || 'Medium'}</span>
      </div>
      
      {job.vehicle_id && (
        <div className="detail-item">
          <IconTruck className="detail-icon" />
          <span>{job.vehicle_name || 'Vehicle'}</span>
        </div>
      )}
      
      <div className="detail-item earnings">
        <span className="earnings-value">{formatEarnings(job.earnings || 35)}</span>
      </div>
    </div>
    
    <button 
      className="accept-button"
      onClick={() => onAccept(job.id, index)}
      disabled={acceptingJobId === job.id}
    >
      {acceptingJobId === job.id ? (
        <>
          <div className="button-spinner"></div>
          <span>Accepting...</span>
        </>
      ) : (
        <>
          <IconCheck className="button-icon" />
          <span>Accept Job</span>
        </>
      )}
    </button>
  </div>
));

const ActiveJobCard = React.memo(({ job, onViewDetails, onUpdateStatus, getStatusBadge, formatDistance, formatDate, formatEarnings }) => (
  <div className="active-job-card">
    <div className="job-header">
      <div className="flex items-center gap-3">
        <div className="job-id">Job #{job.id}</div>
        <div className="progress-status">
          {getStatusBadge(job.status)}
        </div>
      </div>
      <div className="meta-item earnings">
        <span className="earnings-value">{formatEarnings(75)}</span>
      </div>
    </div>
    
    <div className="job-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${getProgressPercentage(job.status)}%` }}
        ></div>
      </div>
    </div>
    
    <div className="job-route-visual">
      <div className="route-point pickup">
        <div className="point-marker"></div>
        <div className="point-details">
          <div className="point-label">Pickup</div>
          <div className="point-address">{job.pickup_address || '123 Pickup Street'}</div>
          <div className="point-city">{job.pickup_city || 'San Francisco'}, {job.pickup_postal_code || '94107'}</div>
        </div>
      </div>
      
      <div className="route-line"></div>
      
      <div className="route-point delivery">
        <div className="point-marker"></div>
        <div className="point-details">
          <div className="point-label">Delivery</div>
          <div className="point-address">{job.delivery_address || '456 Delivery Avenue'}</div>
          <div className="point-city">{job.delivery_city || 'San Francisco'}, {job.delivery_postal_code || '94108'}</div>
        </div>
      </div>
    </div>
    
    <div className="job-meta">
      <div className="meta-item">
        <IconClock className="meta-icon" />
        <span>{formatDate(job.created_at || new Date())}</span>
      </div>
      
      <div className="meta-item">
        <IconMapPin className="meta-icon" />
        <span>{formatDistance(job.distance || 3.5)}</span>
      </div>
      
      <div className="meta-item">
        <IconPackage className="meta-icon" />
        <span>{job.shipment_type || 'Standard'}</span>
      </div>
      
      {job.vehicle_id && (
        <div className="meta-item">
          <IconTruck className="meta-icon" />
          <span>{job.vehicle_name || 'Van 1'} ({job.license_plate || 'ABC123'})</span>
        </div>
      )}
    </div>
    
    <div className="job-actions">
      <button 
        className="view-details-button"
        onClick={() => onViewDetails(job.id)}
      >
        <span>View Details</span>
        <IconChevronRight className="button-icon" />
      </button>
      
      <button 
        className="update-status-button"
        onClick={() => onUpdateStatus(job.id)}
      >
        <span>Update Status</span>
        <IconChevronRight className="button-icon" />
      </button>
    </div>
  </div>
));

const MapSection = React.memo(({ center, options, activeJobData, availableJobs, directions, onMarkerClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const onLoad = React.useCallback(() => {
    setIsLoaded(true);
  }, []);

  const onError = React.useCallback((error) => {
    setLoadError(error);
  }, []);

  if (loadError) {
    return (
      <div className="map-error">
        <p>Error loading Google Maps</p>
      </div>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
      onLoad={onLoad}
      onError={onError}
    >
      <GoogleMap
        mapContainerClassName="google-map h-full w-full"
        center={center}
        zoom={12}
        options={options}
      >
        {isLoaded && activeJobData && (
          <>
            <Marker
              position={{
                lat: parseFloat(mockCoordinates(activeJobData, 0).pickup_lat),
                lng: parseFloat(mockCoordinates(activeJobData, 0).pickup_lng)
              }}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                scaledSize: isLoaded ? new window.google.maps.Size(40, 40) : null
              }}
              title="Pickup Location"
            />
            <Marker
              position={{
                lat: parseFloat(mockCoordinates(activeJobData, 0).delivery_lat),
                lng: parseFloat(mockCoordinates(activeJobData, 0).delivery_lng)
              }}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: isLoaded ? new window.google.maps.Size(40, 40) : null
              }}
              title="Delivery Location"
            />
            {directions && <DirectionsRenderer directions={directions} />}
          </>
        )}
        
        {isLoaded && !activeJobData && availableJobs.map((job, index) => (
          <Marker
            key={job.id}
            position={{
              lat: parseFloat(mockCoordinates(job, index).pickup_lat),
              lng: parseFloat(mockCoordinates(job, index).pickup_lng)
            }}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: isLoaded ? new window.google.maps.Size(30, 30) : null
            }}
            title={`Job #${job.id}`}
            onClick={() => onMarkerClick(job.id)}
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
});

// Update useJobData hook
const useJobData = () => {
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const decoded = jwtDecode(token);
      
      const [availableResponse, assignedJobsResponse] = await Promise.all([
        axios.get('http://localhost:3001/jobs', {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: 'approved', assigned: 'false' }
        }),
        axios.get('http://localhost:3001/jobs', {
          headers: { Authorization: `Bearer ${token}` },
          params: { assigned: 'true' }
        })
      ]);
      
      // Also get shipments for backward compatibility
      const myShipmentsResponse = await axios.get('http://localhost:3001/shipments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Combine assigned jobs from both endpoints
      const myJobs = [...assignedJobsResponse.data];
      
      // Add any jobs from shipments that might not be in the jobs endpoint
      const shipmentsJobs = myShipmentsResponse.data.filter(job => job.driver_id === decoded.id);
      
      // Merge the two arrays, avoiding duplicates
      for (const job of shipmentsJobs) {
        if (!myJobs.some(existingJob => existingJob.id === job.id)) {
          myJobs.push(job);
        }
      }
      
      // Fetch vehicle information for active jobs
      const activeJobs = myJobs.filter(job => 
        ['assigned', 'picked_up', 'in_transit'].includes(job.status)
      );
      
      // Fetch vehicle details for each active job with a vehicle_id
      for (const job of activeJobs) {
        if (job.vehicle_id) {
          try {
            const vehicleResponse = await axios.get(`http://localhost:3001/shipments/${job.id}/vehicle`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            // Add vehicle details to the job
            job.vehicle_name = vehicleResponse.data.vehicle_name;
            job.license_plate = vehicleResponse.data.license_plate;
          } catch (err) {
            console.error(`Error fetching vehicle info for job ${job.id}:`, err);
            // Continue without vehicle details
          }
        }
      }
      
      // Also fetch vehicle details for completed jobs
      const completedJobs = myJobs.filter(job => job.status === 'delivered');
      for (const job of completedJobs) {
        if (job.vehicle_id) {
          try {
            const vehicleResponse = await axios.get(`http://localhost:3001/shipments/${job.id}/vehicle`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            // Add vehicle details to the job
            job.vehicle_name = vehicleResponse.data.vehicle_name;
            job.license_plate = vehicleResponse.data.license_plate;
          } catch (err) {
            console.error(`Error fetching vehicle info for completed job ${job.id}:`, err);
            // Continue without vehicle details
          }
        }
      }
      
      setAvailableJobs(availableResponse.data);
      setMyJobs(myJobs);
      setError(null);
      
      return { myJobs, availableJobs: availableResponse.data };
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to fetch jobs. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { availableJobs, myJobs, loading, error, setError, fetchJobs };
};

// Update useMapData hook
const useMapData = (myJobs, availableJobs) => {
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [directions, setDirections] = useState(null);

  const calculateRoute = useCallback((job) => {
    if (!job.pickup_lat || !job.pickup_lng || !job.delivery_lat || !job.delivery_lng || !window.google) {
      return;
    }
    
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin: { lat: parseFloat(job.pickup_lat), lng: parseFloat(job.pickup_lng) },
        destination: { lat: parseFloat(job.delivery_lat), lng: parseFloat(job.delivery_lng) },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
        } else {
          console.error(`Directions request failed: ${status}`);
        }
      }
    );
  }, []);

  const updateMapCenter = useCallback((activeJobData, availableJobs) => {
    if (activeJobData?.pickup_lat && activeJobData?.pickup_lng) {
      setMapCenter({ 
        lat: parseFloat(activeJobData.pickup_lat), 
        lng: parseFloat(activeJobData.pickup_lng) 
      });
    } else if (availableJobs.length > 0) {
      const firstJob = availableJobs[0];
      if (firstJob.pickup_lat && firstJob.pickup_lng) {
        setMapCenter({ 
          lat: parseFloat(firstJob.pickup_lat), 
          lng: parseFloat(firstJob.pickup_lng) 
        });
      }
    }
  }, []);

  useEffect(() => {
    const activeJobData = myJobs.find(job => job.status !== 'delivered');
    updateMapCenter(activeJobData, availableJobs);
  }, [myJobs, availableJobs, updateMapCenter]);

  return { mapCenter, directions, calculateRoute };
};

const Dashboard = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [acceptingJobId, setAcceptingJobId] = useState(null);
  const [earnings] = useState({ today: 120, week: 840, month: 3250 });
  const [stats] = useState({ 
    deliveries: { total: 128, onTime: 124 },
    rating: 4.9,
    hoursActive: 32
  });
  
  const navigate = useNavigate();
  const { activeJob, setActiveJob } = useContext(AuthContext);
  
  // Use custom hooks
  const { 
    availableJobs, 
    myJobs, 
    loading, 
    error, 
    setError, 
    fetchJobs 
  } = useJobData();
  
  const {
    mapCenter,
    directions,
    calculateRoute
  } = useMapData(myJobs, availableJobs);
  
  // Memoize formatters - moved outside of conditional
  const memoizedFormatters = useMemo(() => ({
    formatDistance: (distance) => distance || '12.5 mi',
    formatEarnings: (amount) => `$${amount.toFixed(2)}`,
    formatDate: (dateString) => dateString || 'Today, 2:30 PM',
  }), []);

  // Memoize map click handler - moved outside of conditional
  const handleMarkerClick = useCallback((jobId) => {
    const element = document.getElementById(`job-${jobId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => element.classList.remove('highlight'), 2000);
    }
  }, []);
  
  // Memoize expensive computations
  const activeJobData = useMemo(() => 
    myJobs.find(job => activeJob && job.id === activeJob && 
      (job.status === 'assigned' || job.status === 'picked_up' || job.status === 'in_transit')),
    [myJobs, activeJob]
  );

  const completedJobs = useMemo(() => 
    myJobs.filter(job => job.status === 'delivered'),
    [myJobs]
  );

  // Memoize callback functions
  const handleAcceptJob = useCallback(async (jobId) => {
    try {
      setAcceptingJobId(jobId);
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `http://localhost:3001/jobs/${jobId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );
      
      if (response.data) {
        setActiveJob(jobId);
        await fetchJobs();
        navigate(`/job/${jobId}`);
      }
    } catch (err) {
      console.error('Error accepting job:', err);
      setError(err.response?.data?.error || 'Failed to accept job. Please try again.');
    } finally {
      setAcceptingJobId(null);
    }
  }, [navigate, setActiveJob, fetchJobs, setError]);

  // Add a function to handle viewing job details
  const handleViewJobDetails = useCallback((jobId) => {
    navigate(`/job/${jobId}`);
  }, [navigate]);

  // Add a function to handle updating job status
  const handleUpdateJobStatus = useCallback((jobId) => {
    navigate(`/update-status/${jobId}`);
  }, [navigate]);

  const toggleDarkMode = useCallback(() => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    document.body.classList.toggle('dark-mode', newMode);
  }, [darkMode]);

  // Use effect with proper cleanup
  useEffect(() => {
    fetchJobs();
    
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      setDarkMode(savedMode === 'true');
      document.body.classList.toggle('dark-mode', savedMode === 'true');
    }
    
    const refreshInterval = setInterval(fetchJobs, 60000);
    
    return () => {
      clearInterval(refreshInterval);
      document.body.classList.remove('dark-mode');
    };
  }, [fetchJobs]);

  // Memoize map options
  const mapOptions = useMemo(() => ({
    styles: darkMode ? [
      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    ] : [],
    disableDefaultUI: true,
    zoomControl: true,
  }), [darkMode]);

  useEffect(() => {
    if (activeJob) {
      const activeJobData = myJobs.find(job => job.id === activeJob);
      if (activeJobData) {
        calculateRoute(activeJobData);
      }
    }
  }, [activeJob, myJobs, calculateRoute]);
  
  const getStatusBadge = (status) => {
    const statusIcons = {
      'approved': <IconCheck className="status-icon" />,
      'assigned': <IconTruck className="status-icon" />,
      'picked_up': <IconPackage className="status-icon" />,
      'in_transit': <IconTruck className="status-icon moving" />,
      'delivered': <IconCheck className="status-icon" />
    };
    
    return (
      <span className={`status-badge ${status}`}>
        {statusIcons[status] || null}
        <span className="status-text">{status.replace('_', ' ')}</span>
      </span>
    );
  };
  
  // Early return for loading state
  if (loading && myJobs.length === 0 && availableJobs.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className={`dashboard-container ${darkMode ? 'dark' : ''} h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200`}>
      <DashboardSidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        stats={stats}
      />
      
      <main className="dashboard-main flex-1 overflow-auto">
        <DashboardHeader 
          activeTab={activeTab}
          activeJobData={activeJobData}
          error={error}
          fetchJobs={fetchJobs}
        />
        
        {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-content p-6">
            <div className="dashboard-grid grid grid-cols-12 gap-6">
              {/* Active Job Section - Move above map for better visual hierarchy */}
      {activeJobData ? (
                <div className="active-job-section col-span-12">
                  <div className="section-header">
                    <h2>Active Job</h2>
            </div>
                  <ActiveJobCard
                    job={activeJobData}
                    onViewDetails={handleViewJobDetails}
                    onUpdateStatus={handleUpdateJobStatus}
                    getStatusBadge={getStatusBadge}
                    {...memoizedFormatters}
                  />
                  
                  {/* Vehicle Information Card */}
                  {activeJobData.vehicle_id && (
                    <div className="vehicle-info-card mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="card-header bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Assigned Vehicle</h3>
                      </div>
                      <div className="card-body p-4">
                        <div className="flex items-center">
                          <IconTruck className="text-primary w-10 h-10 mr-4 text-blue-500 dark:text-blue-400" />
                          <div>
                            <div className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                              {activeJobData.vehicle_name || 'Vehicle'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              License Plate: <span className="font-medium">{activeJobData.license_plate || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="active-job-section empty col-span-12">
                  <div className="section-header">
                    <h2>No Active Job</h2>
                  </div>
                  <div className="empty-state">
                    <IconTruck className="empty-icon" />
                    <p>You don't have any active jobs. Accept a job from the available jobs below.</p>
                  </div>
              </div>
              )}
              
              <div className="map-section col-span-8">
                <MapSection
                  center={mapCenter}
                  options={mapOptions}
                  activeJobData={activeJobData}
                  availableJobs={availableJobs}
                  directions={directions}
                  onMarkerClick={handleMarkerClick}
                />
              </div>
              
              <div className="earnings-summary col-span-4">
                <div className="section-header">
                  <h2>Earnings</h2>
                </div>
                <div className="earnings-cards">
                  <div className="earnings-card">
                    <div className="earnings-label">Today</div>
                    <div className="earnings-value">{memoizedFormatters.formatEarnings(earnings.today)}</div>
                  </div>
                  <div className="earnings-card">
                    <div className="earnings-label">This Week</div>
                    <div className="earnings-value">{memoizedFormatters.formatEarnings(earnings.week)}</div>
                  </div>
                  <div className="earnings-card">
                    <div className="earnings-label">This Month</div>
                    <div className="earnings-value">{memoizedFormatters.formatEarnings(earnings.month)}</div>
            </div>
          </div>
        </div>
      
      {/* Available Jobs Section */}
              <div className="available-jobs-section col-span-12">
                <div className="section-header">
        <h2>Available Jobs</h2>
                  <span className="job-count">{availableJobs.length} jobs</span>
                </div>
        
        {availableJobs.length === 0 ? (
                  <div className="empty-state">
                    <IconPackage className="empty-icon" />
            <p>No available jobs at the moment. Check back later!</p>
          </div>
        ) : (
          <div className="jobs-grid">
                    {availableJobs.map((job, index) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        index={index}
                        onAccept={handleAcceptJob}
                        acceptingJobId={acceptingJobId}
                        {...memoizedFormatters}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="history-content">
            <div className="section-header">
              <h2>Completed Jobs</h2>
              <span className="job-count">{completedJobs.length} jobs</span>
            </div>
            
            {completedJobs.length === 0 ? (
              <div className="empty-state">
                <IconHistory className="empty-icon" />
                <p>You haven't completed any jobs yet.</p>
              </div>
            ) : (
              <div className="completed-jobs-list">
                {completedJobs.map(job => (
                  <div key={job.id} className="completed-job-card">
                <div className="job-header">
                      <div className="job-id">#{job.id}</div>
                      {getStatusBadge(job.status)}
                    </div>
                    
                    <div className="job-route-visual compact">
                      <div className="route-point pickup">
                        <div className="point-marker"></div>
                        <div className="point-details">
                          <div className="point-address">{job.pickup_address}</div>
                          <div className="point-city">{job.pickup_city}</div>
                        </div>
                </div>
                
                      <div className="route-line"></div>
                      
                      <div className="route-point delivery">
                        <div className="point-marker"></div>
                        <div className="point-details">
                          <div className="point-address">{job.delivery_address}</div>
                          <div className="point-city">{job.delivery_city}</div>
                        </div>
                      </div>
                  </div>
                  
                    <div className="job-meta">
                      <div className="meta-item">
                        <IconCalendar className="meta-icon" />
                        <span>{memoizedFormatters.formatDate(job.completed_at || '2023-05-15')}</span>
                      </div>
                      {job.vehicle_id && (
                        <div className="meta-item">
                          <IconTruck className="meta-icon" />
                          <span>{job.vehicle_name || 'Unknown'} ({job.license_plate || 'N/A'})</span>
                        </div>
                      )}
                      <div className="meta-item earnings">
                        <span className="earnings-value">{memoizedFormatters.formatEarnings(85)}</span>
                  </div>
                </div>
                
                <button
                      className="view-button"
                      onClick={() => handleViewJobDetails(job.id)}
                >
                      View Details
                </button>
              </div>
            ))}
          </div>
        )}
          </div>
        )}
        
        {activeTab === 'earnings' && (
          <div className="earnings-content">
            <div className="section-header">
              <h2>Earnings Overview</h2>
            </div>
            
            <div className="earnings-overview">
              <div className="earnings-summary-large">
                <div className="earnings-period-tabs">
                  <button className="period-tab active">Daily</button>
                  <button className="period-tab">Weekly</button>
                  <button className="period-tab">Monthly</button>
      </div>
      
                <div className="earnings-chart">
                  {/* Placeholder for earnings chart */}
                  <div className="chart-placeholder">
                    <div className="chart-bar" style={{ height: '60%' }}></div>
                    <div className="chart-bar" style={{ height: '80%' }}></div>
                    <div className="chart-bar" style={{ height: '40%' }}></div>
                    <div className="chart-bar" style={{ height: '90%' }}></div>
                    <div className="chart-bar" style={{ height: '70%' }}></div>
                    <div className="chart-bar" style={{ height: '50%' }}></div>
                    <div className="chart-bar active" style={{ height: '75%' }}></div>
                  </div>
                </div>
                
                <div className="earnings-stats">
                  <div className="stat-card large">
                    <div className="stat-label">Total Earnings</div>
                    <div className="stat-value">{memoizedFormatters.formatEarnings(earnings.month)}</div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-label">Avg. Per Job</div>
                    <div className="stat-value">{memoizedFormatters.formatEarnings(earnings.month / stats.deliveries.total)}</div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-label">Completed</div>
                    <div className="stat-value">{stats.deliveries.total}</div>
                  </div>
                </div>
              </div>
              
              <div className="recent-payments">
                <div className="subsection-header">
                  <h3>Recent Payments</h3>
                </div>
                
                <div className="payments-list">
                  <div className="payment-item">
                    <div className="payment-date">May 15, 2023</div>
                    <div className="payment-amount">{memoizedFormatters.formatEarnings(125.50)}</div>
                  </div>
                  <div className="payment-item">
                    <div className="payment-date">May 14, 2023</div>
                    <div className="payment-amount">{memoizedFormatters.formatEarnings(98.75)}</div>
                  </div>
                  <div className="payment-item">
                    <div className="payment-date">May 13, 2023</div>
                    <div className="payment-amount">{memoizedFormatters.formatEarnings(112.30)}</div>
                  </div>
                  <div className="payment-item">
                    <div className="payment-date">May 12, 2023</div>
                    <div className="payment-amount">{memoizedFormatters.formatEarnings(87.45)}</div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}
      </main>
    </div>
  );
};

// Add prop types for better type checking
DashboardSidebar.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired,
  stats: PropTypes.object.isRequired,
};

JobCard.propTypes = {
  job: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onAccept: PropTypes.func.isRequired,
  acceptingJobId: PropTypes.number,
  formatDistance: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  formatEarnings: PropTypes.func.isRequired,
};

ActiveJobCard.propTypes = {
  job: PropTypes.object.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onUpdateStatus: PropTypes.func.isRequired,
  getStatusBadge: PropTypes.func.isRequired,
  formatDistance: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  formatEarnings: PropTypes.func.isRequired,
};

MapSection.propTypes = {
  center: PropTypes.object.isRequired,
  options: PropTypes.object.isRequired,
  activeJobData: PropTypes.object,
  availableJobs: PropTypes.array.isRequired,
  directions: PropTypes.object,
  onMarkerClick: PropTypes.func.isRequired,
};

DashboardHeader.propTypes = {
  activeTab: PropTypes.string.isRequired,
  activeJobData: PropTypes.object,
  error: PropTypes.string,
  fetchJobs: PropTypes.func.isRequired,
};

export default React.memo(Dashboard); 