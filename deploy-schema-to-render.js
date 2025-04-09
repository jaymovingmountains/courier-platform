/**
 * Script to deploy database schema to Render
 * This creates the necessary tables on the Render database
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const API_URL = 'https://courier-platform-backend.onrender.com';
const LOCAL_DB_PATH = path.join(__dirname, 'data/courier.db');

// Create a promise-based open method for SQLite
const openDb = promisify((path, callback) => {
  const db = new sqlite3.Database(path, (err) => {
    callback(err, db);
  });
});

// Function to get schema from local database
async function getLocalSchema() {
  try {
    console.log(`Opening local database at ${LOCAL_DB_PATH}...`);
    const db = await openDb(LOCAL_DB_PATH);
    
    console.log('Getting list of tables...');
    const tables = await promisify(db.all.bind(db))("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    
    const schemas = {};
    
    for (const table of tables) {
      const tableName = table.name;
      console.log(`Getting schema for table ${tableName}...`);
      
      // Get table schema
      const createStatement = await promisify(db.get.bind(db))(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?", 
        [tableName]
      );
      
      if (createStatement && createStatement.sql) {
        schemas[tableName] = createStatement.sql;
      }
    }
    
    // Close database
    await promisify(db.close.bind(db))();
    return schemas;
  } catch (error) {
    console.error('Error getting local schema:', error);
    throw error;
  }
}

// Function to deploy schema to Render database
async function deploySchemaToRender(schemas) {
  try {
    console.log('Checking connection to Render server...');
    const healthCheck = await axios.get(`${API_URL}/health`);
    console.log(`Server status: ${healthCheck.data.status}`);
    
    if (healthCheck.data.status !== 'ok') {
      throw new Error('Render server is not healthy');
    }
    
    console.log('Deploying schemas to Render database...');
    const schemaData = Object.entries(schemas).map(([table, sql]) => ({
      table,
      sql
    }));
    
    // Create an auth token for deployment (for a real app, use a more secure method)
    const AUTH_TOKEN = require('crypto').randomBytes(16).toString('hex');
    
    // Deploy schemas
    const response = await axios.post(`${API_URL}/admin/deploy-schema`, {
      schemas: schemaData,
      auth_token: AUTH_TOKEN
    });
    
    console.log('Schema deployment response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error deploying schemas to Render:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('====================================================');
    console.log('🚀 Starting database schema deployment to Render');
    console.log('====================================================');
    
    const schemas = await getLocalSchema();
    console.log(`Found ${Object.keys(schemas).length} tables in local database`);
    
    // Write schemas to a file for reference
    const schemaOutput = path.join(__dirname, 'schema-export.json');
    fs.writeFileSync(schemaOutput, JSON.stringify(schemas, null, 2));
    console.log(`Schema exported to ${schemaOutput}`);
    
    // Deploy schemas to Render
    const deployResult = await deploySchemaToRender(schemas);
    
    console.log('====================================================');
    console.log('✅ Schema deployment completed');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ Schema deployment failed:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 