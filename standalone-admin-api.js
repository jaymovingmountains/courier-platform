require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('cross-fetch');
const cors = require('cors');
global.fetch = fetch;

// Create a separate Express app for admin API
const app = express();
const port = process.env.ADMIN_API_PORT || 3002;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all routes
app.use(cors({
  origin: '*', // Allow all origins - adjust this for production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-portal'],
}));

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: fetch,
  }
});

// Create admin user endpoint
app.post('/create-admin', async (req, res) => {
  try {
    console.log('Creating admin user from standalone API...');
    
    const { username = 'admin', password = 'admin123', name = 'System Admin' } = req.body;
    
    // Create hashed password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if admin already exists
    const { data: existingAdmins, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');
      
    if (checkError) {
      console.error('Error checking for existing admins:', checkError);
      return res.status(500).json({
        error: 'Database error',
        details: checkError.message
      });
    }
    
    if (existingAdmins && existingAdmins.length > 0) {
      console.log('Admins already exist:', existingAdmins.length);
    }
    
    // Try direct Supabase insert
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

// Admin login endpoint
app.post('/admin-login', async (req, res) => {
  try {
    console.log('Admin login attempt from standalone API...');
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Get admin user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('role', 'admin')
      .limit(1)
      .single();
    
    if (error || !user) {
      console.log('Admin login failed: User not found');
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      console.log('Admin login failed: Invalid password');
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    console.log('Admin login successful:', { 
      username: user.username, 
      role: user.role
    });
    
    // Return admin user info
    res.json({ 
      message: 'Admin login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'An error occurred during admin login' });
  }
});

// Test Supabase connection
app.get('/test-connection', async (req, res) => {
  try {
    console.log('Testing Supabase connection from standalone API...');
    
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: error.message
      });
    }
    
    res.json({ 
      status: 'ok', 
      message: 'Supabase connection successful',
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

// List all users endpoint - keeping for backward compatibility
app.get('/list-users', async (req, res) => {
  try {
    console.log('Listing users from standalone API...');
    
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

// New /users endpoint that matches what the frontend expects
app.get('/users', async (req, res) => {
  try {
    console.log('Fetching users from standalone API...');
    
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
    
    // Return data directly as an array, which is what the frontend expects
    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a mock shipments endpoint to make the dashboard work better
app.get('/shipments', async (req, res) => {
  try {
    console.log('Fetching shipments from standalone API (mock data)...');
    
    // Try to get real shipments from database first
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .order('id');
    
    if (!error && data && data.length > 0) {
      console.log(`Found ${data.length} real shipments in database`);
      return res.json(data);
    }
    
    // If no real data, return mock shipments
    console.log('No shipments found in database, returning mock data');
    
    const mockShipments = [
      {
        id: 1,
        shipper_id: 2,
        driver_id: 3,
        shipment_type: 'Standard',
        tracking_number: 'MM-2023-001',
        pickup_address: '123 Main St, Toronto, ON',
        delivery_address: '456 Queen St, Vancouver, BC',
        status: 'delivered',
        quote_amount: 250.00,
        created_at: new Date('2023-11-01').toISOString(),
        updated_at: new Date('2023-11-03').toISOString()
      },
      {
        id: 2,
        shipper_id: 2,
        driver_id: 3,
        shipment_type: 'Express',
        tracking_number: 'MM-2023-002',
        pickup_address: '789 King St, Montreal, QC',
        delivery_address: '101 First Ave, Calgary, AB',
        status: 'in_transit',
        quote_amount: 350.00,
        created_at: new Date('2023-11-05').toISOString(),
        updated_at: new Date('2023-11-06').toISOString()
      },
      {
        id: 3,
        shipper_id: 4,
        driver_id: null,
        shipment_type: 'Standard',
        tracking_number: 'MM-2023-003',
        pickup_address: '202 Second St, Ottawa, ON',
        delivery_address: '303 Third Ave, Edmonton, AB',
        status: 'pending',
        quote_amount: null,
        created_at: new Date('2023-11-10').toISOString(),
        updated_at: new Date('2023-11-10').toISOString()
      }
    ];
    
    res.json(mockShipments);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a mock vehicles endpoint 
app.get('/vehicles', async (req, res) => {
  try {
    console.log('Fetching vehicles from standalone API (mock data)...');
    
    // Try to get real vehicles from database first
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('id');
    
    if (!error && data && data.length > 0) {
      console.log(`Found ${data.length} real vehicles in database`);
      return res.json(data);
    }
    
    // If no real data, return mock vehicles
    console.log('No vehicles found in database, returning mock data');
    
    const mockVehicles = [
      {
        id: 1,
        type: 'Truck',
        make: 'Ford',
        model: 'F-150',
        year: 2020,
        plate_number: 'ABC123',
        capacity: '1000kg',
        status: 'active'
      },
      {
        id: 2,
        type: 'Van',
        make: 'Mercedes',
        model: 'Sprinter',
        year: 2021,
        plate_number: 'XYZ789',
        capacity: '800kg',
        status: 'active'
      },
      {
        id: 3,
        type: 'Truck',
        make: 'Toyota',
        model: 'Tacoma',
        year: 2019,
        plate_number: 'DEF456',
        capacity: '750kg',
        status: 'maintenance'
      }
    ];
    
    res.json(mockVehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'standalone-admin-api',
  });
});

// Start the server
app.listen(port, () => {
  console.log(`🔐 Standalone Admin API running on port ${port}`);
  console.log(`✅ Endpoints:
- POST /create-admin (Create admin user)
- POST /admin-login (Admin login)
- GET /test-connection (Test Supabase connection)
- GET /list-users (List all users)
- GET /users (Get users array)
- GET /shipments (Get shipments - mock data if none in DB)
- GET /vehicles (Get vehicles - mock data if none in DB)
- GET /health (API health check)`);
}); 