/**
 * Admin API Routes
 * Migrated from standalone-admin-api.js
 */
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Import Supabase client
const { supabase } = require('../database');

// Middleware for admin role authorization
const authorizeAdmin = (req, res, next) => {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  next();
};

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
      .select('id, username, role, name, email')
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
      .select('id, username, role, name, email')
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
 * @desc    Get all shipments
 * @access  Admin only
 */
router.get('/shipments', authorizeAdmin, async (req, res) => {
  try {
    console.log('Fetching shipments from admin API...');
    
    // Get query parameters for filtering
    const status = req.query.status;
    
    // Build query
    let query = supabase
      .from('shipments')
      .select('*');
    
    // Apply filters if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Execute query
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

module.exports = router;
