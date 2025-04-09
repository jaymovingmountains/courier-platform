/**
 * ADMIN ROUTES INTEGRATION
 * 
 * This file contains the code that needs to be added to server.js
 * to incorporate the admin routes from routes/admin.js.
 * 
 * INSTRUCTIONS:
 * 1. Add this code to your server.js file
 * 2. Make sure routes/admin.js exists and is configured correctly
 * 3. Deploy your updated server.js to Vercel
 */

// Step 1: Add this line with your other requires at the top of server.js
const adminRoutes = require('./routes/admin');

// Step 2: Add this code after your middleware setup but before your other routes
// Mount admin routes at /api/admin
app.use('/api/admin', adminRoutes);

//==============================================================
// BACKWARD COMPATIBILITY ROUTES
//==============================================================
// These routes ensure that the existing admin-web frontend works without changes

// User Management - backward compatibility routes
app.get('/users', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.get(`${req.protocol}://${req.get('host')}/api/admin/users`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.get('/list-users', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.get(`${req.protocol}://${req.get('host')}/api/admin/list-users`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.post('/users', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.post(`${req.protocol}://${req.get('host')}/api/admin/users`, req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.put('/users/:id', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.put(`${req.protocol}://${req.get('host')}/api/admin/users/${req.params.id}`, req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.delete('/users/:id', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.delete(`${req.protocol}://${req.get('host')}/api/admin/users/${req.params.id}`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

// Shipment Management - backward compatibility routes
app.get('/shipments', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.get(`${req.protocol}://${req.get('host')}/api/admin/shipments`, {
      headers: {
        Authorization: req.headers.authorization
      },
      params: req.query // Forward query parameters for filtering
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.put('/shipments/:id/approve', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.put(`${req.protocol}://${req.get('host')}/api/admin/shipments/${req.params.id}/approve`, req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.put('/shipments/:id/status', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.put(`${req.protocol}://${req.get('host')}/api/admin/shipments/${req.params.id}/status`, req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.put('/shipments/:id/quote', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.put(`${req.protocol}://${req.get('host')}/api/admin/shipments/${req.params.id}/quote`, req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.put('/shipments/:id/assign', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.put(`${req.protocol}://${req.get('host')}/api/admin/shipments/${req.params.id}/assign`, req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.get('/shipments/:id/label', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.get(`${req.protocol}://${req.get('host')}/api/admin/shipments/${req.params.id}/label`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.get('/shipments/:id/invoice', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.get(`${req.protocol}://${req.get('host')}/api/admin/shipments/${req.params.id}/invoice`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

// Vehicle Management - backward compatibility routes
app.get('/vehicles', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.get(`${req.protocol}://${req.get('host')}/api/admin/vehicles`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.post('/vehicles', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.post(`${req.protocol}://${req.get('host')}/api/admin/vehicles`, req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.put('/vehicles/:id', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.put(`${req.protocol}://${req.get('host')}/api/admin/vehicles/${req.params.id}`, req.body, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.delete('/vehicles/:id', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.delete(`${req.protocol}://${req.get('host')}/api/admin/vehicles/${req.params.id}`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

// Shipper Management - backward compatibility routes
app.get('/admin/shippers/:id/clients', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.get(`${req.protocol}://${req.get('host')}/api/admin/shippers/${req.params.id}/clients`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

app.get('/admin/shippers/:id/addresses', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.get(`${req.protocol}://${req.get('host')}/api/admin/shippers/${req.params.id}/addresses`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

// System Utilities - backward compatibility routes
app.get('/test-connection', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  try {
    const response = await axios.get(`${req.protocol}://${req.get('host')}/api/admin/test-connection`, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    return res.json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
  }
});

// Health check endpoint (publicly accessible)
app.get('/health', (req, res) => {
  try {
    axios.get(`${req.protocol}://${req.get('host')}/api/admin/health`)
      .then(response => {
        res.json(response.data);
      })
      .catch(error => {
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Server error' });
      });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});
