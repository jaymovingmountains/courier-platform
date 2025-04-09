const https = require('https');
const fs = require('fs');
const path = require('path');

// Constants
const SERVER_URL = 'courier-platform-backend.onrender.com';
const LOGIN_ENDPOINT = '/login';
const HEALTH_ENDPOINT = '/health';
const USERS_ENDPOINT = '/users';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.magenta}======================================${colors.reset}`);
console.log(`${colors.magenta}   ADMIN-WEB LOGIN TROUBLESHOOTER    ${colors.reset}`);
console.log(`${colors.magenta}======================================${colors.reset}`);

// 1. Check server health
console.log(`\n${colors.blue}1. CHECKING SERVER HEALTH${colors.reset}`);
console.log(`${colors.blue}Connecting to: https://${SERVER_URL}${HEALTH_ENDPOINT}${colors.reset}`);

const healthReq = https.request({
  hostname: SERVER_URL,
  path: HEALTH_ENDPOINT,
  method: 'GET'
}, (res) => {
  console.log(`${colors.cyan}Health check status: ${res.statusCode}${colors.reset}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log(`${colors.green}✅ Server is healthy! Response: ${data}${colors.reset}`);
      // Continue with next steps
      checkAdminWebEnvironment();
    } else {
      console.log(`${colors.red}❌ Server health check failed with status ${res.statusCode}${colors.reset}`);
      console.log(`${colors.red}Response: ${data}${colors.reset}`);
      console.log(`${colors.red}Please check if the Render server is running.${colors.reset}`);
    }
  });
});

healthReq.on('error', (error) => {
  console.error(`${colors.red}❌ Health check error: ${error.message}${colors.reset}`);
});

healthReq.end();

// 2. Check admin-web environment files
function checkAdminWebEnvironment() {
  console.log(`\n${colors.blue}2. CHECKING ADMIN-WEB ENVIRONMENT FILES${colors.reset}`);
  
  const envFiles = [
    path.join(process.cwd(), 'admin-web', '.env'),
    path.join(process.cwd(), 'admin-web', '.env.local'),
    path.join(process.cwd(), 'admin-web', '.env.development')
  ];
  
  let foundEnvFile = false;
  let correctApiUrl = false;
  
  envFiles.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        foundEnvFile = true;
        const envContent = fs.readFileSync(filePath, 'utf8');
        console.log(`${colors.green}✅ Found environment file: ${filePath}${colors.reset}`);
        
        // Check API URL
        const apiUrlMatch = envContent.match(/REACT_APP_API_URL=(.+)/);
        if (apiUrlMatch) {
          const apiUrl = apiUrlMatch[1].trim();
          console.log(`${colors.cyan}API URL in ${path.basename(filePath)}: ${apiUrl}${colors.reset}`);
          
          if (apiUrl.includes('courier-platform-backend.onrender.com')) {
            correctApiUrl = true;
            console.log(`${colors.green}✅ API URL is correctly pointing to Render server${colors.reset}`);
          } else {
            console.log(`${colors.yellow}⚠️ API URL is not pointing to Render server${colors.reset}`);
          }
        } else {
          console.log(`${colors.yellow}⚠️ No API URL found in ${path.basename(filePath)}${colors.reset}`);
        }
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠️ Error reading ${filePath}: ${error.message}${colors.reset}`);
    }
  });
  
  if (!foundEnvFile) {
    console.log(`${colors.red}❌ No environment files found for admin-web${colors.reset}`);
    console.log(`${colors.yellow}Create an .env.local file in admin-web directory with:${colors.reset}`);
    console.log(`REACT_APP_API_URL=https://courier-platform-backend.onrender.com`);
  }
  
  if (!correctApiUrl) {
    console.log(`${colors.yellow}⚠️ Please ensure REACT_APP_API_URL is set to https://courier-platform-backend.onrender.com${colors.reset}`);
  }
  
  // Continue with next steps
  testPredefinedLogins();
}

