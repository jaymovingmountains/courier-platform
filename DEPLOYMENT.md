# Deploying the Courier Platform Backend to Render

This guide outlines how to deploy the Courier Platform backend to [Render](https://render.com/).

## Prerequisites

1. A Render account
2. Your code pushed to a Git repository (GitHub, GitLab, etc.)

## Preparation Steps

Before deploying to Render, run this command locally to prepare your database:

```bash
npm run prepare-deploy
```

This script:
- Creates the data directory if it doesn't exist
- Copies your existing database to the data directory if needed
- Ensures your application is ready for deployment

## Deployment Steps

### 1. Connect Your Repository to Render

1. Log in to your Render dashboard
2. Click "New" and select "Web Service"
3. Connect your Git repository
4. Select the repository containing your courier platform code

### 2. Configure Your Web Service

Use these settings:

- **Name**: courier-platform-backend (or your preferred name)
- **Environment**: Node
- **Build Command**: `npm install && npm run prepare-deploy`
- **Start Command**: `node server.js`

### 3. Add Environment Variables

The following environment variables need to be set in the Render dashboard:

- `PORT`: 3000 (Render will automatically set this, but it's good to specify)
- `JWT_SECRET`: Your secure JWT secret (do not use the default!)
- `REACT_APP_GOOGLE_MAPS_API_KEY`: Your Google Maps API key
- `DB_PATH`: `./data/courier.db`
- `REACT_APP_API_URL`: The URL of your deployed backend (e.g., `https://your-app-name.onrender.com`)
- `REACT_APP_GEOAPIFY_API_KEY`: Your Geoapify API key
- `CORS_ORIGIN`: Comma-separated list of allowed origins (e.g., `https://your-frontend-app.onrender.com,https://your-admin-app.onrender.com`)
- `NODE_ENV`: `production`

### 4. Set Up Persistent Disk

Since we're using SQLite, we need persistent storage:

1. In the Render dashboard, scroll to the "Disks" section
2. Add a disk with these settings:
   - **Name**: courier-data
   - **Mount Path**: `/opt/render/project/src/data`
   - **Size**: 1 GB (adjust as needed)

### 5. Deploy

Click "Create Web Service" to deploy your application.

## Database Management

### Initial Setup

The deployment process will:
1. Create a new database if none exists in the /data directory
2. Initialize all tables with the correct schema

### Backup and Restore

To backup your production database:
1. Use the Render shell to access your service
2. Run: `sqlite3 data/courier.db .dump > backup.sql`
3. Download the backup.sql file

To restore from a backup:
1. Upload the backup.sql file to your service
2. Run: `cat backup.sql | sqlite3 data/courier.db`

## Post-Deployment

After deployment:

1. Update your frontend applications to use the new backend URL
2. Test all functionality to ensure everything works as expected
3. Monitor the logs in the Render dashboard for any issues

## Troubleshooting

### Database Issues
- **Missing Tables**: Check the logs to ensure the initialization script ran correctly
- **Database Not Found**: Verify that the persistent disk is mounted correctly and the DB_PATH is set correctly
- **Permission Issues**: Check that the service has proper permissions to write to the data directory

### CORS Errors
- Verify your CORS_ORIGIN environment variable includes all necessary frontend URLs
- Check browser console errors for specific CORS issues
- Ensure your frontend is using the correct backend URL

### Connection Timeouts
- Ensure your database connections are properly closed
- Check Render's resource limits to make sure your service has sufficient resources
- Monitor CPU and memory usage in Render dashboard

### JWT Authentication Issues
- Verify that JWT_SECRET is set correctly in environment variables
- Check that token expiration isn't causing issues (now set to 12 hours in production)
- Ensure all frontend applications are properly handling token refresh

## Alternative: Using the render.yaml File

This repository includes a `render.yaml` file, which allows for Blueprint deployments:

1. In the Render dashboard, go to "Blueprints"
2. Connect your repository
3. Render will automatically detect the `render.yaml` file and configure your services

You'll still need to manually set sensitive environment variables like `JWT_SECRET` and API keys.

## Monitoring

After deployment, regularly check:
1. Render logs for any errors or warnings
2. Response times to ensure performance remains good
3. Disk usage to ensure you don't run out of space

## Security Considerations

1. Replace the default JWT_SECRET with a strong, random secret
2. Consider adding rate limiting for sensitive endpoints
3. Ensure all API keys are kept secure and not committed to the repository

## Updating Frontend Applications

### Shipper Web Application

After deploying the backend, you'll need to update the shipper-web application:

1. Update the API URL in the environment configuration:
   ```
   // In shipper-web/.env or equivalent configuration
   REACT_APP_API_URL=https://courier-platform-backend.onrender.com
   ```

2. Check for any hardcoded backend URLs in the code:
   - Look in src/api or src/services folders
   - Update any axios or fetch baseURL configurations
   - Check authentication service configurations

3. Deploy the updated shipper-web application to Render

### Admin Web Application

Similarly, update the admin-web application:

1. Update the API URL in the environment configuration:
   ```
   // In admin-web/.env or equivalent configuration
   REACT_APP_API_URL=https://courier-platform-backend.onrender.com
   ```

2. Check for any hardcoded backend URLs in the code
3. Deploy the updated admin-web application to Render

### Testing Cross-Origin Requests

After deployment, verify CORS is working properly:

1. Open browser developer tools
2. Check for any CORS-related errors in the console
3. Test key functionality that makes API calls to the backend

If you encounter CORS issues, verify that:
- The deployed frontend domain is included in the CORS_ORIGIN environment variable
- The frontend is using the correct API URL
- Any proxy configurations in development are not being used in production 