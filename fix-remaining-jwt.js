/**
 * This script fixes the remaining JWT usage on Line 203 in the server.js file
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
let lines = fs.readFileSync(SERVER_FILE, 'utf8').split('\n');

// Check Line 203
const lineIndex = 202; // 0-indexed
const line = lines[lineIndex];

console.log('Current Line 203:', line);

// Check if it's an app.use(jwt) call
if (line.includes('app.use(jwt(') && !line.includes('secret:')) {
  console.log('Found JWT usage without secret on Line 203');
  
  // Check if the line continues to the next line
  let fullLine = line;
  let currentIndex = lineIndex;
  while (!fullLine.includes(');') && currentIndex < lines.length - 1) {
    currentIndex++;
    fullLine += '\n' + lines[currentIndex];
  }
  
  // If the line continues and already has a secret, don't modify it
  if (fullLine.includes('secret:')) {
    console.log('This JWT usage already has a secret in a continuation line');
    process.exit(0);
  }
  
  // Replace with proper JWT initialization
  const newLine = line.replace(
    'app.use(jwt(',
    'app.use(jwt({ secret: JWT_SECRET, algorithms: [\'HS256\'] }'
  );
  
  console.log('New Line 203:', newLine);
  
  lines[lineIndex] = newLine;
  
  // Write the updated server code back to the file
  fs.writeFileSync(SERVER_FILE, lines.join('\n'));
  console.log('✅ Fixed JWT usage on Line 203');
} else {
  console.log('⚠️ Line 203 does not match the expected pattern or already has a secret');
  console.log('Please check server.js manually');
} 