// 3. Test predefined logins
function testPredefinedLogins() {
  console.log(`\n${colors.blue}3. TESTING PREDEFINED ADMIN LOGINS${colors.reset}`);
  
  // List of common admin usernames/passwords to try
  const credentials = [
    { username: 'admin', password: 'admin' },
    { username: 'admin', password: 'password' },
    { username: 'Admin1', password: 'password' },
    { username: 'Admin2', password: 'password' },
    { username: 'admin1', password: 'password' },
    { username: 'admin2', password: 'password' }
  ];
  
  console.log(`${colors.cyan}Testing ${credentials.length} common admin credential combinations...${colors.reset}`);
  
  let credentialIndex = 0;
  
  // Test the next credential in the list
  function testNextCredential() {
    if (credentialIndex >= credentials.length) {
      console.log(`${colors.yellow}⚠️ None of the common admin credentials worked.${colors.reset}`);
      checkUsersEndpoint();
      return;
    }
    
    const cred = credentials[credentialIndex];
    
    console.log(`${colors.cyan}Testing login with username: ${cred.username}, password: ${cred.password}${colors.reset}`);
    
    // Try with admin portal header
    testLogin(cred.username, cred.password, true)
      .then(result => {
        if (result.success) {
          console.log(`${colors.green}✅ Login successful with admin portal header!${colors.reset}`);
          console.log(`${colors.green}Use these credentials to log in to admin-web:${colors.reset}`);
          console.log(`${colors.green}Username: ${cred.username}${colors.reset}`);
          console.log(`${colors.green}Password: ${cred.password}${colors.reset}`);
          // Stop testing since we found working credentials
          concludeTesting(true);
        } else {
          // Try without admin portal header
          testLogin(cred.username, cred.password, false)
            .then(regularResult => {
              if (regularResult.success) {
                console.log(`${colors.green}✅ Login successful without admin portal header!${colors.reset}`);
                console.log(`${colors.green}Use these credentials to log in to admin-web:${colors.reset}`);
                console.log(`${colors.green}Username: ${cred.username}${colors.reset}`);
                console.log(`${colors.green}Password: ${cred.password}${colors.reset}`);
                // Stop testing since we found working credentials
                concludeTesting(true);
              } else {
                credentialIndex++;
                // Test next credential
                testNextCredential();
              }
            });
        }
      });
  }
  
  // Start testing credentials
  testNextCredential();
}

// Test login with given credentials
function testLogin(username, password, useAdminPortal = true) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      username: username,
      password: password
    });
    
    const options = {
      hostname: SERVER_URL,
      path: LOGIN_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    if (useAdminPortal) {
      options.headers['x-portal'] = 'admin';
    }
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          
          if (res.statusCode === 200 && response.token) {
            // Success
            resolve({
              success: true,
              status: res.statusCode,
              response
            });
          } else {
            // Failed
            resolve({
              success: false,
              status: res.statusCode,
              response
            });
          }
        } catch (e) {
          // Failed with parsing error
          resolve({
            success: false,
            status: res.statusCode,
            error: 'Parse error',
            response: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      // Network error
      resolve({
        success: false,
        error: error.message
      });
    });
    
    req.write(data);
    req.end();
  });
}

// 4. Check if users endpoint is accessible
function checkUsersEndpoint() {
  console.log(`\n${colors.blue}4. CHECKING USERS ENDPOINT${colors.reset}`);
  console.log(`${colors.cyan}Attempting to access ${USERS_ENDPOINT} to check if it exists...${colors.reset}`);
  
  const options = {
    hostname: SERVER_URL,
    path: USERS_ENDPOINT,
    method: 'GET'
  };
  
  const req = https.request(options, (res) => {
    console.log(`${colors.cyan}Status code: ${res.statusCode}${colors.reset}`);
    
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 401) {
        console.log(`${colors.green}✅ Users endpoint exists but requires authentication (status 401)${colors.reset}`);
      } else if (res.statusCode === 404) {
        console.log(`${colors.yellow}⚠️ Users endpoint not found (status 404)${colors.reset}`);
      } else {
        console.log(`${colors.cyan}Received status ${res.statusCode} from users endpoint${colors.reset}`);
        console.log(`${colors.cyan}Response: ${responseData}${colors.reset}`);
      }
      
      // Continue with final recommendations
      concludeTesting(false);
    });
  });
  
  req.on('error', (error) => {
    console.log(`${colors.red}❌ Error accessing users endpoint: ${error.message}${colors.reset}`);
    // Continue with final recommendations
    concludeTesting(false);
  });
  
  req.end();
}

// Final recommendations
function concludeTesting(foundWorkingCredentials) {
  console.log(`\n${colors.blue}5. DIAGNOSTIC CONCLUSION${colors.reset}`);
  
  if (foundWorkingCredentials) {
    console.log(`${colors.green}✅ Found working admin credentials - use them to log in to admin-web.${colors.reset}`);
    console.log(`${colors.green}Make sure admin-web is connecting to the Render server.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ No working admin credentials found.${colors.reset}`);
    console.log(`${colors.yellow}You may need to create an admin account on the Render server.${colors.reset}`);
    console.log(`${colors.yellow}Try running: node create-render-admin.js${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}TROUBLESHOOTING RECOMMENDATIONS:${colors.reset}`);
  console.log(`${colors.blue}1. Check the network tab in browser DevTools to see what API requests admin-web is making${colors.reset}`);
  console.log(`${colors.blue}2. Verify that admin-web/.env.local is correctly pointing to the Render server${colors.reset}`);
  console.log(`${colors.blue}3. Try creating a new admin account using create-render-admin.js${colors.reset}`);
  console.log(`${colors.blue}4. Make sure you've stopped all local backend servers (node stop-local-servers.js)${colors.reset}`);
  console.log(`${colors.blue}5. Clear browser cookies and cache, then try again${colors.reset}`);
  
  console.log(`\n${colors.magenta}TROUBLESHOOTING COMPLETE${colors.reset}`);
} 