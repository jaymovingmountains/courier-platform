/**
 * This script fixes all JWT usages without a secret in the server.js file
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

// Find JWT_SECRET variable in the file
const jwtSecretVarRegex = /const\s+JWT_SECRET\s*=\s*[^;]+;/;
const jwtSecretVarMatch = serverCode.match(jwtSecretVarRegex);

let jwtSecretVar = 'process.env.JWT_SECRET || "courier_secret"';

// If JWT_SECRET is already defined in the file, use that variable name
if (jwtSecretVarMatch) {
  console.log('Found JWT_SECRET variable in the file');
  const jwtSecretVarName = jwtSecretVarMatch[0].split('=')[0].trim().split(' ')[1];
  jwtSecretVar = jwtSecretVarName;
  console.log(`Using existing JWT_SECRET variable: ${jwtSecretVar}`);
} else {
  // Add JWT_SECRET definition to the file
  console.log('Adding JWT_SECRET variable to the file');
  const newJwtSecretVar = `\n// JWT Secret for token verification
const JWT_SECRET = process.env.JWT_SECRET || 'courier_secret';\n`;
  
  // Find a good place to add the variable
  const requireSection = serverCode.indexOf('const express = require');
  if (requireSection !== -1) {
    // Find the end of the require section
    const requireSectionEnd = serverCode.indexOf('\n\n', requireSection);
    if (requireSectionEnd !== -1) {
      serverCode = serverCode.slice(0, requireSectionEnd) + newJwtSecretVar + serverCode.slice(requireSectionEnd);
      jwtSecretVar = 'JWT_SECRET';
    }
  }
}

// Look for express-jwt import
const importRegex = /const\s*\{\s*expressjwt(?:\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*\}\s*=\s*require\s*\(\s*['"]express-jwt['"]\s*\)/;
const importMatch = serverCode.match(importRegex);

if (!importMatch) {
  console.error('❌ Could not find express-jwt import in server.js');
  process.exit(1);
}

const jwtVariableName = importMatch[1] || 'expressjwt';
console.log(`JWT variable name: ${jwtVariableName}`);

// Find all incomplete JWT usages
const jwtNoSecretPattern = new RegExp(`${jwtVariableName}\\s*\\(\\s*\\)`, 'g');
const jwtAlgorithmOnlyPattern = new RegExp(`${jwtVariableName}\\s*\\(\\s*\\{\\s*algorithms\\s*:\\s*\\[\\s*['"]HS256['"]\\s*\\]\\s*\\}\\s*\\)`, 'g');

// Count replacements
let totalReplacements = 0;

// Fix JWT usages with only empty parentheses
if (serverCode.match(jwtNoSecretPattern)) {
  const newServerCode = serverCode.replace(
    jwtNoSecretPattern,
    `${jwtVariableName}({ secret: ${jwtSecretVar}, algorithms: ['HS256'] })`
  );
  
  totalReplacements += (serverCode.match(jwtNoSecretPattern) || []).length;
  serverCode = newServerCode;
}

// Fix JWT usages with only algorithms
if (serverCode.match(jwtAlgorithmOnlyPattern)) {
  const newServerCode = serverCode.replace(
    jwtAlgorithmOnlyPattern,
    `${jwtVariableName}({ secret: ${jwtSecretVar}, algorithms: ['HS256'] })`
  );
  
  totalReplacements += (serverCode.match(jwtAlgorithmOnlyPattern) || []).length;
  serverCode = newServerCode;
}

// Also check for expressJwt usage (in case both are used)
const altJwtNoSecretPattern = /expressJwt\s*\(\s*\)/g;
const altJwtAlgorithmOnlyPattern = /expressJwt\s*\(\s*\{\s*algorithms\s*:\s*\[\s*['"]HS256['"]\s*\]\s*\}\s*\)/g;

// Fix expressJwt usages with only empty parentheses
if (serverCode.match(altJwtNoSecretPattern)) {
  const newServerCode = serverCode.replace(
    altJwtNoSecretPattern,
    `expressJwt({ secret: ${jwtSecretVar}, algorithms: ['HS256'] })`
  );
  
  totalReplacements += (serverCode.match(altJwtNoSecretPattern) || []).length;
  serverCode = newServerCode;
}

// Fix expressJwt usages with only algorithms
if (serverCode.match(altJwtAlgorithmOnlyPattern)) {
  const newServerCode = serverCode.replace(
    altJwtAlgorithmOnlyPattern,
    `expressJwt({ secret: ${jwtSecretVar}, algorithms: ['HS256'] })`
  );
  
  totalReplacements += (serverCode.match(altJwtAlgorithmOnlyPattern) || []).length;
  serverCode = newServerCode;
}

// Write the updated server code back to the file
if (totalReplacements > 0) {
  fs.writeFileSync(SERVER_FILE, serverCode);
  console.log(`✅ Fixed ${totalReplacements} JWT usages in server.js`);
} else {
  console.log('⚠️ No JWT usages without secret found that match the patterns');
}

// Check remaining JWT usages
console.log('\nRemaining JWT usages to check manually:');
let lines = serverCode.split('\n');
for (let i = 0; i < lines.length; i++) {
  if ((lines[i].includes(jwtVariableName) || lines[i].includes('expressJwt')) && 
      lines[i].includes('(') && 
      !lines[i].includes('secret:') && 
      !lines[i].includes('require')) {
    console.log(`Line ${i + 1}: ${lines[i].trim()}`);
  }
} 