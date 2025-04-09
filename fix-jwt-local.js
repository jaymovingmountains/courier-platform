/**
 * This script fixes JWT issues in the local server.js file
 */
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🔧 Fixing JWT issues in server.js');
console.log('====================================================');

// Path to the server.js file
const SERVER_FILE = path.join(__dirname, 'server.js');

// Check if server.js exists
if (!fs.existsSync(SERVER_FILE)) {
  console.error(`❌ Server file not found at ${SERVER_FILE}`);
  process.exit(1);
}

// Read the server.js file
let serverCode = fs.readFileSync(SERVER_FILE, 'utf8');

// Make sure JWT_SECRET is defined
if (!serverCode.includes('const JWT_SECRET')) {
  console.log('Adding JWT_SECRET definition to server.js');
  
  // Find a good place to add the variable (after requires)
  const insertPosition = serverCode.indexOf('const app = express()');
  if (insertPosition !== -1) {
    const jwtSecretCode = `
// JWT Secret for token verification
const JWT_SECRET = process.env.JWT_SECRET || 'courier_secret';

`;
    serverCode = serverCode.slice(0, insertPosition) + jwtSecretCode + serverCode.slice(insertPosition);
  }
}

// Fix the JWT issues
// Replace expressJwt with jwt
if (serverCode.includes('expressJwt')) {
  console.log('Fixing expressJwt references');
  serverCode = serverCode.replace(/expressJwt/g, 'jwt');
}

// Handle JWT usage with empty parentheses
const jwtEmptyRegex = /jwt\(\)/g;
if (serverCode.match(jwtEmptyRegex)) {
  console.log('Fixing JWT usage with empty parentheses');
  serverCode = serverCode.replace(
    jwtEmptyRegex,
    'jwt({ secret: JWT_SECRET, algorithms: [\'HS256\'] })'
  );
}

// Handle JWT usage with algorithms only
const jwtAlgorithmOnlyRegex = /jwt\(\s*\{\s*algorithms\s*:\s*\[\s*['"]HS256['"]\s*\]\s*\}\s*\)/g;
if (serverCode.match(jwtAlgorithmOnlyRegex)) {
  console.log('Fixing JWT usage with algorithms only');
  serverCode = serverCode.replace(
    jwtAlgorithmOnlyRegex,
    'jwt({ secret: JWT_SECRET, algorithms: [\'HS256\'] })'
  );
}

// Write the updated server code back to the file
fs.writeFileSync(SERVER_FILE, serverCode);
console.log('✅ Fixed JWT issues in server.js');

console.log('====================================================');
console.log('✅ JWT fixes complete');
console.log('===================================================='); 