# Migrating Standalone Admin API to Vercel

This guide explains how to migrate the standalone admin API to your Vercel-hosted backend.

## Background

Currently, the admin-web frontend has been using a standalone API server (`standalone-admin-api.js`) to handle administrative requests. This guide explains how to integrate those API endpoints into your main backend application that's hosted on Vercel.

## Steps for Migration

### 1. Add Admin Routes File

The admin routes have been extracted into a separate file for better organization:

```
routes/admin.js
```

This file contains all the routes from the standalone admin API, properly organized with middleware for admin-only access.

### 2. Update the Main Server.js

You need to integrate the admin routes into your main `server.js` file. The integration code is provided in:

```
server-admin-routes.js
```

#### Integration Steps:

1. Add the admin routes import to your `server.js`:
   ```javascript
   const adminRoutes = require('./routes/admin');
   ```

2. Mount the admin routes at `/api/admin`:
   ```javascript
   app.use('/api/admin', adminRoutes);
   ```

3. Add compatibility routes for the original endpoints to ensure backward compatibility.

### 3. Update Frontend API URL

After deploying these changes to Vercel, you have two options for the frontend:

1. **Preferred Option**: Use prefixed routes
   - Update `.env` file to continue using Vercel URL
   - Modify your API service to use the `/api/admin` prefix for admin-specific endpoints
   - This is a cleaner approach and better organizes your API

2. **Backward Compatibility Option**: Keep existing routes
   - Continue using the current API endpoints without changing the frontend
   - The compatibility routes ensure old endpoints still work

### 4. Deploy to Vercel

1. Commit the changes to your repository:
   ```bash
   git add routes/admin.js server.js
   git commit -m "Integrate admin API endpoints into main server"
   git push
   ```

2. Vercel should automatically deploy the updated version if you have CI/CD configured.

3. If not, manually deploy from the Vercel dashboard by navigating to your project and clicking "Deploy".

### 5. Update Admin Web Frontend

If you're using the prefixed routes, update your admin-web frontend to use the new endpoints:

1. Create a `.env.production` file in your admin-web directory:
   ```
   REACT_APP_API_URL=https://your-vercel-app.vercel.app
   REACT_APP_API_PREFIX=/api/admin
   ```

2. Update your API service to use the prefix for admin-specific endpoints.

## Testing the Migration

After deploying, verify that all admin features work properly:

1. Test user login
2. Test dashboard data loading
3. Test user management features
4. Test shipment management features

If any issues occur, check browser developer tools for network errors.

## Troubleshooting

### CORS Issues

If you encounter CORS issues, ensure your Vercel server has proper CORS headers:

```javascript
app.use(cors({
  origin: ['https://your-admin-web-url.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-portal'],
  credentials: true
}));
```

### Authentication Issues

If authentication fails, check:

1. The token is being properly sent in request headers
2. JWT verification is working correctly
3. Admin authorization middleware is properly checking roles

## Rollback Plan

If issues occur, you can temporarily revert to using the standalone admin API:

1. Update your admin-web `.env` file to point back to the standalone server:
   ```
   REACT_APP_API_URL=http://localhost:3002
   ```

2. Run the standalone server locally while you resolve the issues.

## Conclusion

By migrating the standalone admin API to your Vercel-hosted backend, you'll have:

1. A single backend service to maintain
2. Consistent authentication and authorization
3. Better organization of your API endpoints
4. Improved scalability and reliability

If you have any questions or encounter issues during the migration, please refer to the server logs or contact the development team. 