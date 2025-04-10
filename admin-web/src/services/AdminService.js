/**
 * AdminService - Handles admin-specific API operations
 */
import { api, getAuthConfig, loginAdmin as apiLogin, API_URL } from '../utils/api';

// Log service initialization
console.log('AdminService initialized, using API at:', API_URL);

class AdminService {
  /**
   * Login with admin credentials
   * @param {string} username - Admin username
   * @param {string} password - Admin password
   * @returns {Promise} - The login response
   */
  static async login(username, password) {
    try {
      console.log(`AdminService: Attempting login for user: ${username}`);
      const result = await apiLogin(username, password);
      console.log('AdminService: Login successful');
      return result;
    } catch (error) {
      console.error('AdminService: Login failed:', error.message);
      throw error;
    }
  }

  /**
   * Get all users in the system
   * @returns {Promise} - List of users
   */
  static async getUsers() {
    try {
      console.log('AdminService: Fetching users list');
      const response = await api.get('/users', getAuthConfig());
      console.log(`AdminService: Successfully fetched ${response.data.length} users`);
      return response.data;
    } catch (error) {
      console.error('AdminService: Failed to fetch users:', error);
      
      // Enhanced error reporting
      const errorDetails = {
        endpoint: '/users',
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      };
      
      console.error('AdminService: User fetch error details:', errorDetails);
      
      // Generate more specific error message
      let errorMessage = 'Failed to fetch users.';
      
      if (error.response) {
        errorMessage += ` Server returned ${error.response.status}: ${error.response.data?.error || 'Unknown error'}`;
      } else if (error.message) {
        errorMessage += ` ${error.message}`;
      }
      
      const enhancedError = new Error(errorMessage);
      enhancedError.details = errorDetails;
      throw enhancedError;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - User data object
   * @returns {Promise} - Created user
   */
  static async createUser(userData) {
    try {
      console.log('AdminService: Creating new user:', userData.username);
      const response = await api.post('/users', userData, getAuthConfig());
      console.log('AdminService: User created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('AdminService: Failed to create user:', error);
      
      // Enhanced error reporting
      const errorDetails = {
        endpoint: '/users (POST)',
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      };
      
      console.error('AdminService: User creation error details:', errorDetails);
      
      const enhancedError = new Error(`Failed to create user: ${error.response?.data?.error || error.message}`);
      enhancedError.details = errorDetails;
      throw enhancedError;
    }
  }

  /**
   * Update an existing user
   * @param {number} userId - ID of the user to update
   * @param {Object} userData - User data to update
   * @returns {Promise} - Updated user
   */
  static async updateUser(userId, userData) {
    try {
      const response = await api.put(`/users/${userId}`, userData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error(`Failed to update user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a user
   * @param {number} userId - ID of the user to delete
   * @returns {Promise} - Response from server
   */
  static async deleteUser(userId) {
    try {
      const response = await api.delete(`/users/${userId}`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error(`Failed to delete user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all shipments
   * @param {Object} filters - Filter parameters
   * @returns {Promise} - List of shipments
   */
  static async getShipments(filters = {}) {
    try {
      const response = await api.get('/shipments', {
        ...getAuthConfig(),
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
      throw error;
    }
  }

  /**
   * Update shipment status
   * @param {number} shipmentId - ID of the shipment
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise} - Updated shipment
   */
  static async updateShipmentStatus(shipmentId, status, additionalData = {}) {
    try {
      const response = await api.put(`/shipments/${shipmentId}/status`, 
        { status, ...additionalData }, 
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update shipment ${shipmentId} status:`, error);
      throw error;
    }
  }

  /**
   * Assign driver to shipment
   * @param {number} shipmentId - ID of the shipment
   * @param {number} driverId - ID of the driver
   * @returns {Promise} - Updated shipment
   */
  static async assignDriver(shipmentId, driverId) {
    try {
      const response = await api.put(`/shipments/${shipmentId}/assign`, 
        { driver_id: driverId }, 
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to assign driver ${driverId} to shipment ${shipmentId}:`, error);
      throw error;
    }
  }

  /**
   * Get all vehicles
   * @returns {Promise} - List of vehicles
   */
  static async getVehicles() {
    try {
      const response = await api.get('/vehicles', getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      throw error;
    }
  }

  /**
   * Create a new vehicle
   * @param {Object} vehicleData - Vehicle data object
   * @returns {Promise} - Created vehicle
   */
  static async createVehicle(vehicleData) {
    try {
      const response = await api.post('/vehicles', vehicleData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to create vehicle:', error);
      throw error;
    }
  }

  /**
   * Get dashboard data for admin
   * @returns {Promise} - Dashboard statistics
   */
  static async getDashboardData() {
    try {
      console.log('AdminService: Fetching dashboard data');
      const response = await api.get('/admin/dashboard', getAuthConfig());
      console.log('AdminService: Dashboard data retrieved successfully');
      return response.data;
    } catch (error) {
      console.error('AdminService: Failed to fetch dashboard data:', error);
      
      // Create enhanced error with details
      const errorDetails = {
        endpoint: '/admin/dashboard',
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      };
      
      console.error('AdminService: Dashboard data error details:', errorDetails);
      
      // Generate a more specific error message
      let errorMessage = 'Failed to fetch dashboard data.';
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage += ' The dashboard API endpoint may not be implemented on the server.';
        } else {
          errorMessage += ` Server returned ${error.response.status}: ${error.response.data?.error || 'Unknown error'}`;
        }
      } else if (error.message) {
        errorMessage += ` ${error.message}`;
      }
      
      const enhancedError = new Error(errorMessage);
      enhancedError.details = errorDetails;
      throw enhancedError;
    }
  }

  /**
   * Test connection to the API server
   * @returns {Promise} - Connection test results
   */
  static async testConnection() {
    try {
      console.log('AdminService: Testing API connection to:', API_URL);
      const startTime = Date.now();
      const response = await api.get('/health', { timeout: 5000 });
      const duration = Date.now() - startTime;
      
      console.log(`AdminService: API connection test successful. Response time: ${duration}ms`);
      return {
        success: true,
        status: response.status,
        data: response.data,
        duration,
        baseUrl: API_URL
      };
    } catch (error) {
      console.error('AdminService: API connection test failed:', error);
      
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        baseUrl: API_URL
      };
    }
  }
}

export default AdminService; 