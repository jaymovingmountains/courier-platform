/**
 * ShipperService - Handles shipper-specific API operations
 */
import { api, getAuthConfig, loginShipper as apiLogin } from '../utils/api';

class ShipperService {
  /**
   * Login with shipper credentials
   * @param {string} username - Shipper username
   * @param {string} password - Shipper password
   * @returns {Promise} - The login response
   */
  static async login(username, password) {
    return apiLogin(username, password);
  }

  /**
   * Get shipper profile
   * @returns {Promise} - Shipper profile data
   */
  static async getProfile() {
    try {
      const response = await api.get('/user/profile', getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      throw error;
    }
  }

  /**
   * Update shipper profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} - Updated profile
   */
  static async updateProfile(profileData) {
    try {
      const response = await api.put('/user/profile', profileData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  /**
   * Create a new shipment
   * @param {Object} shipmentData - Shipment data object
   * @returns {Promise} - Created shipment
   */
  static async createShipment(shipmentData) {
    try {
      const response = await api.post('/shipments', shipmentData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to create shipment:', error);
      throw error;
    }
  }

  /**
   * Get all shipments for current shipper
   * @param {Object} filters - Filter parameters (status, date range, etc.)
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
   * Get a single shipment by ID
   * @param {number} shipmentId - ID of the shipment
   * @returns {Promise} - Shipment details
   */
  static async getShipment(shipmentId) {
    try {
      const response = await api.get(`/shipments/${shipmentId}`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch shipment ${shipmentId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a shipment
   * @param {number} shipmentId - ID of the shipment to cancel
   * @param {string} reason - Reason for cancellation
   * @returns {Promise} - Cancelled shipment
   */
  static async cancelShipment(shipmentId, reason) {
    try {
      const response = await api.put(
        `/shipments/${shipmentId}/cancel`, 
        { reason }, 
        getAuthConfig()
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to cancel shipment ${shipmentId}:`, error);
      throw error;
    }
  }

  /**
   * Get saved addresses for current shipper
   * @returns {Promise} - List of saved addresses
   */
  static async getSavedAddresses() {
    try {
      const response = await api.get('/addresses', getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to fetch saved addresses:', error);
      throw error;
    }
  }

  /**
   * Create a new saved address
   * @param {Object} addressData - Address data object
   * @returns {Promise} - Created address
   */
  static async createAddress(addressData) {
    try {
      const response = await api.post('/addresses', addressData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to create address:', error);
      throw error;
    }
  }

  /**
   * Update a saved address
   * @param {number} addressId - ID of the address to update
   * @param {Object} addressData - Address data to update
   * @returns {Promise} - Updated address
   */
  static async updateAddress(addressId, addressData) {
    try {
      const response = await api.put(`/addresses/${addressId}`, addressData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error(`Failed to update address ${addressId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a saved address
   * @param {number} addressId - ID of the address to delete
   * @returns {Promise} - Response from server
   */
  static async deleteAddress(addressId) {
    try {
      const response = await api.delete(`/addresses/${addressId}`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error(`Failed to delete address ${addressId}:`, error);
      throw error;
    }
  }

  /**
   * Get all clients for current shipper
   * @returns {Promise} - List of clients
   */
  static async getClients() {
    try {
      const response = await api.get('/clients', getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      throw error;
    }
  }

  /**
   * Create a new client
   * @param {Object} clientData - Client data object
   * @returns {Promise} - Created client
   */
  static async createClient(clientData) {
    try {
      const response = await api.post('/clients', clientData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to create client:', error);
      throw error;
    }
  }

  /**
   * Update a client
   * @param {number} clientId - ID of the client to update
   * @param {Object} clientData - Client data to update
   * @returns {Promise} - Updated client
   */
  static async updateClient(clientId, clientData) {
    try {
      const response = await api.put(`/clients/${clientId}`, clientData, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error(`Failed to update client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Get shipper dashboard data
   * @returns {Promise} - Dashboard statistics
   */
  static async getDashboardData() {
    try {
      const response = await api.get('/shipper/dashboard', getAuthConfig());
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get invoices for current shipper
   * @param {Object} filters - Filter parameters (status, date range, etc.)
   * @returns {Promise} - List of invoices
   */
  static async getInvoices(filters = {}) {
    try {
      const response = await api.get('/invoices', {
        ...getAuthConfig(),
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      throw error;
    }
  }

  /**
   * Get a single invoice by ID
   * @param {number} invoiceId - ID of the invoice
   * @returns {Promise} - Invoice details
   */
  static async getInvoice(invoiceId) {
    try {
      const response = await api.get(`/invoices/${invoiceId}`, getAuthConfig());
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch invoice ${invoiceId}:`, error);
      throw error;
    }
  }
}

export default ShipperService; 