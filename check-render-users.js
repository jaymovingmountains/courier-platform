const https = require('https');
const readline = require('readline');

// Create readline interface for secure password input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BASE_URL = 'courier-platform-backend.onrender.com';

// Function to login and get a token
function loginAdmin(username, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username, password });
    
    const options = {
      hostname: BASE_URL,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-portal': 'admin'
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsedData = JSON.parse(responseData);
            if (parsedData.token) {
              resolve(parsedData.token);
            } else {
              reject(new Error('No token in response'));
            }
          } catch (e) {
            reject(new Error('Failed to parse response: ' + e.message));
          }
        } else {
          reject(new Error(`Login failed with status code: ${res.statusCode}, Response: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Function to get all users with a token
function getUsers(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: '/users',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const users = JSON.parse(responseData);
            resolve(users);
          } catch (e) {
            reject(new Error('Failed to parse users: ' + e.message));
          }
        } else {
          reject(new Error(`Failed to get users. Status code: ${res.statusCode}, Response: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Function to attempt driver login
function loginDriver(username, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username, password });
    
    const options = {
      hostname: BASE_URL,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-portal': 'driver'
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsedData = JSON.parse(responseData);
            resolve({
              success: true,
              token: parsedData.token,
              user: parsedData.user
            });
          } catch (e) {
            reject(new Error('Failed to parse response: ' + e.message));
          }
        } else {
          try {
            const errorData = JSON.parse(responseData);
            resolve({
              success: false,
              statusCode: res.statusCode,
              error: errorData.error || 'Unknown error'
            });
          } catch (e) {
            resolve({
              success: false,
              statusCode: res.statusCode,
              error: `Failed to parse error response: ${responseData}`
            });
          }
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Main execution function
async function main() {
  try {
    console.log("=====================================================");
    console.log("Testing Render Server at: https://" + BASE_URL);
    console.log("=====================================================");
    
    // Test server health
    console.log("\n🔍 Testing server health...");
    try {
      const healthResponse = await new Promise((resolve, reject) => {
        https.get(`https://${BASE_URL}/health`, (res) => {
          resolve(res.statusCode);
        }).on('error', (err) => {
          reject(err);
        });
      });
      
      console.log(`✅ Server health check returned status code: ${healthResponse}`);
    } catch (error) {
      console.log(`❌ Server health check failed: ${error.message}`);
    }
    
    rl.question('Enter admin username: ', (adminUsername) => {
      rl.question('Enter admin password: ', async (adminPassword) => {
        try {
          console.log(`\nAttempting admin login as ${adminUsername}...`);
          const token = await loginAdmin(adminUsername, adminPassword);
          console.log("✅ Admin login successful");
          
          console.log("\n🔍 Retrieving user list...");
          const users = await getUsers(token);
          
          console.log("\n=====================================================");
          console.log(`Found ${users.length} users in the Render database:`);
          console.log("=====================================================");
          
          // Display all users
          users.forEach(user => {
            console.log(`ID: ${user.id}, Username: ${user.username}, Name: ${user.name || 'N/A'}, Role: ${user.role}`);
          });
          
          // Check for specific driver accounts
          const driver1 = users.find(u => u.username === 'Driver1' || u.username === 'driver1');
          const driver2 = users.find(u => u.username === 'Driver2' || u.username === 'driver2');
          
          console.log("\n=====================================================");
          console.log("Driver account check:");
          console.log("=====================================================");
          
          if (driver1) {
            console.log(`✅ Driver1 exists: ID=${driver1.id}, Username=${driver1.username}`);
          } else {
            console.log("❌ Driver1 not found in the database");
          }
          
          if (driver2) {
            console.log(`✅ Driver2 exists: ID=${driver2.id}, Username=${driver2.username}`);
          } else {
            console.log("❌ Driver2 not found in the database");
          }
          
          // Test driver login
          console.log("\n=====================================================");
          console.log("Testing driver login:");
          console.log("=====================================================");
          
          // Try Driver1
          console.log("\n🔍 Testing login for Driver1...");
          const driver1Test = await loginDriver('Driver1', 'password');
          if (driver1Test.success) {
            console.log("✅ Driver1 login successful");
            console.log(`   User ID: ${driver1Test.user?.id}`);
            console.log(`   Username: ${driver1Test.user?.username}`);
            console.log(`   Role: ${driver1Test.user?.role}`);
          } else {
            console.log(`❌ Driver1 login failed: ${driver1Test.error} (${driver1Test.statusCode})`);
          }
          
          // Try Driver2
          console.log("\n🔍 Testing login for Driver2...");
          const driver2Test = await loginDriver('Driver2', 'password');
          if (driver2Test.success) {
            console.log("✅ Driver2 login successful");
            console.log(`   User ID: ${driver2Test.user?.id}`);
            console.log(`   Username: ${driver2Test.user?.username}`);
            console.log(`   Role: ${driver2Test.user?.role}`);
          } else {
            console.log(`❌ Driver2 login failed: ${driver2Test.error} (${driver2Test.statusCode})`);
          }
          
          rl.close();
        } catch (error) {
          console.error("❌ Error:", error.message);
          rl.close();
        }
      });
    });
  } catch (error) {
    console.error("❌ Failed:", error.message);
    rl.close();
  }
}

// Run the main function
main(); 