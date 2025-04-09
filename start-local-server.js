/**
 * This script starts the local server with the correct configuration
 */
require('dotenv').config({ path: '.env.development' });
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🚀 Starting local development server');
console.log('====================================================');

// Verify that we're using the local environment
const apiUrl = process.env.API_URL || 'http://localhost:3001';
if (!apiUrl.includes('localhost')) {
  console.error('❌ API_URL is not set to localhost in .env.development');
  console.error('Please update your .env.development file');
  process.exit(1);
}

console.log(`API URL: ${apiUrl}`);
console.log(`JWT Secret: ${process.env.JWT_SECRET || 'Not set'}`);

// Check for local database
const dbPath = path.join(__dirname, 'data/courier.db');
if (!fs.existsSync(dbPath)) {
  console.error('❌ Local database not found!');
  console.error('Please run: node setup-local-db.js');
  process.exit(1);
}

// Start the server
console.log('🚀 Starting server...');
const server = spawn('node', ['server.js'], { 
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'inherit'
});

// Handle server exit
server.on('close', (code) => {
  console.log(`\n⛔ Server process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down server...');
  server.kill('SIGTERM');
  process.exit(0);
});

console.log('====================================================');
console.log('✅ Server is now running on localhost');
console.log('📝 Press Ctrl+C to stop the server');
console.log('===================================================='); 