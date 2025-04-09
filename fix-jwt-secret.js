/**
 * This script fixes the JWT secret issue in the server.js file
 */
const fs = require('fs');
const path = require('path');

// Path to the server.js file
const SERVER_FILE = path.join(__dirname, 'server.js');

// Check if server.js exists
if (!fs.existsSync(SERVER_FILE)) {
  console.error(`❌ Server file not found at ${SERVER_FILE}`);
  process.exit(1);
}

// Read the server.js file
let serverCode = fs.readFileSync(SERVER_FILE, 'utf8');

// Look for JWT import
const importRegex = /const\s*\{\s*expressjwt(?:\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*\}\s*=\s*require\s*\(\s*['"]express-jwt['"]\s*\)/;
const importMatch = serverCode.match(importRegex);

if (importMatch) {
  console.log('Found express-jwt import');
  const jwtVariableName = importMatch[1] || 'expressjwt';
  console.log(`JWT variable name: ${jwtVariableName}`);
  
  // Look for JWT usage without secret
  const jwtUsageRegex = new RegExp(`${jwtVariableName}\\s*\\(\\s*\\{\\s*algorithms\\s*:\\s*\\[\\s*['"]HS256['"]\\s*\\]\\s*\\}\\s*\\)`, 'g');
  
  if (serverCode.match(jwtUsageRegex)) {
    console.log('Found JWT usage without secret');
    
    // Replace with proper JWT initialization
    serverCode = serverCode.replace(
      jwtUsageRegex,
      `${jwtVariableName}({ 
        secret: process.env.JWT_SECRET || 'courier_secret',
        algorithms: ['HS256'] 
      })`
    );
    
    // Write the updated server code back to the file
    fs.writeFileSync(SERVER_FILE, serverCode);
    console.log('✅ Fixed JWT secret in server.js');
  } else {
    // Also check for expressJwt usage (alternative name)
    const altJwtUsageRegex = /expressJwt\s*\(\s*\{\s*algorithms\s*:\s*\[\s*['"]HS256['"]\s*\]\s*\}\s*\)/g;
    
    if (serverCode.match(altJwtUsageRegex)) {
      console.log('Found expressJwt usage without secret');
      
      // Replace with proper JWT initialization
      serverCode = serverCode.replace(
        altJwtUsageRegex,
        `expressJwt({ 
          secret: process.env.JWT_SECRET || 'courier_secret',
          algorithms: ['HS256'] 
        })`
      );
      
      // Write the updated server code back to the file
      fs.writeFileSync(SERVER_FILE, serverCode);
      console.log('✅ Fixed JWT secret in server.js');
    } else {
      console.log('⚠️ Could not find JWT usage without secret');
      console.log('Please check server.js manually for the express-jwt configuration');
      
      // Find all JWT usages
      console.log('\nAll JWT usages in the file:');
      let lines = serverCode.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(jwtVariableName) || lines[i].includes('expressJwt')) {
          console.log(`Line ${i + 1}: ${lines[i].trim()}`);
        }
      }
    }
  }
} else {
  console.log('⚠️ Could not find express-jwt import in server.js');
  console.log('Please check server.js manually for the express-jwt configuration');
}

// Check for other JWT initializations that might be missing the secret
const otherJwtRegex = /expressjwt\(\s*\{(?!\s*secret)/g;
const matches = serverCode.match(otherJwtRegex);

if (matches && matches.length > 0) {
  console.log(`Found ${matches.length} other potential express-jwt initializations without secret`);
  console.log('Please check these locations manually:');
  
  // Find line numbers of matches
  let lines = serverCode.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(otherJwtRegex)) {
      console.log(`Line ${i + 1}: ${lines[i].trim()}`);
    }
  }
} 