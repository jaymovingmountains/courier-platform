/**
 * Admin API Routes
 * Migrated from standalone-admin-api.js and enhanced to support all admin-web frontend endpoints
 */
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Import Supabase client
const { supabase } = require('../database');

// Middleware for admin role authorization
const authorizeAdmin = (req, res, next) => {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  next();
};

//==============================================================
// USER MANAGEMENT ROUTES
//==============================================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin only
 */
router.get('/users', authorizeAdmin, async (req, res) => {
  try {
    console.log('Fetching users list from admin API...');
    
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, name, email, phone, created_at, updated_at')
      .order('id');
    
    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }
    
    // Return data directly as an array
    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/list-users
 * @desc    List all users (legacy format - returns object with users array)
 * @access  Admin only
 */
router.get('/list-users', authorizeAdmin, async (req, res) => {
  try {
    console.log('Listing users from admin API...');
    
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, name, email, phone, created_at, updated_at')
      .order('id');
    
    if (error) {
      console.error('Error listing users:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }
    
    res.json({ 
      users: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user
 * @access  Admin only
 */
router.post('/users', authorizeAdmin, async (req, res) => {
  try {
    console.log('Creating new user from admin API...');
    
    const { username, password, role, name, email, phone } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }
    
    // Create hashed password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error checking for existing user:', checkError);
      return res.status(500).json({
        error: 'Database error',
        details: checkError.message
      });
    }
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create new user
    const { data, error } = await supabase.from('users').insert({
      username,
      password: hashedPassword,
      role,
      name,
      email,
      phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select();
    
    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ 
        error: 'Failed to create user', 
        details: error.message 
      });
    }
    
    console.log('User created successfully:', data);
    res.status(201).json(data[0]); 
  } catch (error) {
    console.error('Unexpected error creating user:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update an existing user
 * @access  Admin only
 */
router.put('/users/:id', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, password, email, phone } = req.body;
    
    console.log(`Updating user ID ${id} from admin API...`);
    
    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    // Only add fields that were provided
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    
    // Handle password separately if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // Update user
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Error updating user ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to update user', 
        details: error.message 
      });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`User ID ${id} updated successfully`);
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user
 * @access  Admin only
 */
router.delete('/users/:id', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Deleting user ID ${id} from admin API...`);
    
    // First check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();
      
    if (checkError) {
      if (checkError.code === 'PGRST116') { // No rows returned
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.error(`Error checking for user ID ${id}:`, checkError);
      return res.status(500).json({
        error: 'Database error',
        details: checkError.message
      });
    }
    
    // Prevent deletion of admin users as a safety measure
    if (existingUser.role === 'admin') {
      return res.status(403).json({ 
        error: 'Cannot delete admin users' 
      });
    }
    
    // Delete user
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting user ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to delete user', 
        details: error.message 
      });
    }
    
    console.log(`User ID ${id} deleted successfully`);
    res.json({ 
      message: 'User deleted successfully',
      id
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

/**
 * @route   GET /api/admin/test-connection
 * @desc    Test database connection
 * @access  Admin only
 */
router.get('/test-connection', authorizeAdmin, async (req, res) => {
  try {
    console.log('Testing database connection...');
    
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.error('Database connection test failed:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: error.message
      });
    }
    
    res.json({ 
      status: 'ok', 
      message: 'Database connection successful',
      data: data
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Test failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mml-platform-api',
    component: 'admin-api'
  });
});

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics
 * @access  Admin only
 */
router.get('/dashboard', authorizeAdmin, async (req, res) => {
  try {
    console.log('Fetching admin dashboard data...');
    
    // Query shipments
    const shipmentsQuery = supabase
      .from('shipments')
      .select('*');
    
    // Query users
    const usersQuery = supabase
      .from('users')
      .select('*');
    
    // Query vehicles
    const vehiclesQuery = supabase
      .from('vehicles')
      .select('*');
    
    // Execute all queries in parallel
    const [shipmentsRes, usersRes, vehiclesRes] = await Promise.all([
      shipmentsQuery,
      usersQuery,
      vehiclesQuery
    ]);
    
    // Handle any errors
    if (shipmentsRes.error || usersRes.error || vehiclesRes.error) {
      console.error('Error fetching dashboard data:', {
        shipments: shipmentsRes.error,
        users: usersRes.error,
        vehicles: vehiclesRes.error
      });
      
      return res.status(500).json({
        error: 'Failed to fetch dashboard data',
        details: 'One or more database queries failed'
      });
    }
    
    // Process results
    const shipments = shipmentsRes.data || [];
    const users = usersRes.data || [];
    const vehicles = vehiclesRes.data || [];
    
    const drivers = users.filter(user => user.role === 'driver').length;
    const shippers = users.filter(user => user.role === 'shipper').length;
    
    // Calculate total revenue from completed shipments
    const totalRevenue = shipments
      .filter(s => s.status === 'delivered')
      .reduce((sum, shipment) => sum + (parseFloat(shipment.quote_amount) || 0), 0);
    
    // Return dashboard data
    res.json({
      counts: {
        shipments: shipments.length,
        drivers,
        shippers,
        admins: users.filter(user => user.role === 'admin').length,
        vehicles: vehicles.length,
        totalUsers: users.length
      },
      stats: {
        totalRevenue,
        completedShipments: shipments.filter(s => s.status === 'delivered').length,
        pendingShipments: shipments.filter(s => s.status === 'pending').length,
        inTransitShipments: shipments.filter(s => s.status === 'in_transit').length
      },
      recentShipments: shipments
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
    });
  } catch (error) {
    console.error('Error generating dashboard data:', error);
    res.status(500).json({ error: 'Failed to generate dashboard data' });
  }
});

/**
 * @route   GET /api/admin/shipments
 * @desc    Get all shipments with optional status filter
 * @access  Admin only
 */
router.get('/shipments', authorizeAdmin, async (req, res) => {
  try {
    console.log('Fetching shipments from admin API...');
    
    // Get status query parameter
    const status = req.query.status;
    
    // Build query
    let query = supabase.from('shipments').select('*');
    
    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Execute query with descending order by creation date
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching shipments:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/vehicles
 * @desc    Get all vehicles
 * @access  Admin only
 */
router.get('/vehicles', authorizeAdmin, async (req, res) => {
  try {
    console.log('Fetching vehicles from admin API...');
    
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('id');
    
    if (error) {
      console.error('Error fetching vehicles:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/create-admin
 * @desc    Create a new admin user
 * @access  Admin only
 */
router.post('/create-admin', authorizeAdmin, async (req, res) => {
  try {
    console.log('Creating admin user...');
    
    const { username = 'admin', password = 'admin123', name = 'System Admin' } = req.body;
    
    // Create hashed password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error checking for existing user:', checkError);
      return res.status(500).json({
        error: 'Database error',
        details: checkError.message
      });
    }
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create new admin user
    const { data, error } = await supabase.from('users').insert({
      username,
      password: hashedPassword,
      role: 'admin',
      name
    }).select();
    
    if (error) {
      console.error('Error creating admin user:', error);
      return res.status(500).json({ 
        error: 'Failed to create admin user', 
        details: error.message 
      });
    }
    
    console.log('Admin user created successfully:', data);
    res.status(201).json({ 
      message: 'Admin user created successfully',
      user: {
        username,
        role: 'admin',
        name
      }
    });
  } catch (error) {
    console.error('Unexpected error creating admin user:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

//==============================================================
// VEHICLE MANAGEMENT ROUTES
//==============================================================

/**
 * @route   POST /api/admin/vehicles
 * @desc    Create a new vehicle
 * @access  Admin only
 */
router.post('/vehicles', authorizeAdmin, async (req, res) => {
  try {
    console.log('Creating new vehicle from admin API...');
    
    const { 
      type, 
      make, 
      model, 
      year, 
      license_plate, 
      vehicle_name,
      capacity, 
      status = 'active' 
    } = req.body;
    
    if (!type || !make || !model || !license_plate) {
      return res.status(400).json({ 
        error: 'Vehicle type, make, model, and license plate are required' 
      });
    }
    
    // Check if vehicle with license plate already exists
    const { data: existingVehicle, error: checkError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('license_plate', license_plate)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error checking for existing vehicle:', checkError);
      return res.status(500).json({
        error: 'Database error',
        details: checkError.message
      });
    }
    
    if (existingVehicle) {
      return res.status(400).json({ error: 'Vehicle with this license plate already exists' });
    }
    
    // Create new vehicle
    const { data, error } = await supabase.from('vehicles').insert({
      type,
      make,
      model,
      year,
      license_plate,
      vehicle_name: vehicle_name || `${make} ${model}`,
      capacity,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select();
    
    if (error) {
      console.error('Error creating vehicle:', error);
      return res.status(500).json({ 
        error: 'Failed to create vehicle', 
        details: error.message 
      });
    }
    
    console.log('Vehicle created successfully:', data);
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Unexpected error creating vehicle:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/vehicles/:id
 * @desc    Update an existing vehicle
 * @access  Admin only
 */
router.put('/vehicles/:id', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      type, 
      make, 
      model, 
      year, 
      license_plate, 
      vehicle_name,
      capacity, 
      status 
    } = req.body;
    
    console.log(`Updating vehicle ID ${id} from admin API...`);
    
    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    // Only add fields that were provided
    if (type !== undefined) updateData.type = type;
    if (make !== undefined) updateData.make = make;
    if (model !== undefined) updateData.model = model;
    if (year !== undefined) updateData.year = year;
    if (license_plate !== undefined) updateData.license_plate = license_plate;
    if (vehicle_name !== undefined) updateData.vehicle_name = vehicle_name;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (status !== undefined) updateData.status = status;
    
    // If license plate is changing, check if it already exists
    if (license_plate) {
      const { data: existingVehicle, error: checkError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('license_plate', license_plate)
        .neq('id', id)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing vehicle:', checkError);
        return res.status(500).json({
          error: 'Database error',
          details: checkError.message
        });
      }
      
      if (existingVehicle) {
        return res.status(400).json({ error: 'Vehicle with this license plate already exists' });
      }
    }
    
    // Update vehicle
    const { data, error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Error updating vehicle ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to update vehicle', 
        details: error.message 
      });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    console.log(`Vehicle ID ${id} updated successfully`);
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/vehicles/:id
 * @desc    Delete a vehicle
 * @access  Admin only
 */
router.delete('/vehicles/:id', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Deleting vehicle ID ${id} from admin API...`);
    
    // First check if vehicle exists
    const { data: existingVehicle, error: checkError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', id)
      .single();
      
    if (checkError) {
      if (checkError.code === 'PGRST116') { // No rows returned
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      
      console.error(`Error checking for vehicle ID ${id}:`, checkError);
      return res.status(500).json({
        error: 'Database error',
        details: checkError.message
      });
    }
    
    // Check if vehicle is assigned to any shipments
    const { data: assignedShipments, error: assignmentError } = await supabase
      .from('shipments')
      .select('id')
      .eq('vehicle_id', id)
      .limit(1);
      
    if (assignmentError) {
      console.error(`Error checking vehicle assignments for ID ${id}:`, assignmentError);
      return res.status(500).json({
        error: 'Database error',
        details: assignmentError.message
      });
    }
    
    if (assignedShipments && assignedShipments.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vehicle that is assigned to shipments',
        assigned_shipments: assignedShipments
      });
    }
    
    // Delete vehicle
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting vehicle ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to delete vehicle', 
        details: error.message 
      });
    }
    
    console.log(`Vehicle ID ${id} deleted successfully`);
    res.json({ 
      message: 'Vehicle deleted successfully',
      id
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

//==============================================================
// SHIPMENT MANAGEMENT ROUTES
//==============================================================

/**
 * @route   PUT /api/admin/shipments/:id/approve
 * @desc    Approve a shipment and assign driver/vehicle
 * @access  Admin only
 */
router.put('/shipments/:id/approve', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_id, vehicle_id } = req.body;
    
    console.log(`Approving shipment ID ${id} from admin API...`);
    
    if (!driver_id || !vehicle_id) {
      return res.status(400).json({ error: 'Driver ID and vehicle ID are required' });
    }
    
    // Update shipment status to 'approved' and assign driver and vehicle
    const { data, error } = await supabase
      .from('shipments')
      .update({
        status: 'approved',
        driver_id,
        vehicle_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Error approving shipment ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to approve shipment', 
        details: error.message 
      });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    console.log(`Shipment ID ${id} approved successfully`);
    res.json(data[0]);
  } catch (error) {
    console.error('Error approving shipment:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/shipments/:id/status
 * @desc    Update shipment status
 * @access  Admin only
 */
router.put('/shipments/:id/status', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`Updating status for shipment ID ${id} to ${status}...`);
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Validate status
    const validStatuses = ['pending', 'quoted', 'approved', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }
    
    // Update shipment status
    const { data, error } = await supabase
      .from('shipments')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Error updating status for shipment ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to update shipment status', 
        details: error.message 
      });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    console.log(`Status for shipment ID ${id} updated successfully to ${status}`);
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating shipment status:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/shipments/:id/quote
 * @desc    Provide a quote for a shipment
 * @access  Admin only
 */
router.put('/shipments/:id/quote', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { quote_amount } = req.body;
    
    console.log(`Providing quote for shipment ID ${id}...`);
    
    if (!quote_amount) {
      return res.status(400).json({ error: 'Quote amount is required' });
    }
    
    // Update shipment with quote
    const { data, error } = await supabase
      .from('shipments')
      .update({
        quote_amount,
        status: 'quoted',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Error providing quote for shipment ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to provide quote', 
        details: error.message 
      });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    console.log(`Quote provided for shipment ID ${id}: $${quote_amount}`);
    res.json(data[0]);
  } catch (error) {
    console.error('Error providing quote:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/shipments/:id/assign
 * @desc    Assign a driver to a shipment
 * @access  Admin only
 */
router.put('/shipments/:id/assign', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;
    
    console.log(`Assigning driver ID ${driver_id} to shipment ID ${id}...`);
    
    if (!driver_id) {
      return res.status(400).json({ error: 'Driver ID is required' });
    }
    
    // Update shipment with driver assignment
    const { data, error } = await supabase
      .from('shipments')
      .update({
        driver_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Error assigning driver to shipment ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to assign driver', 
        details: error.message 
      });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    console.log(`Driver ID ${driver_id} assigned to shipment ID ${id} successfully`);
    res.json(data[0]);
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

/**
 * @route   GET /api/admin/shipments/:id/label
 * @desc    Get shipping label for a shipment
 * @access  Admin only
 */
router.get('/shipments/:id/label', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Generating shipping label for shipment ID ${id}...`);
    
    // Fetch shipment data from database
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select(`
        id, tracking_number, 
        pickup_address, pickup_city, pickup_postal_code,
        delivery_address, delivery_city, delivery_postal_code,
        shipper_id, driver_id, shipment_type
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching shipment ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to fetch shipment data', 
        details: error.message 
      });
    }
    
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    // Fetch shipper data
    const { data: shipper, error: shipperError } = await supabase
      .from('users')
      .select('id, name, username')
      .eq('id', shipment.shipper_id)
      .single();
      
    if (shipperError) {
      console.error(`Error fetching shipper ID ${shipment.shipper_id}:`, shipperError);
    }
    
    // Placeholder - Generate a simple shipping label
    // In a real implementation, this would create an actual PDF document
    // For now, we'll just return JSON data that would be used in the label
    const labelData = {
      id: shipment.id,
      tracking_number: shipment.tracking_number || `MM-TRACK-${shipment.id}`,
      shipment_type: shipment.shipment_type,
      shipper: shipper ? shipper.name || shipper.username : `Shipper #${shipment.shipper_id}`,
      pickup: {
        address: shipment.pickup_address,
        city: shipment.pickup_city,
        postal_code: shipment.pickup_postal_code
      },
      delivery: {
        address: shipment.delivery_address,
        city: shipment.delivery_city,
        postal_code: shipment.delivery_postal_code
      },
      generated_at: new Date().toISOString()
    };
    
    console.log(`Shipping label generated for shipment ID ${id}`);
    res.json(labelData);
  } catch (error) {
    console.error('Error generating shipping label:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

/**
 * @route   GET /api/admin/shipments/:id/invoice
 * @desc    Get invoice for a shipment
 * @access  Admin only
 */
router.get('/shipments/:id/invoice', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Generating invoice for shipment ID ${id}...`);
    
    // Fetch shipment data from database
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select(`
        id, tracking_number, quote_amount, 
        pickup_address, pickup_city, pickup_postal_code,
        delivery_address, delivery_city, delivery_postal_code,
        shipper_id, driver_id, shipment_type, status,
        created_at, updated_at
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching shipment ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to fetch shipment data', 
        details: error.message 
      });
    }
    
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    // Only allow invoice generation for delivered shipments
    if (shipment.status !== 'delivered') {
      return res.status(400).json({ 
        error: 'Invoice can only be generated for delivered shipments' 
      });
    }
    
    // Fetch shipper data
    const { data: shipper, error: shipperError } = await supabase
      .from('users')
      .select('id, name, username, email')
      .eq('id', shipment.shipper_id)
      .single();
      
    if (shipperError) {
      console.error(`Error fetching shipper ID ${shipment.shipper_id}:`, shipperError);
    }
    
    // Calculate some invoice details
    const quoteAmount = parseFloat(shipment.quote_amount) || 0;
    const taxRate = 0.13; // 13% tax
    const taxAmount = quoteAmount * taxRate;
    const totalAmount = quoteAmount + taxAmount;
    
    // Placeholder - Generate a simple invoice
    // In a real implementation, this would create an actual PDF document
    // For now, we'll just return JSON data that would be used in the invoice
    const invoiceData = {
      invoice_number: `INV-${shipment.id}`,
      tracking_number: shipment.tracking_number || `MM-TRACK-${shipment.id}`,
      date: new Date().toISOString().split('T')[0],
      customer: {
        name: shipper ? shipper.name || shipper.username : `Shipper #${shipment.shipper_id}`,
        email: shipper ? shipper.email : '',
        id: shipment.shipper_id
      },
      shipment: {
        id: shipment.id,
        type: shipment.shipment_type,
        pickup: `${shipment.pickup_address}, ${shipment.pickup_city}, ${shipment.pickup_postal_code}`,
        delivery: `${shipment.delivery_address}, ${shipment.delivery_city}, ${shipment.delivery_postal_code}`,
        created_at: shipment.created_at,
        delivered_at: shipment.updated_at
      },
      amount: quoteAmount.toFixed(2),
      tax: taxAmount.toFixed(2),
      total: totalAmount.toFixed(2)
    };
    
    console.log(`Invoice generated for shipment ID ${id}`);
    res.json(invoiceData);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

//==============================================================
// SHIPPER MANAGEMENT ROUTES
//==============================================================

/**
 * @route   GET /api/admin/shippers/:id/clients
 * @desc    Get all clients for a shipper
 * @access  Admin only
 */
router.get('/shippers/:id/clients', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Fetching clients for shipper ID ${id} from admin API...`);
    
    // First check if the shipper exists
    const { data: shipper, error: shipperError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .eq('role', 'shipper')
      .single();
      
    if (shipperError) {
      if (shipperError.code === 'PGRST116') { // No rows returned
        return res.status(404).json({ error: 'Shipper not found' });
      }
      
      console.error(`Error checking for shipper ID ${id}:`, shipperError);
      return res.status(500).json({
        error: 'Database error',
        details: shipperError.message
      });
    }
    
    // Get clients for the shipper
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('shipper_id', id)
      .order('name');
    
    if (error) {
      console.error(`Error fetching clients for shipper ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching shipper clients:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

/**
 * @route   GET /api/admin/shippers/:id/addresses
 * @desc    Get all saved addresses for a shipper
 * @access  Admin only
 */
router.get('/shippers/:id/addresses', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Fetching addresses for shipper ID ${id} from admin API...`);
    
    // First check if the shipper exists
    const { data: shipper, error: shipperError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .eq('role', 'shipper')
      .single();
      
    if (shipperError) {
      if (shipperError.code === 'PGRST116') { // No rows returned
        return res.status(404).json({ error: 'Shipper not found' });
      }
      
      console.error(`Error checking for shipper ID ${id}:`, shipperError);
      return res.status(500).json({
        error: 'Database error',
        details: shipperError.message
      });
    }
    
    // Get addresses for the shipper
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', id)
      .order('address_name');
    
    if (error) {
      console.error(`Error fetching addresses for shipper ID ${id}:`, error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching shipper addresses:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message
    });
  }
});

//==============================================================
// SYSTEM UTILITY ROUTES
//==============================================================

/**
 * @route   GET /api/admin/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mml-platform-api',
    component: 'admin-api'
  });
});

module.exports = router;
