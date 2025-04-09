// Script to create an admin account on the Render server
const https = require('https');

const BASE_URL = 'courier-platform-backend.onrender.com';

// Register a new account with admin role
async function registerAdmin() {
  // Admin account details
  const adminData = {
    username: 'admin',
    password: 'admin123',
    name: 'System Administrator',
    role: 'admin'
  };
  
  console.log(`Creating admin account with username: ${adminData.username}`);
  
  // Try direct registration endpoint
  try {
    const registerResult = await makeRequest({
      hostname: BASE_URL,
      path: '/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify(adminData));
    
    console.log(`Register response status: ${registerResult.statusCode}`);
    console.log(`Response: ${registerResult.data}`);
    
    if (registerResult.statusCode >= 200 && registerResult.statusCode < 300) {
      console.log("\n✅ Admin account created successfully!");
      
      // Test login with new admin account
      const loginResult = await makeRequest({
        hostname: BASE_URL,
        path: '/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portal': 'admin'
        }
      }, JSON.stringify({
        username: adminData.username,
        password: adminData.password
      }));
      
      if (loginResult.statusCode === 200) {
        console.log("✅ Admin login successful!");
        return true;
      } else {
        console.log(`❌ Admin login failed: ${loginResult.data}`);
        return false;
      }
    } else {
      console.log("\n❌ Failed to create admin account.");
      
      // Try the createFirstAdmin endpoint as fallback
      console.log("\nTrying createFirstAdmin endpoint...");
      
      const firstAdminResult = await makeRequest({
        hostname: BASE_URL,
        path: '/admin/create-first',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, JSON.stringify(adminData));
      
      console.log(`First admin response status: ${firstAdminResult.statusCode}`);
      console.log(`Response: ${firstAdminResult.data}`);
      
      if (firstAdminResult.statusCode >= 200 && firstAdminResult.statusCode < 300) {
        console.log("\n✅ Admin account created successfully via createFirstAdmin!");
        return true;
      } else {
        console.log("\n❌ Failed to create admin account with all methods.");
        return false;
      }
    }
  } catch (error) {
    console.log(`❌ Error creating admin account: ${error.message}`);
    return false;
  }
}

// Make HTTP request
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Check server health
async function checkServerHealth() {
  try {
    const result = await makeRequest({
      hostname: BASE_URL,
      path: '/health',
      method: 'GET'
    });
    
    return result.statusCode === 200;
  } catch (error) {
    console.log(`❌ Error checking server health: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log("=================================================");
  console.log("Admin Account Setup for Render Server");
  console.log("=================================================");
  console.log();
  
  console.log(`Checking connection to https://${BASE_URL}...`);
  
  // Check server health
  const isHealthy = await checkServerHealth();
  
  if (!isHealthy) {
    console.log("❌ Server is not responding. Please check if the server is running.");
    return;
  }
  
  console.log("✅ Server is online!");
  console.log();
  
  // Create admin account
  await registerAdmin();
  
  console.log("\nSetup complete!");
  console.log("You can now use the admin-web to manage users for the Render server.");
}

// Run the script
main(); 