# Driver Setup Tools for MovingMountainsDriver App

This document provides instructions for setting up and managing driver accounts between your local development environment and the Render deployed server.

## Background

The MovingMountainsDriver app experienced issues with driver authentication and mapping due to mismatched driver IDs between your local development database and the production database on Render. This toolkit provides scripts to help manage this transition and ensure both environments are synchronized.

## Available Tools

### 1. Check Render Users (`check-render-users.js`)

This script allows you to view all driver accounts currently registered on the Render server.

**Usage:**
```bash
node check-render-users.js
```

You will be prompted to enter admin credentials for the Render server. The script will then display all driver accounts with their IDs, usernames, and names.

### 2. Create Render Driver (`create-render-driver.js`)

Use this script to create a new driver account on the Render server manually.

**Usage:**
```bash
node create-render-driver.js
```

You will be prompted to:
1. Enter admin credentials for authentication
2. Provide details for the new driver account (username, password, name)

The script will create the account and display the details of the newly created driver.

### 3. Sync Local Drivers (`sync-local-drivers.js`)

This comprehensive tool syncs driver accounts from your local database to the Render server.

**Usage:**
```bash
node sync-local-drivers.js
```

The script will:
1. Authenticate with the Render server
2. Connect to your local SQLite database
3. Compare driver accounts between local and remote environments
4. Allow you to sync missing drivers with a default password
5. Display mappings between local and remote driver IDs

## Using the MovingMountainsDriver App with Render

To use the MovingMountainsDriver app with your Render deployment:

1. **Check existing drivers** on Render using `check-render-users.js`
2. **Create or sync drivers** if needed using the appropriate script
3. **Use the correct credentials** from the Render server when logging into the app

## Common Issues and Solutions

### Authentication Failures

If you receive "Invalid username or password" errors:
- Verify the credentials using `check-render-users.js`
- Ensure you're using a username that exists on the Render server
- The password must match what's set on the Render server, not your local database

### Missing Jobs

If no jobs appear for a driver:
- Confirm the driver ID on Render matches the ID expected by the jobs
- Use the ID mapping information from `sync-local-drivers.js` to understand the relationship between local and remote IDs

### Network Issues

The app is configured to connect to `https://courier-platform-backend.onrender.com`. If you experience connection problems:
- Check that the Render server is running
- Verify your device has internet connectivity
- Ensure there are no firewall or network restrictions blocking access to render.com

## Future Improvements

For a more permanent solution, consider:

1. Implementing the driver mapping API endpoint as described in DRIVER_ID_FIX.md
2. Updating the mobile app to use this endpoint
3. Using a database migration tool to keep schemas synchronized between environments 