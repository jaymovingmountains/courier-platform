# Option 1: Connect Development to Render Database

This approach allows your local development server to use the Render database, providing real-time access to production data without the need for synchronization.

## Files Included

- **database-proxy.js**: Redirects database operations to the Render server
- **start-dev-with-render-db.js**: Script to start the development server with Render database
- **test-render-connection.js**: Script to test the connection to the Render database
- **update-render-server.js**: Script to update the Render server with database proxy authentication

## Setup Instructions

### 1. Local Machine Setup

1. Ensure you have the `.env.development` file with the following:
   ```
   API_URL=https://courier-platform-backend.onrender.com
   DB_PROXY_AUTH_TOKEN=proxy-dev-token-123
   ```

2. Make sure `database-proxy.js` is properly configured with the authentication token.

### 2. Render Server Setup

1. Upload the `update-render-server.js` script to your Render server.
2. Run it to update the server.js file with database proxy authentication:
   ```
   node update-render-server.js
   ```
3. Set the `DB_PROXY_AUTH_TOKEN` environment variable on your Render server to match your local machine.
4. Restart your Render server to apply the changes.

### 3. Running the Development Server

Start your development server using:
```
node start-dev-with-render-db.js
```

The script will:
1. Backup your original database.js file
2. Replace it with the database proxy
3. Start the server with the Render database connection
4. Restore the original database.js when you exit

### 4. Testing the Connection

Run the test script to verify everything is working:
```
node test-render-connection.js
```

If successful, you'll see a list of tables from the Render database and a count of users.

## How It Works

1. **Request Flow**:
   - Your local code uses the standard database.js interface
   - The proxy intercepts database calls
   - It forwards the SQL queries to the Render server via API calls
   - The Render server executes the queries and returns results
   - The proxy formats the response to match the expected SQLite interface

2. **Authentication**:
   - A token-based authentication system secures the database proxy endpoints
   - The token must match between your local `.env.development` and the Render server

3. **Automatic Cleanup**:
   - When you stop the development server, the original database.js is restored

## Benefits

- Real-time access to production data
- No need to sync or duplicate data
- Test with real production data locally
- Make changes in local environment and immediately see effects

## Limitations

- Slight performance overhead due to API calls
- Requires internet connection
- Modifications to local database affect production data
  
## Troubleshooting

- **Authentication Errors (401)**: Ensure the `DB_PROXY_AUTH_TOKEN` matches between local and Render
- **Connection Errors**: Check your internet connection and the `API_URL` setting
- **Missing Tables**: Verify that the Render database has the expected schema
- **Slow Performance**: Consider running queries that fetch less data or adding indexes 