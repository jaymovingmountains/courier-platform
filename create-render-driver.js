const https = require('https');
const readline = require('readline');

// Create readline interface for secure password input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BASE_URL = 'https://courier-platform-backend.onrender.com';

// Function to make authenticated requests
async function makeAuthenticatedRequest(endpoint, method = 'GET', token, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL.replace('https://', ''),
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            resolve(data);
          }
        } else {
          console.error(`Request failed with status code ${res.statusCode}`);
          try {
            const errorJson = JSON.parse(data);
            reject(new Error(errorJson.error || `Status code: ${res.statusCode}`));
          } catch {
            reject(new Error(`Status code: ${res.statusCode}, Body: ${data}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Function to authenticate and get token
async function login(username, password) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL.replace('https://', ''),
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-portal': 'admin' // Use admin portal header
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData.token);
          } catch (error) {
            reject(new Error('Failed to parse login response'));
          }
        } else {
          console.error(`Login failed with status code ${res.statusCode}`);
          try {
            const errorJson = JSON.parse(data);
            reject(new Error(errorJson.error || `Login failed. Status code: ${res.statusCode}`));
          } catch {
            reject(new Error(`Login failed. Status code: ${res.statusCode}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify({ username, password }));
    req.end();
  });
}

// Function to create a new driver
async function createDriver(token, driverData) {
  console.log('Creating new driver account with:', driverData);
  return makeAuthenticatedRequest('/users', 'POST', token, driverData);
}

// Main function
async function main() {
  console.log('Create Driver Account on Render Server');
  console.log('=====================================');
  
  rl.question('Enter admin username: ', (adminUsername) => {
    rl.question('Enter admin password: ', async (adminPassword) => {
      try {
        console.log('\nLogging in to Render server as admin...');
        const token = await login(adminUsername, adminPassword);
        console.log('Successfully authenticated as admin');
        
        // Get driver details
        rl.question('\nEnter new driver username: ', (username) => {
          rl.question('Enter new driver password: ', (password) => {
            rl.question('Enter driver full name: ', async (name) => {
              try {
                // Create driver object
                const driverData = {
                  username,
                  password,
                  name,
                  role: 'driver'
                };
                
                console.log('\nCreating new driver account...');
                const result = await createDriver(token, driverData);
                
                console.log('\nDriver account created successfully!');
                console.log('New driver details:');
                console.log(`ID: ${result.id}`);
                console.log(`Username: ${result.username}`);
                console.log(`Name: ${result.name}`);
                console.log(`Role: ${result.role}`);
                
                console.log('\nYou can now use these credentials in the MovingMountainsDriver app');
              } catch (error) {
                console.error('\nError creating driver account:', error.message);
              } finally {
                rl.close();
              }
            });
          });
        });
      } catch (error) {
        console.error('Error logging in:', error.message);
        rl.close();
      }
    });
  });
}

// Run the script
main(); 