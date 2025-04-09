const https = require('https');
const readline = require('readline');

// Constants
const SERVER_URL = 'courier-platform-backend.onrender.com';
const REGISTER_ENDPOINT = '/register';
const LOGIN_ENDPOINT = '/login';
const HEALTH_ENDPOINT = '/health';

// Admin account defaults (customize these if needed)
const DEFAULT_ADMIN = {
  username: 'Admin1',
  password: 'adminpass123',
  name: 'System Administrator',
  role: 'admin'
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Log function with colors
function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Main function
async function main() {
  log(colors.magenta, '======================================');
  log(colors.magenta, '     ADMIN ACCOUNT CREATION TOOL     ');
  log(colors.magenta, '======================================');

  try {
    // First check server health
    await checkServerHealth();
    
    // Try to log in with default admin credentials
    log(colors.blue, '\nChecking if admin account already exists...');
    try {
      const loginResult = await loginAdmin(DEFAULT_ADMIN.username, DEFAULT_ADMIN.password);
      
      if (loginResult && loginResult.token) {
        log(colors.green, '✅ Admin account already exists and credentials are valid!');
        log(colors.green, `Username: ${DEFAULT_ADMIN.username}`);
        log(colors.green, `Password: ${DEFAULT_ADMIN.password}`);
        
        // Ask if user wants to use existing account
        const useExisting = await askQuestion('Do you want to use this existing admin account? (y/n): ');
        
        if (useExisting.toLowerCase() === 'y' || useExisting.toLowerCase() === 'yes') {
          log(colors.green, '\nUse these credentials to log in to the admin-web interface:');
          log(colors.green, `Username: ${DEFAULT_ADMIN.username}`);
          log(colors.green, `Password: ${DEFAULT_ADMIN.password}`);
          return;
        }
      }
    } catch (error) {
      log(colors.yellow, `Admin login check: ${error.message}`);
      log(colors.yellow, 'No existing admin account found with default credentials.');
    }
    
    // Get custom admin details if needed
    const useCustom = await askQuestion('Do you want to use custom admin credentials? (y/n): ');
    
    let adminData;
    if (useCustom.toLowerCase() === 'y' || useCustom.toLowerCase() === 'yes') {
      adminData = await promptAdminDetails();
    } else {
      adminData = { ...DEFAULT_ADMIN };
      log(colors.blue, '\nUsing default admin credentials:');
      log(colors.blue, `Username: ${adminData.username}`);
      log(colors.blue, `Password: ${adminData.password}`);
    }
    
    // Register the admin account
    log(colors.blue, '\nCreating admin account...');
    const registrationResult = await registerAdmin(adminData);
    
    if (registrationResult && registrationResult.username) {
      log(colors.green, '✅ Admin account created successfully!');
      log(colors.green, '\nUse these credentials to log in to the admin-web interface:');
      log(colors.green, `Username: ${adminData.username}`);
      log(colors.green, `Password: ${adminData.password}`);
      
      // Test the new account
      log(colors.blue, '\nTesting login with new admin account...');
      const loginResult = await loginAdmin(adminData.username, adminData.password);
      
      if (loginResult && loginResult.token) {
        log(colors.green, '✅ Login successful with new admin account!');
      } else {
        log(colors.yellow, '⚠️ Login test with new account was not successful.');
      }
    } else {
      log(colors.red, '❌ Failed to create admin account.');
    }
  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}`);
  } finally {
    rl.close();
  }
}

// Check server health
async function checkServerHealth() {
  log(colors.blue, `\nChecking server health at https://${SERVER_URL}${HEALTH_ENDPOINT}...`);
  
  try {
    const response = await makeRequest({
      hostname: SERVER_URL,
      path: HEALTH_ENDPOINT,
      method: 'GET'
    });
    
    log(colors.green, '✅ Server is healthy!');
    return true;
  } catch (error) {
    log(colors.red, `❌ Server health check failed: ${error.message}`);
    throw new Error('Server is not reachable. Please check your connection.');
  }
}

// Login with admin credentials
async function loginAdmin(username, password) {
  const loginData = { username, password };
  
  try {
    // Try with admin portal header
    const response = await makeRequest({
      hostname: SERVER_URL,
      path: LOGIN_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-portal': 'admin'
      }
    }, loginData);
    
    return response;
  } catch (adminError) {
    // Try without admin portal header
    try {
      const response = await makeRequest({
        hostname: SERVER_URL,
        path: LOGIN_ENDPOINT,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, loginData);
      
      return response;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }
}

// Register admin account
async function registerAdmin(adminData) {
  try {
    // First try with the dedicated register endpoint
    return await makeRequest({
      hostname: SERVER_URL,
      path: REGISTER_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, adminData);
  } catch (registerError) {
    // If that fails, try the users endpoint
    try {
      return await makeRequest({
        hostname: SERVER_URL,
        path: '/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, adminData);
    } catch (usersError) {
      throw new Error(`Registration failed: ${usersError.message}`);
    }
  }
}

// Prompt for admin details
async function promptAdminDetails() {
  const username = await askQuestion('Enter admin username: ');
  const password = await askQuestion('Enter admin password: ');
  const name = await askQuestion('Enter admin display name: ');
  
  return {
    username,
    password,
    name,
    role: 'admin'
  };
}

// Helper function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve(responseData);
          }
        } else {
          try {
            const parsedError = JSON.parse(responseData);
            reject(new Error(parsedError.error || `Status ${res.statusCode}`));
          } catch (e) {
            reject(new Error(`Request failed with status ${res.statusCode}`));
          }
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run the script
main(); 