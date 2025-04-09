require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { expressjwt: jwt } = require('express-jwt');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const { db, run, get, all } = require('./database');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { generateInvoiceFromDbData, calculateTaxes } = require('./utils/invoiceGenerator');
const { supabase } = require('./database');

// Helper function to validate Canadian province codes
const validateProvinceCode = (province) => {
  if (!province || typeof province !== 'string') return false;
  
  const validProvinceCodes = [
    'AB', // Alberta
    'BC', // British Columbia
    'MB', // Manitoba
    'NB', // New Brunswick
    'NL', // Newfoundland and Labrador
    'NS', // Nova Scotia
    'NT', // Northwest Territories
    'NU', // Nunavut
    'ON', // Ontario
    'PE', // Prince Edward Island
    'QC', // Quebec
    'SK', // Saskatchewan
    'YT'  // Yukon
  ];
  
  return validProvinceCodes.includes(province.toUpperCase());
};

// Notification helper functions
/**
 * Creates a notification for a shipper about their shipment
 * @param {number} shipperId - The ID of the shipper
 * @param {number} shipmentId - The ID of the shipment
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (quote, assigned, picked_up, in_transit, delivered)
 * @returns {Promise<number|null>} ID of the created notification or null if failed
 */
async function createNotification(shipperId, shipmentId, title, message, type) {
  try {
    const result = await run(
      `INSERT INTO notifications (shipper_id, shipment_id, title, message, type, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [shipperId, shipmentId, title, message, type]
    );
    
    console.log(`✅ Created notification for shipper #${shipperId} about shipment #${shipmentId}: ${title}`);
    return result.lastID;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
}

/**
 * Gets notifications for a shipper
 * @param {number} shipperId - The ID of the shipper
 * @param {boolean} unreadOnly - Whether to get only unread notifications
 * @param {number} limit - Maximum number of notifications to return
 * @returns {Promise<Array>} List of notifications
 */
async function getNotifications(shipperId, unreadOnly = false, limit = 50) {
  try {
    let query = `
      SELECT n.*, s.shipment_type, s.pickup_address, s.delivery_address,
             u.username as driver_name
      FROM notifications n
      LEFT JOIN shipments s ON n.shipment_id = s.id
      LEFT JOIN users u ON s.driver_id = u.id
      WHERE n.shipper_id = ?
    `;
    
    const params = [shipperId];
    
    if (unreadOnly) {
      query += ` AND n.is_read = 0`;
    }
    
    query += ` ORDER BY n.created_at DESC LIMIT ?`;
    params.push(limit);
    
    return await all(query, params);
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    return [];
  }
}

/**
 * Marks notifications as read
 * @param {number} shipperId - The ID of the shipper
 * @param {Array<number>} notificationIds - IDs of notifications to mark as read
 * @returns {Promise<boolean>} Success or failure
 */
async function markNotificationsAsRead(shipperId, notificationIds) {
  try {
    if (!notificationIds || !notificationIds.length) return true;
    
    const placeholders = notificationIds.map(() => '?').join(',');
    const params = [...notificationIds, shipperId];
    
    await run(
      `UPDATE notifications 
       SET is_read = 1
       WHERE id IN (${placeholders})
       AND shipper_id = ?`,
      params
    );
    
    return true;
  } catch (error) {
    console.error('❌ Error marking notifications as read:', error);
    return false;
  }
}

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'courier_secret';

// Special direct debugging route - MUST BE CREATED BEFORE ANY MIDDLEWARE
app.post('/no-auth/create-test-admin', async (req, res) => {
  try {
    console.log('Attempting to create test admin with no auth...');
    
    // Create hashed password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Try direct Supabase insert
    console.log('Using Supabase URL:', process.env.SUPABASE_URL);
    console.log('Supabase key is set:', !!process.env.SUPABASE_KEY);
    
    const { data, error } = await supabase.from('users').insert({
      username: 'admintest',
      password: hashedPassword,
      role: 'admin',
      name: 'Admin Test'
    }).select();
    
    if (error) {
      console.error('Error creating test admin:', error);
      return res.status(500).json({ 
        error: 'Failed to create test admin', 
        details: error.message 
      });
    }
    
    console.log('Test admin created successfully:', data);
    res.status(201).json({ 
      message: 'Test admin created successfully',
      user: {
        username: 'admintest',
        role: 'admin',
        name: 'Admin Test'
      },
      data: data
    });
  } catch (error) {
    console.error('Unexpected error creating test admin:', error);
    res.status(500).json({ 
      error: 'Failed to create test admin', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Logging middleware for production
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  try {
    // Simple check to see if database is accessible
    db.get('SELECT 1', (err) => {
      if (err) {
        console.error('Health check failed - Database error:', err);
        return res.status(500).json({ 
          status: 'error', 
          message: 'Database connection failed',
          time: new Date().toISOString()
        });
      }
      
      res.json({ 
        status: 'ok', 
        message: 'Service is healthy',
        version: require('./package.json').version,
        time: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Service health check failed',
      time: new Date().toISOString() 
    });
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ? 
    process.env.CORS_ORIGIN.split(',') : 
    ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-portal'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the invoices directory
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));

// Temporary debug route to create test shipper (before JWT middleware)
app.post('/debug/create-test-shipper', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('shipper123', 10);
    const result = await run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['testshipper', hashedPassword, 'shipper']
    );
    res.json({ message: 'Test shipper created successfully' });
  } catch (error) {
    console.error('Error creating test shipper:', error);
    res.status(500).json({ error: 'Failed to create test shipper' });
  }
});

// Special debug route to create a test admin (before JWT middleware)
app.post('/debug/create-test-admin', async (req, res) => {
  try {
    console.log('Creating test admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Try direct Supabase insert
    const { data, error } = await supabase.from('users').insert({
      username: 'testadmin',
      password: hashedPassword,
      role: 'admin',
      name: 'Test Admin'
    }).select();
    
    if (error) {
      console.error('Error creating test admin with direct Supabase insert:', error);
      return res.status(500).json({ 
        error: 'Failed to create test admin', 
        details: error.message 
      });
    }
    
    console.log('Test admin created successfully with direct Supabase insert:', data);
    res.json({ 
      message: 'Test admin created successfully',
      user: {
        username: 'testadmin',
        role: 'admin',
        name: 'Test Admin'
      }
    });
  } catch (error) {
    console.error('Error creating test admin:', error);
    res.status(500).json({ error: 'Failed to create test admin', details: error.message });
  }
});

// JWT middleware
app.use(jwt({
  secret: JWT_SECRET,
  algorithms: ['HS256'],
  getToken: (req) => {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      return req.headers.authorization.split(' ')[1];
    } 
    if (req.query && req.query.token) {
      return req.query.token;
    }
    return null;
  }
}).unless({
  path: [
    '/login',
    '/register',
    '/',
    '/health',
    '/api/public-test-db',
    '/api/test-supabase',
    '/api/debug-users',
    '/admin/setup',
    '/debug/create-test-admin',
    '/api/debug-login',
    { url: /^\/api\/public.*/, methods: ['GET'] }
  ]
}));

// Role-based authorization middleware
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    const { username, password, role, name } = req.body;
    console.log('Registration attempt:', { username, role, name });

    // Validate role
    if (!['shipper', 'admin', 'driver'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if username exists
    let existingUser;
    try {
      existingUser = await get('SELECT id FROM users WHERE username = ?', [username]);
      console.log('Existing user check result:', existingUser);
    } catch (checkError) {
      console.error('Error checking existing user:', checkError);
      return res.status(500).json({ 
        error: 'Database error during user check',
        details: checkError.message
      });
    }
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username taken' });
    }

    // Use name if provided, otherwise use username as default
    const displayName = name || username;

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Try direct Supabase insert first as fallback
    let directInsertResult = null;
    let runError = null;
    
    try {
      console.log('Attempting to insert user with run()...');
      await run(
        'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, role, displayName]
      );
      console.log('User inserted successfully with run()');
    } catch (error) {
      runError = error;
      console.error('Error using run() to insert user:', error);
      
      // Try direct Supabase insert as fallback
      try {
        console.log('Attempting direct Supabase insert...');
        const { data, error: supabaseError } = await supabase.from('users').insert({
          username: username,
          password: hashedPassword,
          role: role,
          name: displayName
        }).select();
        
        if (supabaseError) {
          console.error('Direct Supabase insert failed:', supabaseError);
          throw supabaseError;
        }
        
        directInsertResult = data;
        console.log('User inserted successfully with direct Supabase:', data);
      } catch (supabaseError) {
        console.error('Direct Supabase insert also failed:', supabaseError);
        return res.status(500).json({ 
          error: 'Failed to create user', 
          run_error: runError.message,
          supabase_error: supabaseError.message 
        });
      }
    }

    res.status(201).json({ 
      message: 'User registered',
      direct_insert_used: !!directInsertResult,
      direct_insert_result: directInsertResult
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const portalType = req.headers['x-portal'];

    // Log login attempt with portal type
    console.log('Login attempt:', { username, portalType });

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Get user from database
    const user = await get('SELECT id, username, password, role, name FROM users WHERE username = ?', [username]);
    if (!user) {
      console.log('Login failed: User not found:', { username });
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      console.log('Login failed: Invalid password for user:', { username });
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // For admin portal, verify role
    if (portalType === 'admin' && user.role !== 'admin') {
      console.log('Login failed: Invalid role for admin portal', {
        userRole: user.role,
        requiredRole: 'admin'
      });
      return res.status(403).json({ error: 'Access denied. Only administrators can log in to this portal.' });
    }

    // For shipper portal, verify role
    if (portalType === 'shipper' && user.role !== 'shipper') {
      console.log('Login failed: Invalid role for shipper portal', {
        userRole: user.role,
        requiredRole: 'shipper'
      });
      return res.status(403).json({ error: 'Access denied. Only shippers can log in to this portal.' });
    }

    // For driver portal, verify role
    if (portalType === 'driver' && user.role !== 'driver') {
      console.log('Login failed: Invalid role for driver portal', {
        userRole: user.role,
        requiredRole: 'driver'
      });
      return res.status(403).json({ error: 'Access denied. Only drivers can log in to this portal.' });
    }

    // Generate JWT token
    const token = jsonwebtoken.sign(
      { 
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name || user.username // Include name in token, fallback to username if name is null
      },
      JWT_SECRET,
      { expiresIn: process.env.NODE_ENV === 'production' ? '12h' : '24h' }
    );
    
    console.log('Login successful:', { 
      username: user.username, 
      role: user.role,
      name: user.name
    });

    // Return user info along with token
    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name || user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Shipments endpoints
// Create shipment (Shipper only)
app.post('/shipments', authorize(['shipper']), async (req, res) => {
  try {
    const {
      shipment_type,
      pickup_address,
      pickup_city,
      pickup_postal_code,
      delivery_address,
      delivery_city,
      delivery_postal_code,
      quote_amount,
      province,
      weight,
      length,
      width,
      height,
      dimension_unit,
      description,
      estimated_delivery_time
    } = req.body;

    // Validate required fields
    if (!shipment_type || !pickup_address || !pickup_city || !pickup_postal_code || 
        !delivery_address || !delivery_city || !delivery_postal_code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate province field
    if (!province) {
      return res.status(400).json({ error: 'Province is required' });
    }

    if (!validateProvinceCode(province)) {
      return res.status(400).json({ 
        error: 'Invalid province code. Must be a valid Canadian province or territory code (e.g., AB, BC, ON)' 
      });
    }

    // Generate unique tracking number (Format: MM-YEAR-RANDOMNUMBER)
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6-digit number
    const trackingNumber = `MM-${year}-${randomNum}`;

    // Current timestamp for created_at and updated_at
    const timestamp = new Date().toISOString();

    const result = await run(
      `INSERT INTO shipments (
        shipper_id,
        shipment_type,
        tracking_number,
        weight,
        length,
        width,
        height,
        dimension_unit,
        pickup_address,
        pickup_city,
        pickup_postal_code,
        delivery_address,
        delivery_city,
        delivery_postal_code,
        quote_amount,
        province,
        status,
        created_at,
        updated_at,
        estimated_delivery_time,
        description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [
        req.auth.id,
        shipment_type,
        trackingNumber,
        weight || null,
        length || null,
        width || null,
        height || null,
        dimension_unit || null,
        pickup_address,
        pickup_city,
        pickup_postal_code,
        delivery_address,
        delivery_city,
        delivery_postal_code,
        quote_amount,
        province.toUpperCase(),
        timestamp,
        timestamp,
        estimated_delivery_time || null,
        description || null
      ]
    );

    // Return the newly created shipment with its tracking number
    res.status(201).json({ 
      id: result.id, 
      tracking_number: trackingNumber
    });
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shipments (Role-based filtering)
app.get('/shipments', async (req, res) => {
  try {
    // Now select all columns since they exist in the database
    let query = `
      SELECT 
        id, 
        shipper_id, 
        driver_id, 
        vehicle_id, 
        shipment_type, 
        tracking_number,
        weight,
        length,
        width,
        height,
        dimension_unit,
        pickup_address, 
        pickup_city, 
        pickup_postal_code, 
        delivery_address, 
        delivery_city, 
        delivery_postal_code, 
        status, 
        quote_amount, 
        created_at,
        updated_at,
        estimated_delivery_time,
        description,
        province,
        invoiceUrl,
        tax_amount,
        total_amount,
        payment_status
      FROM shipments 
      WHERE 1=1`;
    const params = [];

    switch (req.auth.role) {
      case 'shipper':
        query += ' AND shipper_id = ?';
        params.push(req.auth.id);
        break;
      case 'driver':
        query += ' AND driver_id = ?';
        params.push(req.auth.id);
        break;
      case 'admin':
        // No filter - admin sees all shipments
        break;
      default:
        return res.status(403).json({ error: 'Forbidden' });
    }

    const shipments = await all(query, params);
    
    // Fill in any null values with appropriate defaults
    const formattedShipments = shipments.map(shipment => ({
      ...shipment,
      province: shipment.province || null,
      tracking_number: shipment.tracking_number || `MM-${new Date().getFullYear()}-${shipment.id}`,
      updated_at: shipment.updated_at || shipment.created_at
    }));
    
    res.json(formattedShipments);
  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single shipment by ID (Role-based access)
app.get('/shipments/:id', async (req, res) => {
  try {
    console.log('Fetching shipment with ID:', req.params.id);
    console.log('User role:', req.auth.role);
    console.log('User ID:', req.auth.id);

    // Now select all columns since they exist in the database
    let query = `
      SELECT 
        id, 
        shipper_id, 
        driver_id, 
        vehicle_id, 
        shipment_type, 
        tracking_number,
        weight,
        length,
        width,
        height,
        dimension_unit,
        pickup_address, 
        pickup_city, 
        pickup_postal_code, 
        delivery_address, 
        delivery_city, 
        delivery_postal_code, 
        status, 
        quote_amount, 
        created_at,
        updated_at,
        estimated_delivery_time,
        description,
        province,
        invoiceUrl,
        tax_amount,
        total_amount,
        payment_status
      FROM shipments 
      WHERE id = ?`;
    const params = [req.params.id];

    // Add role-based filtering
    switch (req.auth.role) {
      case 'shipper':
        query += ' AND shipper_id = ?';
        params.push(req.auth.id);
        break;
      case 'driver':
        query += ' AND driver_id = ?';
        params.push(req.auth.id);
        break;
      case 'admin':
        // No filter - admin sees all shipments
        break;
      default:
        return res.status(403).json({ error: 'Forbidden' });
    }

    console.log('Executing query:', query);
    console.log('Query parameters:', params);

    const shipment = await get(query, params);
    
    console.log('Query result:', shipment);

    if (!shipment) {
      console.log('No shipment found');
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    // Fill in any null values with appropriate defaults
    const formattedShipment = {
      ...shipment,
      province: shipment.province || null,
      tracking_number: shipment.tracking_number || `MM-${new Date().getFullYear()}-${shipment.id}`,
      updated_at: shipment.updated_at || shipment.created_at
    };
    
    res.json(formattedShipment);
  } catch (error) {
    console.error('Get shipment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update shipment (Role-based restrictions)
app.put('/shipments/:id', async (req, res) => {
  try {
    const shipment = await get('SELECT * FROM shipments WHERE id = ?', [req.params.id]);
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Role-based update restrictions
    switch (req.auth.role) {
      case 'shipper':
        if (shipment.shipper_id !== req.auth.id || shipment.status !== 'pending') {
          return res.status(403).json({ error: 'Forbidden' });
        }
        break;
      case 'driver':
        if (shipment.driver_id !== req.auth.id) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        // Drivers can update package dimensions and status
        const allowedDriverFields = ['status', 'weight', 'length', 'width', 'height', 'dimension_unit', 'description'];
        req.body = Object.fromEntries(
          Object.entries(req.body).filter(([key]) => allowedDriverFields.includes(key))
        );
        break;
      case 'admin':
        // Admins can update anything
        break;
      default:
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Store the original status for comparison
    const oldStatus = shipment.status;
    const newStatus = req.body.status;
    const statusChanged = newStatus && oldStatus !== newStatus;
    
    // Update the updated_at timestamp
    req.body.updated_at = new Date().toISOString();

    const updates = Object.keys(req.body)
      .filter(key => req.body[key] !== undefined)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(req.body).filter(val => val !== undefined), req.params.id];

    await run(`UPDATE shipments SET ${updates} WHERE id = ?`, values);

    // Handle status change notifications and related actions
    if (statusChanged) {
      // Specific status transition logic
      if (newStatus === 'picked_up' && ['assigned', 'out_for_pickup'].includes(oldStatus)) {
        // If package dimensions were not provided during pickup, prompt the user
        if (!shipment.weight && !req.body.weight) {
          console.log(`Driver picked up shipment ${shipment.id} without recording dimensions`);
        }
        
        // Log the timestamp of pickup
        await run(
          'UPDATE shipments SET pickup_timestamp = ? WHERE id = ?',
          [new Date().toISOString(), shipment.id]
        );
      } else if (newStatus === 'delivered' && ['picked_up', 'out_for_delivery'].includes(oldStatus)) {
        // Log the timestamp of delivery
        await run(
          'UPDATE shipments SET delivery_timestamp = ? WHERE id = ?',
          [new Date().toISOString(), shipment.id]
        );
      }

      // Status notification title and message
      let title = 'Shipment Status Update';
      let message = `Your shipment status has been updated to: ${newStatus.replace(/_/g, ' ').toUpperCase()}`;

      switch (newStatus) {
        case 'assigned':
          title = 'Driver Assigned';
          message = 'A driver has been assigned to your shipment.';
          break;
        case 'picked_up':
          title = 'Shipment Picked Up';
          message = 'Your shipment has been picked up by the driver.';
          break;
        case 'out_for_delivery':
          title = 'Out For Delivery';
          message = 'Your shipment is out for delivery.';
          break;
        case 'delivered':
          title = 'Shipment Delivered';
          message = 'Your shipment has been delivered successfully.';
          break;
        case 'cancelled':
          title = 'Shipment Cancelled';
          message = 'Your shipment has been cancelled.';
          break;
      }
      
      // Create the notification
      const notificationId = await createNotification(
        shipment.shipper_id,
        shipment.id,
        title,
        message,
        'status_update'
      );
      
      console.log(`Notification created for shipment ${shipment.id} with ID ${notificationId}`);
    }
    
    // If dimensions were updated, create a notification
    const dimensionFields = ['weight', 'length', 'width', 'height', 'dimension_unit'];
    const dimensionsUpdated = dimensionFields.some(field => req.body[field] !== undefined);
    
    if (dimensionsUpdated) {
      const dimensionInfo = [];
      if (req.body.weight) dimensionInfo.push(`Weight: ${req.body.weight}${req.body.dimension_unit ? req.body.dimension_unit : 'kg'}`);
      if (req.body.length) dimensionInfo.push(`Length: ${req.body.length}${req.body.dimension_unit ? req.body.dimension_unit : 'cm'}`);
      if (req.body.width) dimensionInfo.push(`Width: ${req.body.width}${req.body.dimension_unit ? req.body.dimension_unit : 'cm'}`);
      if (req.body.height) dimensionInfo.push(`Height: ${req.body.height}${req.body.dimension_unit ? req.body.dimension_unit : 'cm'}`);
      
      const title = 'Package Dimensions Updated';
      const message = `Package dimensions have been recorded: ${dimensionInfo.join(', ')}`;
      
      await createNotification(
        shipment.shipper_id,
        shipment.id,
        title,
        message,
        'package_info'
      );
      
      console.log(`Dimension update notification created for shipment ${shipment.id}`);
    }

    res.json({ message: 'Shipment updated' });
  } catch (error) {
    console.error('Update shipment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete shipment (Admin only)
app.delete('/shipments/:id', authorize(['admin']), async (req, res) => {
  try {
    const result = await run('DELETE FROM shipments WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    res.json({ message: 'Shipment deleted' });
  } catch (error) {
    console.error('Delete shipment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all invoices for authenticated shipper
app.get('/api/invoices', authorize(['shipper']), async (req, res) => {
  try {
    // Get the authenticated shipper's ID from the JWT token
    const shipperId = req.auth.id;
    
    // Query shipments with invoices for this shipper
    const query = `
      SELECT 
        id as shipmentId, 
        created_at as date, 
        invoiceUrl
      FROM shipments 
      WHERE shipper_id = ? 
      AND invoiceUrl IS NOT NULL
      ORDER BY created_at DESC
    `;
    
    const invoices = await all(query, [shipperId]);
    
    // Format the response data
    const formattedInvoices = invoices.map(invoice => ({
      shipmentId: invoice.shipmentId,
      date: new Date(invoice.date).toISOString().split('T')[0], // Format date as YYYY-MM-DD
      invoiceUrl: `/invoices/${path.basename(invoice.invoiceUrl)}` // Format URL to be relative to /invoices
    }));
    
    res.json(formattedInvoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to retrieve invoices' });
  }
});

// Client endpoints
// Create client (Shipper only)
app.post('/clients', authorize(['shipper']), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      address,
      city,
      postal_code,
      notes
    } = req.body;

    // Validate required fields
    if (!name || !address || !city || !postal_code || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await run(
      `INSERT INTO clients (
        shipper_id,
        name,
        email,
        phone,
        company,
        address,
        city,
        postal_code,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.auth.id, name, email, phone, company || null, address, city, postal_code, notes || null]
    );

    res.status(201).json({ id: result.id });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shipper's clients (Shipper only)
app.get('/clients', authorize(['shipper']), async (req, res) => {
  try {
    const clients = await all(
      'SELECT * FROM clients WHERE shipper_id = ?',
      [req.auth.id]
    );
    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update client (Shipper only)
app.put('/clients/:id', authorize(['shipper']), async (req, res) => {
  try {
    // Check if client exists and belongs to shipper
    const client = await get(
      'SELECT * FROM clients WHERE id = ? AND shipper_id = ?',
      [req.params.id, req.auth.id]
    );

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const {
      name,
      email,
      phone,
      company,
      address,
      city,
      postal_code,
      notes
    } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (company !== undefined) {
      updates.push('company = ?');
      values.push(company);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city);
    }
    if (postal_code !== undefined) {
      updates.push('postal_code = ?');
      values.push(postal_code);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add id to values array
    values.push(req.params.id);
    values.push(req.auth.id);

    await run(
      `UPDATE clients SET ${updates.join(', ')} 
       WHERE id = ? AND shipper_id = ?`,
      values
    );

    res.json({ message: 'Client updated successfully' });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete client (Shipper only)
app.delete('/clients/:id', authorize(['shipper']), async (req, res) => {
  try {
    const client = await get(
      'SELECT id FROM clients WHERE id = ? AND shipper_id = ?',
      [req.params.id, req.auth.id]
    );

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await run('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ message: 'Client deleted' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Saved Addresses endpoints
// Get all saved addresses for the current shipper
app.get('/addresses', authorize(['shipper']), async (req, res) => {
  try {
    const addresses = await all(
      'SELECT * FROM saved_addresses WHERE shipper_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.auth.id]
    );
    res.json(addresses);
  } catch (error) {
    console.error('Get saved addresses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new saved address
app.post('/addresses', authorize(['shipper']), async (req, res) => {
  try {
    const {
      address_name,
      address,
      city,
      postal_code,
      province,
      is_default,
      is_pickup
    } = req.body;

    // Validate required fields
    if (!address_name || !address || !city || !postal_code || !province) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If this address is set as default, unset any other default addresses of the same type
    if (is_default) {
      await run(
        'UPDATE saved_addresses SET is_default = 0 WHERE shipper_id = ? AND is_pickup = ?',
        [req.auth.id, is_pickup ? 1 : 0]
      );
    }

    const result = await run(
      `INSERT INTO saved_addresses (
        shipper_id,
        address_name,
        address,
        city,
        postal_code,
        province,
        is_default,
        is_pickup
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.auth.id,
        address_name,
        address,
        city,
        postal_code,
        province,
        is_default ? 1 : 0,
        is_pickup !== undefined ? (is_pickup ? 1 : 0) : 1
      ]
    );

    // Get the newly created address
    const newAddress = await get(
      'SELECT * FROM saved_addresses WHERE id = ?',
      [result.id]
    );

    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Create saved address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a saved address
app.put('/addresses/:id', authorize(['shipper']), async (req, res) => {
  try {
    // Check if address exists and belongs to current shipper
    const address = await get(
      'SELECT * FROM saved_addresses WHERE id = ? AND shipper_id = ?',
      [req.params.id, req.auth.id]
    );

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const {
      address_name,
      address: addressText,
      city,
      postal_code,
      province,
      is_default,
      is_pickup
    } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (address_name !== undefined) {
      updates.push('address_name = ?');
      values.push(address_name);
    }

    if (addressText !== undefined) {
      updates.push('address = ?');
      values.push(addressText);
    }

    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city);
    }

    if (postal_code !== undefined) {
      updates.push('postal_code = ?');
      values.push(postal_code);
    }

    if (province !== undefined) {
      updates.push('province = ?');
      values.push(province);
    }

    if (is_pickup !== undefined) {
      updates.push('is_pickup = ?');
      values.push(is_pickup ? 1 : 0);
    }

    if (is_default !== undefined) {
      updates.push('is_default = ?');
      values.push(is_default ? 1 : 0);

      // If setting as default, unset any other default addresses of the same type
      if (is_default) {
        await run(
          'UPDATE saved_addresses SET is_default = 0 WHERE shipper_id = ? AND id != ? AND is_pickup = ?',
          [req.auth.id, req.params.id, address.is_pickup]
        );
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add ID to values array
    values.push(req.params.id);

    // Update address
    await run(
      `UPDATE saved_addresses SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated address
    const updatedAddress = await get(
      'SELECT * FROM saved_addresses WHERE id = ?',
      [req.params.id]
    );

    res.json(updatedAddress);
  } catch (error) {
    console.error('Update saved address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a saved address
app.delete('/addresses/:id', authorize(['shipper']), async (req, res) => {
  try {
    const address = await get(
      'SELECT id FROM saved_addresses WHERE id = ? AND shipper_id = ?',
      [req.params.id, req.auth.id]
    );

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await run('DELETE FROM saved_addresses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Address deleted' });
  } catch (error) {
    console.error('Delete saved address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints
// List all users (Admin only)
app.get('/users', authorize(['admin']), async (req, res) => {
  try {
    const users = await all(
      'SELECT id, username, role, name, email, phone FROM users',
      []
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set shipment quote (Admin only)
app.put('/shipments/:id/quote', authorize(['admin']), async (req, res) => {
  try {
    const { quote_amount } = req.body;

    if (quote_amount === undefined || typeof quote_amount !== 'number' || quote_amount <= 0) {
      return res.status(400).json({ error: 'Valid quote amount is required' });
    }

    const shipment = await get('SELECT * FROM shipments WHERE id = ?', [req.params.id]);
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    await run(
      'UPDATE shipments SET quote_amount = ?, status = ? WHERE id = ?',
      [quote_amount, 'quoted', req.params.id]
    );

    // Create notification for quote
    if (shipment.shipper_id) {
      try {
        // Get shipment details for the notification
        const formattedAmount = quote_amount.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD'
        });
        
        const origin = shipment.pickup_city || 'pickup location';
        const destination = shipment.delivery_city || 'delivery location';
        
        const title = 'Quote Available';
        const message = `A quote of ${formattedAmount} is available for your shipment from ${origin} to ${destination}.`;
        
        // Create notification
        await createNotification(
          shipment.shipper_id,
          shipment.id,
          title,
          message,
          'quote'
        );
      } catch (notifError) {
        console.error('Error creating quote notification:', notifError);
        // Continue processing even if notification fails
      }
    }

    res.json({ 
      message: 'Quote submitted successfully',
      quote_amount: quote_amount,
      shipment_id: req.params.id
    });
  } catch (error) {
    console.error('Error providing quote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve shipment (Admin only)
app.put('/shipments/:id/approve', authorize(['admin']), async (req, res) => {
  try {
    const { driver_id, vehicle_id } = req.body;

    // Validate required fields
    if (!driver_id || !vehicle_id) {
      return res.status(400).json({ error: 'Both driver_id and vehicle_id are required' });
    }

    // Check if shipment exists and has the correct status
    const shipment = await get('SELECT * FROM shipments WHERE id = ?', [req.params.id]);
    
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    if (shipment.status !== 'quoted') {
      return res.status(400).json({ error: 'Only quoted shipments can be approved' });
    }

    // Verify driver exists and is a driver
    const driver = await get('SELECT id, role, username FROM users WHERE id = ? AND role = ?', [driver_id, 'driver']);
    if (!driver) {
      return res.status(400).json({ error: 'Invalid driver_id. User not found or not a driver' });
    }

    // Verify vehicle exists
    const vehicle = await get('SELECT id, type, license_plate FROM vehicles WHERE id = ?', [vehicle_id]);
    if (!vehicle) {
      return res.status(400).json({ error: 'Invalid vehicle_id. Vehicle not found' });
    }

    // Update shipment with driver, vehicle and status
    await run(
      'UPDATE shipments SET status = ?, driver_id = ?, vehicle_id = ? WHERE id = ?',
      ['assigned', driver_id, vehicle_id, req.params.id]
    );

    // Create notification for assignment
    if (shipment.shipper_id) {
      // Get shipment details for the notification
      const shipmentDetail = await get(`
        SELECT s.*, o.name as origin_name, d.name as destination_name 
        FROM shipments s
        LEFT JOIN locations o ON s.origin_id = o.id
        LEFT JOIN locations d ON s.destination_id = d.id
        WHERE s.id = ?`, 
        [req.params.id]
      );
      
      if (shipmentDetail) {
        const title = 'Shipment Assigned';
        const message = `Your shipment from ${shipmentDetail.origin_name} to ${shipmentDetail.destination_name} has been assigned to driver ${driver.username} with vehicle ${vehicle.type} (${vehicle.license_plate}).`;
        
        // Create the notification
        const notificationId = await createNotification(
          shipment.shipper_id,
          shipment.id,
          title,
          message,
          'assignment'
        );
        
        console.log(`Assignment notification created for shipment ${shipment.id} with ID ${notificationId}`);
      }
    }

    res.json({ 
      message: 'Shipment approved and assigned successfully',
      shipment_id: parseInt(req.params.id),
      driver_id: driver_id,
      vehicle_id: vehicle_id,
      status: 'assigned'
    });
  } catch (error) {
    console.error('Approve shipment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Driver endpoints
// List available jobs (Driver only)
app.get('/jobs', authorize(['driver']), async (req, res) => {
  try {
    // If status parameter is provided, filter by that status
    const status = req.query.status;
    
    // Query both shipments and jobs tables to get province information
    let query = `
      SELECT 
        s.id, 
        s.shipper_id, 
        s.driver_id, 
        s.vehicle_id, 
        s.shipment_type, 
        s.pickup_address, 
        s.pickup_city, 
        s.pickup_postal_code, 
        s.delivery_address, 
        s.delivery_city, 
        s.delivery_postal_code, 
        s.status, 
        s.quote_amount, 
        s.created_at,
        COALESCE(j.province, s.province) as province,
        j.id as job_id,
        j.assigned_at,
        j.completed_at
      FROM shipments s
      LEFT JOIN jobs j ON s.id = j.shipment_id
      WHERE 1=1`;
    
    const params = [];
    
    // Filter by status if provided
    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    }
    
    // For available jobs (not assigned to any driver)
    if (!req.query.assigned) {
      query += ` AND s.driver_id IS NULL`;
    }
    
    // For jobs assigned to the current driver
    if (req.query.assigned === 'true') {
      query += ` AND s.driver_id = ?`;
      params.push(req.auth.id);
    }
    
    const jobs = await all(query, params);
    
    // Ensure province is handled gracefully if NULL
    const formattedJobs = jobs.map(job => ({
      ...job,
      province: job.province || null
    }));
    
    res.json(formattedJobs);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new job (Admin only)
app.post('/jobs', authorize(['admin']), async (req, res) => {
  try {
    const {
      shipment_id,
      driver_id,
      status,
      province
    } = req.body;

    // Validate required fields
    if (!shipment_id) {
      return res.status(400).json({ error: 'Shipment ID is required' });
    }

    // Validate province field
    if (!province) {
      return res.status(400).json({ error: 'Province is required' });
    }

    if (!validateProvinceCode(province)) {
      return res.status(400).json({ 
        error: 'Invalid province code. Must be a valid Canadian province or territory code (e.g., AB, BC, ON)' 
      });
    }

    // Check if shipment exists
    const shipment = await get('SELECT id FROM shipments WHERE id = ?', [shipment_id]);
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Check if driver exists (if provided)
    if (driver_id) {
      const driver = await get('SELECT id FROM users WHERE id = ? AND role = ?', [driver_id, 'driver']);
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }
    }

    // Default status if not provided
    const jobStatus = status || 'pending';

    // Insert new job
    const result = await run(
      `INSERT INTO jobs (
        shipment_id,
        driver_id,
        status,
        province,
        assigned_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        shipment_id,
        driver_id || null,
        jobStatus,
        province.toUpperCase(),
        driver_id ? new Date().toISOString() : null
      ]
    );

    res.status(201).json({ 
      id: result.id,
      shipment_id,
      driver_id: driver_id || null,
      status: jobStatus,
      province: province.toUpperCase(),
      assigned_at: driver_id ? new Date().toISOString() : null
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific job by ID (Driver or Admin)
app.get('/jobs/:id', async (req, res) => {
  try {
    // Query both jobs and shipments tables to get complete job information
    let query = `
      SELECT 
        j.id as job_id,
        j.shipment_id,
        j.driver_id,
        j.status as job_status,
        j.assigned_at,
        j.completed_at,
        j.province,
        s.id as shipment_id,
        s.shipper_id,
        s.vehicle_id,
        s.shipment_type,
        s.pickup_address,
        s.pickup_city,
        s.pickup_postal_code,
        s.delivery_address,
        s.delivery_city,
        s.delivery_postal_code,
        s.status as shipment_status,
        s.quote_amount,
        s.created_at
      FROM jobs j
      JOIN shipments s ON j.shipment_id = s.id
      WHERE j.id = ?`;
    
    const params = [req.params.id];

    // Add role-based filtering
    switch (req.auth.role) {
      case 'driver':
        query += ' AND (j.driver_id = ? OR s.driver_id = ?)';
        params.push(req.auth.id, req.auth.id);
        break;
      case 'admin':
        // No filter - admin sees all jobs
        break;
      default:
        return res.status(403).json({ error: 'Forbidden' });
    }

    const job = await get(query, params);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Ensure province is handled gracefully if NULL
    const formattedJob = {
      ...job,
      province: job.province || null
    };

    res.json(formattedJob);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vehicle information for a shipment (Driver only)
app.get('/shipments/:id/vehicle', authorize(['driver']), async (req, res) => {
  try {
    // First check if the driver is assigned to this shipment
    const shipment = await get(
      'SELECT vehicle_id FROM shipments WHERE id = ? AND driver_id = ?',
      [req.params.id, req.auth.id]
    );

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found or not assigned to you' });
    }

    if (!shipment.vehicle_id) {
      return res.status(404).json({ error: 'No vehicle assigned to this shipment' });
    }

    // Get vehicle details
    const vehicle = await get(
      'SELECT id, vehicle_name, license_plate FROM vehicles WHERE id = ?',
      [shipment.vehicle_id]
    );

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Get shipment vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept job (Driver only)
app.put('/jobs/:id/accept', authorize(['driver']), async (req, res) => {
  try {
    // First check if the job is already assigned to this driver
    const alreadyAssigned = await get(
      `SELECT * FROM shipments 
       WHERE id = ? 
       AND status = 'approved' 
       AND driver_id = ?`,
      [req.params.id, req.auth.id]
    );
    
    if (alreadyAssigned) {
      // Job is already assigned to this driver, just update status to 'assigned'
      await run(
        `UPDATE shipments 
         SET status = 'assigned' 
         WHERE id = ?`,
        [req.params.id]
      );
      
      return res.json({ message: 'Job accepted successfully' });
    }
    
    // Check if shipment exists and is available
    const shipment = await get(
      `SELECT * FROM shipments 
       WHERE id = ? 
       AND status = 'approved' 
       AND driver_id IS NULL`,
      [req.params.id]
    );

    if (!shipment) {
      return res.status(404).json({ error: 'Job not found or already taken' });
    }

    // Check if driver already has an active job
    const activeJob = await get(
      `SELECT id FROM shipments 
       WHERE driver_id = ? 
       AND status IN ('assigned', 'picked_up')`,
      [req.auth.id]
    );

    if (activeJob) {
      return res.status(400).json({ error: 'You already have an active job' });
    }

    // Assign job to driver
    await run(
      `UPDATE shipments 
       SET driver_id = ?, status = 'assigned' 
       WHERE id = ?`,
      [req.auth.id, req.params.id]
    );

    res.json({ message: 'Job accepted successfully' });
  } catch (error) {
    console.error('Accept job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update job status (Driver only)
app.put('/jobs/:id/status', authorize(['driver']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['picked_up', 'in_transit', 'delivered'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    // Check if shipment exists and belongs to driver - get all fields
    const shipment = await get(
      `SELECT * FROM shipments 
       WHERE id = ? AND driver_id = ?`,
      [req.params.id, req.auth.id]
    );

    if (!shipment) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Validate status transition
    const validTransitions = {
      assigned: ['picked_up'],
      picked_up: ['in_transit'],
      in_transit: ['delivered']
    };

    if (!validTransitions[shipment.status]?.includes(status)) {
      return res.status(400).json({ 
        error: `Cannot transition from ${shipment.status} to ${status}` 
      });
    }

    // Store previous status for reference
    const previousStatus = shipment.status;

    // Update the status in database
    await run(
      'UPDATE shipments SET status = ? WHERE id = ? AND driver_id = ?',
      [status, req.params.id, req.auth.id]
    );

    console.log(`✅ Successfully updated job #${req.params.id} status from '${previousStatus}' to '${status}'`);

    // If status is "picked_up", generate an invoice
    if (status === 'picked_up') {
      // Fetch complete shipment details with shipper name
      const shipmentDetails = await get(`
        SELECT s.*, u.username as shipper_name, u.email as shipper_email
        FROM shipments s
        JOIN users u ON s.shipper_id = u.id
        WHERE s.id = ?
      `, [req.params.id]);
      
      // Check if invoice already exists
      if (!shipmentDetails.invoiceUrl) {
        try {
          // Calculate taxes based on province
          const baseAmount = shipmentDetails.quote_amount || 0;
          const taxes = calculateTaxes(baseAmount, shipmentDetails.province || 'ON');
          const totalWithTax = baseAmount + taxes.totalTaxAmount;
          
          // Generate the invoice
          const invoicePath = generateInvoiceFromDbData(shipmentDetails);
          
          // Update the shipment record with the invoice URL and tax info
          const relativeInvoicePath = path.relative(__dirname, invoicePath);
          await run(
            'UPDATE shipments SET invoiceUrl = ?, tax_amount = ?, total_amount = ?, payment_status = ? WHERE id = ?',
            [relativeInvoicePath, taxes.totalTaxAmount, totalWithTax, 'unpaid', req.params.id]
          );
          
          console.log(`✅ Generated invoice with tax calculations for shipment #${req.params.id}`);
        } catch (invoiceError) {
          console.error('Error generating invoice:', invoiceError);
          // Continue with status update even if invoice generation fails
        }
      }
    }

    // Fetch the updated shipment to return as response
    const updatedShipment = await get(
      `SELECT 
        id, 
        shipper_id, 
        driver_id, 
        vehicle_id, 
        shipment_type, 
        pickup_address, 
        pickup_city, 
        pickup_postal_code, 
        delivery_address, 
        delivery_city, 
        delivery_postal_code, 
        status, 
        quote_amount, 
        created_at,
        province
      FROM shipments 
      WHERE id = ?`,
      [req.params.id]
    );
    
    // Format response as JobDTO
    const jobResponse = {
      id: updatedShipment.id,
      shipperId: updatedShipment.shipper_id,
      driverId: updatedShipment.driver_id,
      vehicleId: updatedShipment.vehicle_id,
      shipmentType: updatedShipment.shipment_type,
      pickupAddress: updatedShipment.pickup_address,
      pickupCity: updatedShipment.pickup_city,
      pickupPostalCode: updatedShipment.pickup_postal_code,
      deliveryAddress: updatedShipment.delivery_address,
      deliveryCity: updatedShipment.delivery_city,
      deliveryPostalCode: updatedShipment.delivery_postal_code,
      status: updatedShipment.status, // This should now be the new status
      quoteAmount: updatedShipment.quote_amount,
      createdAt: updatedShipment.created_at,
      province: updatedShipment.province,
      // Add extra fields to make status change more explicit
      statusChanged: true,
      previousStatus: previousStatus,
      message: `Job status updated from '${previousStatus}' to '${status}'`
    };
    
    // Return the updated job with the status change explicitly highlighted
    res.json(jobResponse);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate shipping label PDF for a shipment
app.get('/shipments/:id/label', async (req, res) => {
  try {
    // First, fetch shipment with role-based access control
    let query = `
      SELECT s.*, 
             u.username as shipper_name
      FROM shipments s
      JOIN users u ON s.shipper_id = u.id
      WHERE s.id = ?`;
    
    const params = [req.params.id];

    // Add role-based filtering
    switch (req.auth.role) {
      case 'shipper':
        query += ' AND s.shipper_id = ?';
        params.push(req.auth.id);
        break;
      case 'driver':
        query += ' AND s.driver_id = ?';
        params.push(req.auth.id);
        break;
      case 'admin':
        // No filter - admin sees all shipments
        break;
      default:
        return res.status(403).json({ error: 'Forbidden' });
    }

    const shipment = await get(query, params);

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Generate a tracking number based on shipment ID
    const trackingNumber = `MML${shipment.id.toString().padStart(6, '0')}`;

    // Format addresses safely (handle missing fields)
    const pickupAddress = shipment.pickup_address || 'N/A';
    const pickupCity = shipment.pickup_city || 'N/A';
    const pickupPostal = shipment.pickup_postal_code || 'N/A';
    const shipperAddress = `${pickupAddress}, ${pickupCity}, ${pickupPostal}`;
    
    const deliveryAddress = shipment.delivery_address || 'N/A';
    const deliveryCity = shipment.delivery_city || 'N/A';
    const deliveryPostal = shipment.delivery_postal_code || 'N/A';
    const recipientAddress = `${deliveryAddress}, ${deliveryCity}, ${deliveryPostal}`;

    // Generate QR code as a data URL
    const qrCodeDataURL = await QRCode.toDataURL(`https://courier-platform.com/track/${shipment.id}`, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200
    });

    // Create a new PDF document with a smaller margin for shipping labels
    const doc = new PDFDocument({ 
      margin: 30,
      size: [612, 792], // Standard US Letter size
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=shipment-${shipment.id}-label.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);

    // Define colors
    const primaryColor = '#3b82f6'; // Blue
    const secondaryColor = '#1e293b'; // Dark blue/gray
    const accentColor = '#f59e0b'; // Amber
    const lightGray = '#f1f5f9';
    const greenColor = '#10b981'; // Green for eco-friendly badge
    
    // Add a styled border to the page
    doc.rect(15, 15, doc.page.width - 30, doc.page.height - 30)
       .lineWidth(2)
       .stroke('#1e293b');

    // Service Level Banner
    const serviceLevel = (shipment.shipment_type || 'standard').toUpperCase();
    doc.rect(30, 30, 300, 30)
       .fill(primaryColor);
    
    doc.fill('#FFFFFF')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(serviceLevel, 30, 38, { width: 300, align: 'center' });

    // Company Logo and Info
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fill(primaryColor)
       .text('MOVING MOUNTAINS', doc.page.width - 200, 30, { align: 'right' });
    
    doc.fontSize(8)
       .font('Helvetica')
       .text('Moving Mountains Logistics', doc.page.width - 200, 45, { align: 'right' });
    
    doc.text('Delivering Above & Beyond', doc.page.width - 200, 55, { align: 'right' });

    // Draw a simple mountain logo
    doc.save()
       .moveTo(doc.page.width - 220, 40)
       .lineTo(doc.page.width - 210, 25)
       .lineTo(doc.page.width - 200, 40)
       .fill(primaryColor);

    // Address Section
    // FROM Section
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fill(primaryColor)
       .text('FROM:', 30, 80);
    
    doc.fontSize(9)
       .font('Helvetica')
       .fill('#000000')
       .text(shipment.shipper_name || 'Shipper', 30, 95)
       .text('Moving Mountains Logistics', 30, 110)
       .text(pickupAddress, 30, 125)
       .text(`${pickupCity}, ${pickupPostal}`, 30, 140)
       .text('USA', 30, 155);

    // TO Section
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fill(primaryColor)
       .text('TO:', doc.page.width / 2, 80);
    
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fill('#000000')
       .text('Recipient', doc.page.width / 2, 95)
       .text(deliveryAddress, doc.page.width / 2, 110)
       .text(`${deliveryCity}, ${deliveryPostal}`, doc.page.width / 2, 125)
       .text('USA', doc.page.width / 2, 140);

    // Package Details
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .text('Weight:', 30, 180);
    
    doc.font('Helvetica')
       .text(shipment.weight ? `${shipment.weight} kg` : 'N/A', 80, 180);
    
    doc.font('Helvetica-Bold')
       .text('Route:', 30, 195);
    
    doc.font('Helvetica')
       .text('EA-5', 80, 195);
    
    doc.font('Helvetica-Bold')
       .text('Dimensions:', doc.page.width / 2, 180);
    
    const dimensions = shipment.length && shipment.width && shipment.height ? 
      `${shipment.length}×${shipment.width}×${shipment.height} in` : 'N/A';
    
    doc.font('Helvetica')
       .text(dimensions, doc.page.width / 2 + 70, 180);
    
    doc.font('Helvetica-Bold')
       .text('Zone:', doc.page.width / 2, 195);
    
    doc.font('Helvetica')
       .text('NE-2', doc.page.width / 2 + 70, 195);

    // QR Code Tracking Section
    doc.image(qrCodeDataURL, 200, 220, { width: 100 });
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('SCAN TO TRACK', 310, 230);
    
    doc.fontSize(9)
       .font('Courier')
       .text(trackingNumber, 310, 245);
    
    doc.fontSize(8)
       .font('Helvetica')
       .text('Scan with your phone\'s', 310, 265)
       .text('camera to track package', 310, 280);

    // Special Instructions
    if (shipment.is_fragile || shipment.requires_refrigeration) {
      doc.rect(30, 330, doc.page.width - 60, 40)
         .lineWidth(1)
         .stroke('#64748b');
      
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('SPECIAL INSTRUCTIONS:', 40, 340);
      
      let instructions = '';
      if (shipment.is_fragile) {
        instructions += 'FRAGILE - Handle with care';
      }
      if (shipment.requires_refrigeration) {
        if (instructions) instructions += ', ';
        instructions += 'KEEP REFRIGERATED';
      }
      
      doc.font('Helvetica')
         .text(instructions, 40, 355);
    }

    // Bottom row with dates and eco-friendly badge
    const shipDate = shipment.created_at ? 
      new Date(shipment.created_at).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0];
    
    doc.fontSize(9)
       .font('Helvetica')
       .text(`Ship Date: ${shipDate}`, 30, 400);
    
    // Eco-friendly badge
    doc.rect(30, 415, 10, 10)
       .fill(greenColor);
    
    doc.fill(greenColor)
       .text('Mountain Pass Eco-Friendly', 45, 415);

    // Small QR code in bottom corner
    doc.image(qrCodeDataURL, doc.page.width - 70, 390, { width: 50 });

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating shipping label:', error);
    res.status(500).json({ error: 'Error generating shipping label' });
  }
});

// Debug endpoint to check users (remove in production)
app.get('/api/public/debug/users', async (req, res) => {
  try {
    const users = await all('SELECT username, role FROM users', []);
    res.json({ count: users.length, users });
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Courier Platform API' });
});

// Vehicle Management Endpoints (Admin only)
// Create a new vehicle (Admin only)
app.post('/vehicles', authorize(['admin']), async (req, res) => {
  try {
    const { vehicle_name, license_plate } = req.body;

    // Validate required fields
    if (!vehicle_name || !license_plate) {
      return res.status(400).json({ error: 'Vehicle name and license plate are required' });
    }

    // Check if license plate already exists
    const existingVehicle = await get('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate]);
    if (existingVehicle) {
      return res.status(400).json({ error: 'A vehicle with this license plate already exists' });
    }

    // Insert new vehicle
    const result = await run(
      'INSERT INTO vehicles (vehicle_name, license_plate) VALUES (?, ?)',
      [vehicle_name, license_plate]
    );

    res.status(201).json({ id: result.id, vehicle_name, license_plate });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all vehicles (Admin only)
app.get('/vehicles', authorize(['admin']), async (req, res) => {
  try {
    const vehicles = await all('SELECT * FROM vehicles', []);
    res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a vehicle (Admin only)
app.put('/vehicles/:id', authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_name, license_plate } = req.body;

    // Validate required fields
    if (!vehicle_name && !license_plate) {
      return res.status(400).json({ error: 'At least one field (vehicle_name or license_plate) must be provided' });
    }

    // Check if vehicle exists
    const vehicle = await get('SELECT id FROM vehicles WHERE id = ?', [id]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check if license plate already exists (if updating license plate)
    if (license_plate) {
      const existingVehicle = await get('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?', [license_plate, id]);
      if (existingVehicle) {
        return res.status(400).json({ error: 'A vehicle with this license plate already exists' });
      }
    }

    // Update vehicle
    let query = 'UPDATE vehicles SET ';
    const params = [];

    if (vehicle_name) {
      query += 'vehicle_name = ?';
      params.push(vehicle_name);
    }

    if (license_plate) {
      if (vehicle_name) query += ', ';
      query += 'license_plate = ?';
      params.push(license_plate);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await run(query, params);

    res.json({ 
      message: 'Vehicle updated successfully',
      id: parseInt(id),
      ...(vehicle_name && { vehicle_name }),
      ...(license_plate && { license_plate })
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a vehicle (Admin only)
app.delete('/vehicles/:id', authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vehicle exists
    const vehicle = await get('SELECT id FROM vehicles WHERE id = ?', [id]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check if vehicle is assigned to any shipments
    const assignedShipment = await get('SELECT id FROM shipments WHERE vehicle_id = ?', [id]);
    if (assignedShipment) {
      return res.status(400).json({ error: 'Cannot delete vehicle that is assigned to shipments' });
    }

    // Delete vehicle
    await run('DELETE FROM vehicles WHERE id = ?', [id]);

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API Health Check
app.get('/api-health', (req, res) => {
  res.json({ status: 'ok', message: 'API is healthy', timestamp: new Date().toISOString() });
});

// Generate and serve invoice for a shipment
app.get('/shipments/:id/invoice', async (req, res) => {
  try {
    console.log('Generating invoice for shipment:', req.params.id);
    
    // First, fetch shipment with role-based access control
    let query = `
      SELECT s.*, 
             u.username as shipper_name
      FROM shipments s
      JOIN users u ON s.shipper_id = u.id
      WHERE s.id = ?`;
    
    const params = [req.params.id];

    // Add role-based filtering
    switch (req.auth.role) {
      case 'shipper':
        query += ' AND s.shipper_id = ?';
        params.push(req.auth.id);
        break;
      case 'driver':
        query += ' AND s.driver_id = ?';
        params.push(req.auth.id);
        break;
      case 'admin':
        // No filter - admin sees all shipments
        break;
      default:
        return res.status(403).json({ error: 'Forbidden' });
    }

    const shipment = await get(query, params);
    
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    // Check if invoice already exists
    if (shipment.invoiceUrl) {
      const existingInvoicePath = path.resolve(__dirname, shipment.invoiceUrl);
      if (fs.existsSync(existingInvoicePath)) {
        // Return existing invoice
        return res.sendFile(existingInvoicePath);
      }
    }
    
    // Calculate taxes based on province
    const baseAmount = shipment.quote_amount || 0;
    const taxes = calculateTaxes(baseAmount, shipment.province || 'ON');
    const totalWithTax = baseAmount + taxes.totalTaxAmount;
    
    // Generate the invoice
    const invoicePath = generateInvoiceFromDbData(shipment);
    
    // Update the shipment record with the invoice URL and tax info
    const relativeInvoicePath = path.relative(__dirname, invoicePath);
    await run(
      'UPDATE shipments SET invoiceUrl = ?, tax_amount = ?, total_amount = ?, payment_status = ? WHERE id = ?',
      [relativeInvoicePath, taxes.totalTaxAmount, totalWithTax, 'unpaid', shipment.id]
    );
    
    // Send the invoice file
    res.sendFile(invoicePath);
  } catch (err) {
    console.error('Error generating invoice:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// Notification endpoints
// Get notifications for authenticated shipper
app.get('/api/notifications', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  try {
    // Only allow shippers to access their notifications
    if (req.auth.role !== 'shipper') {
      return res.status(403).json({ error: 'Access denied. Only shippers can access notifications.' });
    }
    
    const unreadOnly = req.query.unread === 'true';
    const limit = parseInt(req.query.limit) || 50;
    
    const notifications = await getNotifications(req.auth.id, unreadOnly, limit);
    
    // Count unread notifications
    const unreadCount = await get(
      'SELECT COUNT(*) as count FROM notifications WHERE shipper_id = ? AND is_read = 0',
      [req.auth.id]
    );
    
    res.json({
      notifications,
      unread_count: unreadCount ? unreadCount.count : 0
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notifications as read
app.put('/api/notifications/read', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  try {
    // Only allow shippers to access their notifications
    if (req.auth.role !== 'shipper') {
      return res.status(403).json({ error: 'Access denied. Only shippers can access notifications.' });
    }
    
    const { notification_ids } = req.body;
    
    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return res.status(400).json({ error: 'Invalid notification IDs' });
    }
    
    const success = await markNotificationsAsRead(req.auth.id, notification_ids);
    
    if (success) {
      res.json({ message: 'Notifications marked as read' });
    } else {
      res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  try {
    // Only allow shippers to access their notifications
    if (req.auth.role !== 'shipper') {
      return res.status(403).json({ error: 'Access denied. Only shippers can access notifications.' });
    }
    
    await run(
      'UPDATE notifications SET is_read = 1 WHERE shipper_id = ?',
      [req.auth.id]
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread notification count only
app.get('/api/notifications/count', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  try {
    // Only allow shippers to access their notifications
    if (req.auth.role !== 'shipper') {
      return res.status(403).json({ error: 'Access denied. Only shippers can access notifications.' });
    }
    
    const unreadCount = await get(
      'SELECT COUNT(*) as count FROM notifications WHERE shipper_id = ? AND is_read = 0',
      [req.auth.id]
    );
    
    res.json({ unread_count: unreadCount ? unreadCount.count : 0 });
  } catch (error) {
    console.error('Get notification count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile update endpoint
app.put('/users/profile', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  try {
    const userId = req.auth.id;
    const { name, email, phone } = req.body;

    // Update user profile
    await run(
      'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?',
      [name, email, phone, userId]
    );

    // Get updated user data
    const updatedUser = await get('SELECT id, username, role, name, email, phone FROM users WHERE id = ?', [userId]);
    
    // Generate new token with updated information
    const token = jsonwebtoken.sign(
      { 
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        name: updatedUser.name || updatedUser.username,
        email: updatedUser.email || ''
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      message: 'Profile updated successfully',
      token
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'An error occurred while updating profile' });
  }
});

// Admin only routes for managing users
// Get user by ID (Admin only)
app.get('/users/:id', authorize(['admin']), async (req, res) => {
  try {
    const user = await get(
      'SELECT id, username, role, name, email, phone FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user by ID (Admin only)
app.put('/users/:id', authorize(['admin']), async (req, res) => {
  try {
    const { username, password, role, name, email, phone } = req.body;
    
    // Check if user exists
    const user = await get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if username is being changed and if it's already taken
    if (username) {
      const existingUser = await get(
        'SELECT id FROM users WHERE username = ? AND id != ?', 
        [username, req.params.id]
      );
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }
    
    if (role) {
      if (!['shipper', 'admin', 'driver'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push('role = ?');
      values.push(role);
    }
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Add id to values array
    values.push(req.params.id);
    
    // Update user
    await run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    // Get updated user data
    const updatedUser = await get(
      'SELECT id, username, role, name, email, phone FROM users WHERE id = ?',
      [req.params.id]
    );
    
    res.json({ 
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user by ID (Admin only)
app.delete('/users/:id', authorize(['admin']), async (req, res) => {
  try {
    // Check if user exists
    const user = await get('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deleting admin users 
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }
    
    // Delete user
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoice details with tax breakdown
app.get('/api/shipments/:id/invoice-details', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  try {
    // Check shipment access based on role
    let query = `
      SELECT s.*, u.username as shipper_name
      FROM shipments s
      JOIN users u ON s.shipper_id = u.id
      WHERE s.id = ?
    `;
    const params = [req.params.id];
    
    // Add role-based filtering
    switch (req.auth.role) {
      case 'shipper':
        query += ' AND s.shipper_id = ?';
        params.push(req.auth.id);
        break;
      case 'admin':
        // No filter - admin sees all shipments
        break;
      default:
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    const shipment = await get(query, params);
    
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    // Calculate taxes if needed
    let taxInfo = {};
    if (shipment.tax_amount) {
      // Use stored tax amount
      taxInfo = {
        totalTaxAmount: shipment.tax_amount
      };
    } else {
      // Calculate taxes on the fly
      const baseAmount = shipment.quote_amount || 0;
      taxInfo = calculateTaxes(baseAmount, shipment.province || 'ON');
    }
    
    // Format response
    const invoiceDetails = {
      shipment_id: shipment.id,
      invoice_number: `MML-${shipment.id}`,
      date_issued: shipment.created_at,
      shipper_name: shipment.shipper_name,
      base_amount: shipment.quote_amount || 0,
      tax_amount: taxInfo.totalTaxAmount,
      total_amount: shipment.total_amount || (shipment.quote_amount + taxInfo.totalTaxAmount),
      payment_status: shipment.payment_status || 'unpaid',
      invoice_url: shipment.invoiceUrl ? `/invoices/${path.basename(shipment.invoiceUrl)}` : null,
      tax_breakdown: {
        gst: taxInfo.gst,
        pst: taxInfo.pst,
        qst: taxInfo.qst,
        hst: taxInfo.hst
      }
    };
    
    res.json(invoiceDetails);
  } catch (error) {
    console.error('Error getting invoice details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add route to mark invoice as paid (admin only)
app.put('/api/shipments/:id/mark-paid', authorize(['admin']), async (req, res) => {
  try {
    const shipment = await get('SELECT * FROM shipments WHERE id = ?', [req.params.id]);
    
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    await run(
      'UPDATE shipments SET payment_status = ? WHERE id = ?',
      ['paid', req.params.id]
    );
    
    res.json({ message: 'Invoice marked as paid' });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Special endpoint to check if admin setup is allowed
app.get('/admin/setup/status', async (req, res) => {
  try {
    // Check if any admin users already exist
    const existingAdmins = await all('SELECT id FROM users WHERE role = ?', ['admin']);
    
    // Setup is allowed only if no admins exist
    const canSetup = !existingAdmins || existingAdmins.length === 0;
    
    res.json({ 
      canSetup,
      message: canSetup ? 
        'No admin accounts exist. Setup is allowed.' : 
        'Admin accounts already exist. Setup is not allowed.'
    });
  } catch (error) {
    console.error('Error checking admin setup status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Special endpoint to create the first admin account (can only be used when no admins exist)
app.post('/admin/setup', async (req, res) => {
  try {
    // Check if any admin users already exist
    const existingAdmins = await all('SELECT id FROM users WHERE role = ?', ['admin']);
    
    if (existingAdmins && existingAdmins.length > 0) {
      console.log('Admin setup attempted but admins already exist');
      return res.status(403).json({ 
        error: 'Admin accounts already exist',
        message: 'This endpoint can only be used when no admin accounts exist in the system.'
      });
    }
    
    const { username, password, name } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if username is already taken
    const existingUser = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Hash password and create admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const displayName = name || username;
    
    await run(
      'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, 'admin', displayName]
    );
    
    console.log(`✅ First admin account created: ${username}`);
    res.status(201).json({ 
      message: 'First admin account created successfully',
      username,
      role: 'admin'
    });
  } catch (error) {
    console.error('Error creating first admin account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint to manage users (requires admin role)
app.get('/admin/users', authorize(['admin']), async (req, res) => {
  try {
    // Get all users from database
    const users = await all('SELECT id, username, role, name FROM users');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint to get dashboard data
app.get('/admin/dashboard', authorize(['admin']), async (req, res) => {
  try {
    // Get counts from database
    const [
      totalShipments,
      pendingShipments,
      activeShipments,
      completedShipments,
      totalDrivers,
      totalVehicles,
      recentShipments
    ] = await Promise.all([
      get('SELECT COUNT(*) as count FROM shipments'),
      get('SELECT COUNT(*) as count FROM shipments WHERE status IN ("pending", "quote_requested", "quote_provided")'),
      get('SELECT COUNT(*) as count FROM shipments WHERE status IN ("assigned", "picked_up", "in_transit")'),
      get('SELECT COUNT(*) as count FROM shipments WHERE status = "delivered"'),
      get('SELECT COUNT(*) as count FROM users WHERE role = "driver"'),
      get('SELECT COUNT(*) as count FROM vehicles'),
      all(`SELECT 
        s.id, s.tracking_number, s.status, s.created_at, 
        u_shipper.name as shipper_name, 
        u_driver.name as driver_name 
      FROM shipments s
      LEFT JOIN users u_shipper ON s.shipper_id = u_shipper.id
      LEFT JOIN users u_driver ON s.driver_id = u_driver.id
      ORDER BY s.created_at DESC LIMIT 5`)
    ]);
    
    res.json({
      counts: {
        totalShipments: totalShipments.count,
        pendingShipments: pendingShipments.count,
        activeShipments: activeShipments.count,
        completedShipments: completedShipments.count,
        totalDrivers: totalDrivers.count,
        totalVehicles: totalVehicles.count
      },
      recentShipments
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================================
// DATABASE PROXY API ENDPOINTS
// =====================================================
// These endpoints are used by the database-proxy.js module to redirect
// database operations to the Render server when in development mode

// Security middleware to ensure only authorized clients can access these endpoints
const databaseProxyAuth = (req, res, next) => {
  // In production, we would use more secure authentication
  // For dev purposes, we'll use a simple header check
  const isProxy = req.headers['x-database-proxy'] === 'true';
  
  if (!isProxy) {
    return res.status(403).json({ error: 'Unauthorized access to database proxy API' });
  }
  
  next();
};

// Run a SQL query
app.post('/db/run', databaseProxyAuth, async (req, res) => {
  const { sql, params = [] } = req.body;
  
  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required' });
  }
  
  try {
    const result = await run(sql, params);
    res.json(result);
  } catch (error) {
    console.error('Database proxy error (run):', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single row
app.post('/db/get', databaseProxyAuth, async (req, res) => {
  const { sql, params = [] } = req.body;
  
  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required' });
  }
  
  try {
    const result = await get(sql, params);
    res.json(result || null);
  } catch (error) {
    console.error('Database proxy error (get):', error);
    res.status(500).json({ error: error.message });
  }
});

// Get multiple rows
app.post('/db/all', databaseProxyAuth, async (req, res) => {
  const { sql, params = [] } = req.body;
  
  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required' });
  }
  
  try {
    const result = await all(sql, params);
    res.json(result || []);
  } catch (error) {
    console.error('Database proxy error (all):', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute multiple SQL statements
app.post('/db/exec', databaseProxyAuth, async (req, res) => {
  const { sql } = req.body;
  
  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required' });
  }
  
  try {
    db.exec(sql, (err) => {
      if (err) {
        console.error('Database proxy error (exec):', err);
        res.status(500).json({ error: err.message });
      } else {
        res.json({ success: true });
      }
    });
  } catch (error) {
    console.error('Database proxy error (exec):', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📚 API Documentation available at http://localhost:${port}/api-docs`);
});

// Get all clients for a specific shipper (Admin only)
app.get('/admin/shippers/:id/clients', authorize(['admin']), async (req, res) => {
  try {
    // Verify the shipper exists first
    const shipper = await get(
      'SELECT id, username FROM users WHERE id = ? AND role = "shipper"',
      [req.params.id]
    );
    
    if (!shipper) {
      return res.status(404).json({ error: 'Shipper not found' });
    }
    
    // Fetch all clients for this shipper
    const clients = await all(
      'SELECT * FROM clients WHERE shipper_id = ?',
      [req.params.id]
    );
    
    res.json(clients);
  } catch (error) {
    console.error('Get shipper clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all saved addresses for a specific shipper (Admin only)
app.get('/admin/shippers/:id/addresses', authorize(['admin']), async (req, res) => {
  try {
    // Verify the shipper exists first
    const shipper = await get(
      'SELECT id, username FROM users WHERE id = ? AND role = "shipper"',
      [req.params.id]
    );
    
    if (!shipper) {
      return res.status(404).json({ error: 'Shipper not found' });
    }
    
    // Fetch all saved addresses for this shipper
    const addresses = await all(
      'SELECT * FROM saved_addresses WHERE shipper_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.params.id]
    );
    
    res.json(addresses);
  } catch (error) {
    console.error('Get shipper addresses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint for Supabase connectivity
app.get('/api/test-db', async (req, res) => {
  try {
    // Try to query the Supabase database
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: error.message,
        supabaseUrl: process.env.SUPABASE_URL ? 'Configured' : 'Missing'
      });
    }
    
    res.json({ 
      status: 'ok', 
      message: 'Supabase connection successful',
      data: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Add this public endpoint before the JWT middleware
// Public test endpoint for Supabase connectivity (no auth required)
app.get('/api/public-test-db', async (req, res) => {
  try {
    console.log('Testing Supabase public connection...');
    console.log('Supabase URL configured:', !!process.env.SUPABASE_URL);
    console.log('Supabase Key configured:', !!process.env.SUPABASE_KEY);
    
    // Try to query the Supabase database
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: error.message,
        errorCode: error.code,
        hint: error.code === 'PGRST301' ? 'You may be using an anon key instead of service_role key' : null,
        supabaseUrl: process.env.SUPABASE_URL ? 'Configured' : 'Missing'
      });
    }
    
    res.json({ 
      status: 'ok', 
      message: 'Supabase connection successful',
      data: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Add a test Supabase endpoint
app.get('/api/test-supabase', async (req, res) => {
  try {
    console.log('Testing Supabase connection...');
    
    if (!supabase) {
      return res.status(500).json({ 
        error: 'Supabase client not initialized',
        message: 'Check your environment variables: SUPABASE_URL and SUPABASE_KEY'
      });
    }
    
    // Simple test query
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return res.status(500).json({ 
        error: 'Supabase connection failed', 
        message: error.message,
        details: error
      });
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Supabase connection successful!',
      data: data
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return res.status(500).json({ 
      error: 'Unexpected error', 
      message: error.message,
      stack: error.stack
    });
  }
});

// Add debug endpoint for user operations
app.get('/api/debug-users', async (req, res) => {
  try {
    console.log('Debugging user operations...');
    
    // Test direct Supabase query
    const { data: supabaseUsers, error: supabaseError } = await supabase.from('users').select('*');
    
    // Test SQL execute function with our database wrapper
    let sqlUsers = null;
    let sqlError = null;
    try {
      sqlUsers = await all('SELECT * FROM users LIMIT 5');
    } catch (err) {
      sqlError = err;
    }
    
    return res.status(200).json({
      supabase_direct: {
        success: !supabaseError,
        error: supabaseError ? supabaseError.message : null,
        user_count: supabaseUsers ? supabaseUsers.length : 0,
        sample: supabaseUsers && supabaseUsers.length > 0 ? 
          supabaseUsers.map(u => ({ id: u.id, username: u.username, role: u.role })) : []
      },
      database_wrapper: {
        success: !sqlError,
        error: sqlError ? sqlError.message : null,
        user_count: sqlUsers ? sqlUsers.length : 0,
        sample: sqlUsers && sqlUsers.length > 0 ? 
          sqlUsers.map(u => ({ id: u.id, username: u.username, role: u.role })) : []
      }
    });
    
  } catch (error) {
    console.error('Debug users error:', error);
    return res.status(500).json({ 
      error: 'Debug error', 
      message: error.message 
    });
  }
});

// Add debug endpoint for direct login
app.post('/api/debug-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    console.log('Debug login attempt:', { username });
    
    // Method 1: Try direct Supabase query to get the user
    const { data: supabaseUser, error: supabaseError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .limit(1)
      .single();
    
    // Method 2: Try through database wrapper
    let wrapperUser = null;
    let wrapperError = null;
    try {
      wrapperUser = await get('SELECT * FROM users WHERE username = ?', [username]);
    } catch (err) {
      wrapperError = err;
    }
    
    let loginResult = {
      success: false,
      message: 'Login failed'
    };
    
    // Try to verify with supabase user
    if (supabaseUser) {
      try {
        const supabasePasswordValid = await bcrypt.compare(password, supabaseUser.password);
        if (supabasePasswordValid) {
          loginResult = {
            success: true,
            message: 'Login successful with Supabase user',
            user: {
              id: supabaseUser.id,
              username: supabaseUser.username,
              role: supabaseUser.role
            }
          };
        }
      } catch (bcryptError) {
        console.error('Bcrypt error with Supabase user:', bcryptError);
      }
    }
    
    // Try to verify with wrapper user if Supabase direct didn't work
    if (!loginResult.success && wrapperUser) {
      try {
        const wrapperPasswordValid = await bcrypt.compare(password, wrapperUser.password);
        if (wrapperPasswordValid) {
          loginResult = {
            success: true,
            message: 'Login successful with wrapper user',
            user: {
              id: wrapperUser.id,
              username: wrapperUser.username,
              role: wrapperUser.role
            }
          };
        }
      } catch (bcryptError) {
        console.error('Bcrypt error with wrapper user:', bcryptError);
      }
    }
    
    // Return detailed debug information
    return res.status(200).json({
      login_result: loginResult,
      supabase_user: {
        found: !!supabaseUser,
        error: supabaseError ? supabaseError.message : null,
        user: supabaseUser ? {
          id: supabaseUser.id,
          username: supabaseUser.username,
          role: supabaseUser.role,
          password_hash_sample: supabaseUser.password ? supabaseUser.password.substring(0, 10) + '...' : null
        } : null
      },
      wrapper_user: {
        found: !!wrapperUser,
        error: wrapperError ? wrapperError.message : null,
        user: wrapperUser ? {
          id: wrapperUser.id,
          username: wrapperUser.username,
          role: wrapperUser.role,
          password_hash_sample: wrapperUser.password ? wrapperUser.password.substring(0, 10) + '...' : null
        } : null
      }
    });
  } catch (error) {
    console.error('Debug login error:', error);
    return res.status(500).json({ 
      error: 'Debug login error', 
      message: error.message 
    });
  }
});