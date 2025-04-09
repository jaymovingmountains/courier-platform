// Script to create a driver account on the Render server
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Base URL for the Render server
const BASE_URL = 'courier-platform-backend.onrender.com';

// Function to try creating a user without authentication
function createUser(userData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(userData);
    
    const options = {
      hostname: BASE_URL,
      path: '/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            data: responseData
          };
          
          try {
            result.parsedData = JSON.parse(responseData);
          } catch {
            // Response is not JSON
          }
          
          resolve(result);
        } catch (error) {
          reject(error);
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

// Function to register a new account directly
function registerAccount(userData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(userData);
    
    const options = {
      hostname: BASE_URL,
      path: '/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            data: responseData
          };
          
          try {
            result.parsedData = JSON.parse(responseData);
          } catch {
            // Response is not JSON
          }
          
          resolve(result);
        } catch (error) {
          reject(error);
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

// Function to test driver login
function testLogin(username, password, portal = 'driver') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username, password });
    
    const options = {
      hostname: BASE_URL,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-portal': portal
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            data: responseData
          };
          
          if (res.statusCode === 200) {
            try {
              result.parsedData = JSON.parse(responseData);
              result.success = true;
            } catch {
              result.success = false;
              result.parseError = true;
            }
          } else {
            result.success = false;
            try {
              result.parsedData = JSON.parse(responseData);
            } catch {
              result.parseError = true;
            }
          }
          
          resolve(result);
        } catch (error) {
          reject(error);
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

// Main function
async function main() {
  console.log("===========================================");
  console.log("Create Driver Account on Render Server");
  console.log("===========================================");
  
  // Ask for username and password for the new driver
  rl.question('\nEnter username for new driver: ', (username) => {
    rl.question('Enter password for new driver: ', (password) => {
      rl.question('Enter full name for new driver: ', async (name) => {
        console.log(`\nCreating driver account: ${username}`);
        
        // Prepare user data
        const userData = {
          username: username,
          password: password,
          name: name,
          role: 'driver'
        };
        
        // Try to register account
        console.log("Attempting to create account...");
        
        try {
          // Try the /users endpoint
          console.log("\n🔍 Trying direct account creation via /users...");
          const createResult = await createUser(userData);
          
          if (createResult.statusCode >= 200 && createResult.statusCode < 300) {
            console.log("✅ Account created successfully!");
            console.log(`Response: ${createResult.data}`);
            
            // Test login
            await testCreatedAccount(username, password);
          } else {
            console.log(`❌ Account creation failed (${createResult.statusCode})`);
            console.log(`Response: ${createResult.data}`);
            
            // Try registration endpoint instead
            console.log("\n🔍 Trying account creation via /register...");
            const registerResult = await registerAccount(userData);
            
            if (registerResult.statusCode >= 200 && registerResult.statusCode < 300) {
              console.log("✅ Account registered successfully!");
              console.log(`Response: ${registerResult.data}`);
              
              // Test login
              await testCreatedAccount(username, password);
            } else {
              console.log(`❌ Registration failed (${registerResult.statusCode})`);
              console.log(`Response: ${registerResult.data}`);
              
              // Ask for admin credentials to try with authentication
              await tryWithAdmin(userData);
            }
          }
        } catch (error) {
          console.log(`❌ Error creating account: ${error.message}`);
          rl.close();
        }
      });
    });
  });
}

// Function to test login with newly created account
async function testCreatedAccount(username, password) {
  console.log("\n🔍 Testing login with new account...");
  
  try {
    const loginResult = await testLogin(username, password);
    
    if (loginResult.success) {
      console.log("✅ Login successful with new account!");
      if (loginResult.parsedData && loginResult.parsedData.user) {
        console.log(`   User ID: ${loginResult.parsedData.user.id}`);
        console.log(`   Username: ${loginResult.parsedData.user.username}`);
        console.log(`   Role: ${loginResult.parsedData.user.role}`);
      }
    } else {
      console.log(`❌ Login failed with new account (${loginResult.statusCode})`);
      console.log(`Response: ${loginResult.data}`);
    }
  } catch (error) {
    console.log(`❌ Error testing login: ${error.message}`);
  }
  
  rl.close();
}

// Function to try creating account with admin credentials
async function tryWithAdmin(userData) {
  console.log("\n🔍 Need admin credentials to create account");
  
  rl.question('Enter admin username: ', (adminUsername) => {
    rl.question('Enter admin password: ', async (adminPassword) => {
      console.log("\nAttempting admin login...");
      
      try {
        const loginResult = await testLogin(adminUsername, adminPassword, 'admin');
        
        if (!loginResult.success) {
          console.log(`❌ Admin login failed (${loginResult.statusCode})`);
          console.log(`Response: ${loginResult.data}`);
          rl.close();
          return;
        }
        
        console.log("✅ Admin login successful");
        
        // Get token and create user
        const token = loginResult.parsedData.token;
        
        console.log("\nCreating user with admin privileges...");
        
        const data = JSON.stringify(userData);
        
        const options = {
          hostname: BASE_URL,
          path: '/users',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'Authorization': `Bearer ${token}`
          }
        };
        
        // Make the request
        const createResult = await new Promise((resolve, reject) => {
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
          
          req.write(data);
          req.end();
        });
        
        if (createResult.statusCode >= 200 && createResult.statusCode < 300) {
          console.log("✅ Account created successfully with admin privileges!");
          console.log(`Response: ${createResult.data}`);
          
          // Test login with new account
          await testCreatedAccount(userData.username, userData.password);
        } else {
          console.log(`❌ Account creation failed (${createResult.statusCode})`);
          console.log(`Response: ${createResult.data}`);
          rl.close();
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        rl.close();
      }
    });
  });
}

// Run the script
main(); 