/**
 * This script prepares the courier platform for deployment.
 * It ensures that the data directory exists and copies the SQLite database
 * to the correct location if needed.
 */

const fs = require('fs');
const path = require('path');

console.log('Preparing courier platform for deployment...');

// Ensure data directory exists
const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  console.log('Creating data directory...');
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure invoices directory exists
const invoicesDir = path.resolve(__dirname, 'invoices');
if (!fs.existsSync(invoicesDir)) {
  console.log('Creating invoices directory...');
  fs.mkdirSync(invoicesDir, { recursive: true });
}

// Check if we need to copy the database
const sourceDbPath = path.resolve(__dirname, 'courier.db');
const targetDbPath = path.resolve(__dirname, 'data', 'courier.db');

if (fs.existsSync(sourceDbPath) && !fs.existsSync(targetDbPath)) {
  console.log('Copying database to data directory...');
  fs.copyFileSync(sourceDbPath, targetDbPath);
  console.log('Database copied successfully!');
} else if (fs.existsSync(targetDbPath)) {
  console.log('Database already exists in data directory.');
} else {
  console.log('No existing database found. A new one will be created on first run.');
}

console.log('Setup complete! Your application is ready for deployment.');
console.log('==========================================================');
console.log('Deployment Checklist:');
console.log('1. Ensure all environment variables are configured in Render');
console.log('2. Set up a persistent disk in Render with path: /opt/render/project/src/data');
console.log('3. Update CORS_ORIGIN to include all your frontend application URLs');
console.log('4. Update REACT_APP_API_URL in your frontend applications to point to the new backend URL');
console.log('=========================================================='); 