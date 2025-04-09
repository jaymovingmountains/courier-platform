/**
 * AdminService - Handles admin-specific API operations
 */
import { api, getAuthConfig, loginAdmin as apiLogin } from '../utils/api';

class AdminService {
  /**
   * Login with admin credentials
   * @param {string} username - Admin username
   * @param {string} password - Admin password
   * @returns {Promise} - The login response
   */
  static async login(username, password) {
    return apiLogin(username, password);
  }

  /**
   * Get all users in the system
   * @returns {Promise} - List of users
   */
  static async getUsers() {
    try {
      const response = await api.get('/users', getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - User data object
   * @returns {Promise} - Created user
   */
  static async createUser(userData) {
    try {
      const response = await api.post('/users', userData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
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
   * Update dashboard data for admin
   * @returns {Promise} - Dashboard statistics
   */
  static async getDashboardData() {
    try {
      const response = await api.get('/admin/dashboard', getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      throw error;
    }
  }
}

export default AdminService; 