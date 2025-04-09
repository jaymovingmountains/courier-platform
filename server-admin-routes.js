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

// Step 3: Add these routes outside the /api/admin prefix for backward compatibility
// These should be added after your middleware setup but before your other routes

// Route: /list-users (for backward compatibility)
app.get('/list-users', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  // Forward to the admin route handler
  const adminReq = { ...req, auth: req.auth };
  const adminRes = {
    ...res,
    json: (data) => res.json(data),
    status: (code) => res.status(code)
  };
  
  return adminRoutes.find(r => r.path === '/list-users' && r.method === 'GET').handler(adminReq, adminRes);
});

// Route: /users (for backward compatibility)
app.get('/users', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  // Forward to the admin route handler
  const adminReq = { ...req, auth: req.auth };
  const adminRes = {
    ...res,
    json: (data) => res.json(data),
    status: (code) => res.status(code)
  };
  
  return adminRoutes.find(r => r.path === '/users' && r.method === 'GET').handler(adminReq, adminRes);
});

// Route: /test-connection (for backward compatibility)
app.get('/test-connection', jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }), async (req, res) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  
  // Forward to the admin route handler
  const adminReq = { ...req, auth: req.auth };
  const adminRes = {
    ...res,
    json: (data) => res.json(data),
    status: (code) => res.status(code)
  };
  
  return adminRoutes.find(r => r.path === '/test-connection' && r.method === 'GET').handler(adminReq, adminRes);
});

// Route: /health (publicly accessible)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mml-platform-api'
  });
});
