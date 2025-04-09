// Admin Management Script for Moving Mountains Platform
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Base URL for the Render server
const BASE_URL = 'courier-platform-backend.onrender.com';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility function to print colored text
function colorPrint(color, text) {
  console.log(`${color}${text}${colors.reset}`);
}

// Function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const result = {
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        };
        
        try {
          result.parsedData = JSON.parse(responseData);
        } catch {
          // Not JSON or empty response
        }
        
        resolve(result);
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

// Function to authenticate as admin
async function adminLogin(username, password) {
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
  
  try {
    const result = await makeRequest(options, data);
    
    if (result.statusCode === 200 && result.parsedData && result.parsedData.token) {
      return {
        success: true,
        token: result.parsedData.token,
        user: result.parsedData.user
      };
    } else {
      return {
        success: false,
        statusCode: result.statusCode,
        error: result.parsedData ? result.parsedData.error : 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Get all users
async function getAllUsers(token) {
  const options = {
    hostname: BASE_URL,
    path: '/users',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  try {
    const result = await makeRequest(options);
    
    if (result.statusCode === 200) {
      return {
        success: true,
        users: result.parsedData
      };
    } else {
      return {
        success: false,
        statusCode: result.statusCode,
        error: result.parsedData ? result.parsedData.error : 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Create a new user
async function createUser(token, userData) {
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
  
  try {
    const result = await makeRequest(options, data);
    
    if (result.statusCode === 201 || result.statusCode === 200) {
      return {
        success: true,
        user: result.parsedData
      };
    } else {
      return {
        success: false,
        statusCode: result.statusCode,
        error: result.parsedData ? result.parsedData.error : 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Test connection to server
async function testConnection() {
  try {
    const result = await makeRequest({
      hostname: BASE_URL,
      path: '/health',
      method: 'GET'
    });
    
    return {
      success: result.statusCode === 200,
      statusCode: result.statusCode,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Delete a user
async function deleteUser(token, userId) {
  const options = {
    hostname: BASE_URL,
    path: `/users/${userId}`,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  try {
    const result = await makeRequest(options);
    
    if (result.statusCode === 200 || result.statusCode === 204) {
      return {
        success: true
      };
    } else {
      return {
        success: false,
        statusCode: result.statusCode,
        error: result.parsedData ? result.parsedData.error : 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Reset a user's password
async function resetPassword(token, userId, newPassword) {
  const data = JSON.stringify({ password: newPassword });
  
  const options = {
    hostname: BASE_URL,
    path: `/users/${userId}/reset-password`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': `Bearer ${token}`
    }
  };
  
  try {
    const result = await makeRequest(options, data);
    
    if (result.statusCode === 200) {
      return {
        success: true
      };
    } else {
      return {
        success: false,
        statusCode: result.statusCode,
        error: result.parsedData ? result.parsedData.error : 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Reset all users (dangerous operation)
async function resetAllUsers(token, confirmationPhrase) {
  if (confirmationPhrase !== 'RESET ALL USERS') {
    return {
      success: false,
      error: 'Invalid confirmation phrase'
    };
  }
  
  const options = {
    hostname: BASE_URL,
    path: '/admin/reset-users',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': '2'
    }
  };
  
  try {
    const result = await makeRequest(options, '{}');
    
    if (result.statusCode === 200) {
      return {
        success: true
      };
    } else {
      return {
        success: false,
        statusCode: result.statusCode,
        error: result.parsedData ? result.parsedData.error : 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Display menu and process user selection
async function showMenu(token) {
  console.clear();
  colorPrint(colors.bright + colors.cyan, "=================================================");
  colorPrint(colors.bright + colors.cyan, "Moving Mountains Admin Management");
  colorPrint(colors.bright + colors.cyan, "=================================================");
  console.log();
  console.log("1. List all users");
  console.log("2. Create a new user");
  console.log("3. Delete a user");
  console.log("4. Reset user password");
  console.log("5. Test connection to server");
  console.log("6. Reset all users (DANGER)");
  console.log("0. Exit");
  console.log();
  
  rl.question("Enter your choice: ", async (choice) => {
    switch (choice) {
      case '1':
        await listAllUsers(token);
        break;
      case '2':
        await createNewUser(token);
        break;
      case '3':
        await removeUser(token);
        break;
      case '4':
        await changePassword(token);
        break;
      case '5':
        await checkConnection();
        break;
      case '6':
        await resetUsers(token);
        break;
      case '0':
        colorPrint(colors.yellow, "Exiting program. Goodbye!");
        rl.close();
        return;
      default:
        colorPrint(colors.red, "Invalid choice. Please try again.");
        await waitForEnter();
        await showMenu(token);
    }
  });
}

// List all users
async function listAllUsers(token) {
  console.clear();
  colorPrint(colors.bright + colors.blue, "=================================================");
  colorPrint(colors.bright + colors.blue, "User List");
  colorPrint(colors.bright + colors.blue, "=================================================");
  
  const result = await getAllUsers(token);
  
  if (result.success) {
    const users = result.users;
    
    // Group users by role
    const admins = users.filter(user => user.role === 'admin');
    const drivers = users.filter(user => user.role === 'driver');
    const shippers = users.filter(user => user.role === 'shipper');
    const others = users.filter(user => !['admin', 'driver', 'shipper'].includes(user.role));
    
    console.log();
    colorPrint(colors.bright, `Total Users: ${users.length}`);
    colorPrint(colors.bright, `Admins: ${admins.length}, Drivers: ${drivers.length}, Shippers: ${shippers.length}, Others: ${others.length}`);
    console.log();
    
    // Display admins
    if (admins.length > 0) {
      colorPrint(colors.bright + colors.magenta, "Admins:");
      admins.forEach(user => {
        console.log(`  ID: ${user.id}, Username: ${user.username}, Name: ${user.name || 'N/A'}`);
      });
      console.log();
    }
    
    // Display drivers
    if (drivers.length > 0) {
      colorPrint(colors.bright + colors.blue, "Drivers:");
      drivers.forEach(user => {
        console.log(`  ID: ${user.id}, Username: ${user.username}, Name: ${user.name || 'N/A'}`);
      });
      console.log();
    }
    
    // Display shippers
    if (shippers.length > 0) {
      colorPrint(colors.bright + colors.green, "Shippers:");
      shippers.forEach(user => {
        console.log(`  ID: ${user.id}, Username: ${user.username}, Name: ${user.name || 'N/A'}`);
      });
      console.log();
    }
    
    // Display others
    if (others.length > 0) {
      colorPrint(colors.bright + colors.yellow, "Others:");
      others.forEach(user => {
        console.log(`  ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Name: ${user.name || 'N/A'}`);
      });
      console.log();
    }
  } else {
    colorPrint(colors.red, `Failed to fetch users: ${result.error}`);
  }
  
  await waitForEnter();
  await showMenu(token);
}

// Create a new user
async function createNewUser(token) {
  console.clear();
  colorPrint(colors.bright + colors.green, "=================================================");
  colorPrint(colors.bright + colors.green, "Create New User");
  colorPrint(colors.bright + colors.green, "=================================================");
  console.log();
  
  const userData = {};
  
  await new Promise(resolve => {
    rl.question("Enter username: ", (username) => {
      userData.username = username;
      resolve();
    });
  });
  
  await new Promise(resolve => {
    rl.question("Enter password: ", (password) => {
      userData.password = password;
      resolve();
    });
  });
  
  await new Promise(resolve => {
    rl.question("Enter full name: ", (name) => {
      userData.name = name;
      resolve();
    });
  });
  
  await new Promise(resolve => {
    rl.question("Enter role (admin, driver, shipper): ", (role) => {
      if (['admin', 'driver', 'shipper'].includes(role)) {
        userData.role = role;
        resolve();
      } else {
        colorPrint(colors.red, "Invalid role. Please enter admin, driver, or shipper.");
        resolve();
      }
    });
  });
  
  if (!userData.role) {
    await waitForEnter();
    await showMenu(token);
    return;
  }
  
  console.log("\nCreating user with the following details:");
  console.log(`  Username: ${userData.username}`);
  console.log(`  Full Name: ${userData.name}`);
  console.log(`  Role: ${userData.role}`);
  
  await new Promise(resolve => {
    rl.question("\nConfirm creation? (y/n): ", async (answer) => {
      if (answer.toLowerCase() === 'y') {
        const result = await createUser(token, userData);
        
        if (result.success) {
          colorPrint(colors.green, "\nUser created successfully!");
          console.log(`  ID: ${result.user.id}`);
          console.log(`  Username: ${result.user.username}`);
          console.log(`  Role: ${result.user.role}`);
        } else {
          colorPrint(colors.red, `\nFailed to create user: ${result.error}`);
        }
      } else {
        colorPrint(colors.yellow, "\nUser creation cancelled.");
      }
      
      resolve();
    });
  });
  
  await waitForEnter();
  await showMenu(token);
}

// Delete a user
async function removeUser(token) {
  console.clear();
  colorPrint(colors.bright + colors.red, "=================================================");
  colorPrint(colors.bright + colors.red, "Delete User");
  colorPrint(colors.bright + colors.red, "=================================================");
  console.log();
  
  const users = await getAllUsers(token);
  
  if (!users.success) {
    colorPrint(colors.red, `Failed to fetch users: ${users.error}`);
    await waitForEnter();
    await showMenu(token);
    return;
  }
  
  // Display users
  console.log("Available users:");
  users.users.forEach(user => {
    console.log(`  ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
  });
  
  let userId;
  
  await new Promise(resolve => {
    rl.question("\nEnter user ID to delete: ", (id) => {
      userId = id;
      resolve();
    });
  });
  
  const userToDelete = users.users.find(user => user.id.toString() === userId);
  
  if (!userToDelete) {
    colorPrint(colors.red, "User not found with that ID.");
    await waitForEnter();
    await showMenu(token);
    return;
  }
  
  console.log(`\nYou are about to delete user: ${userToDelete.username} (${userToDelete.role})`);
  colorPrint(colors.red, "WARNING: This action cannot be undone!");
  
  await new Promise(resolve => {
    rl.question("\nType the username to confirm deletion: ", async (confirmation) => {
      if (confirmation === userToDelete.username) {
        const result = await deleteUser(token, userId);
        
        if (result.success) {
          colorPrint(colors.green, "\nUser deleted successfully!");
        } else {
          colorPrint(colors.red, `\nFailed to delete user: ${result.error}`);
        }
      } else {
        colorPrint(colors.yellow, "\nDeletion cancelled. Username did not match.");
      }
      
      resolve();
    });
  });
  
  await waitForEnter();
  await showMenu(token);
}

// Reset user password
async function changePassword(token) {
  console.clear();
  colorPrint(colors.bright + colors.yellow, "=================================================");
  colorPrint(colors.bright + colors.yellow, "Reset User Password");
  colorPrint(colors.bright + colors.yellow, "=================================================");
  console.log();
  
  const users = await getAllUsers(token);
  
  if (!users.success) {
    colorPrint(colors.red, `Failed to fetch users: ${users.error}`);
    await waitForEnter();
    await showMenu(token);
    return;
  }
  
  // Display users
  console.log("Available users:");
  users.users.forEach(user => {
    console.log(`  ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
  });
  
  let userId;
  
  await new Promise(resolve => {
    rl.question("\nEnter user ID to reset password: ", (id) => {
      userId = id;
      resolve();
    });
  });
  
  const userToReset = users.users.find(user => user.id.toString() === userId);
  
  if (!userToReset) {
    colorPrint(colors.red, "User not found with that ID.");
    await waitForEnter();
    await showMenu(token);
    return;
  }
  
  let newPassword;
  
  await new Promise(resolve => {
    rl.question("\nEnter new password: ", (password) => {
      newPassword = password;
      resolve();
    });
  });
  
  console.log(`\nYou are about to reset password for: ${userToReset.username} (${userToReset.role})`);
  
  await new Promise(resolve => {
    rl.question("\nConfirm password reset? (y/n): ", async (confirmation) => {
      if (confirmation.toLowerCase() === 'y') {
        const result = await resetPassword(token, userId, newPassword);
        
        if (result.success) {
          colorPrint(colors.green, "\nPassword reset successfully!");
        } else {
          colorPrint(colors.red, `\nFailed to reset password: ${result.error}`);
        }
      } else {
        colorPrint(colors.yellow, "\nPassword reset cancelled.");
      }
      
      resolve();
    });
  });
  
  await waitForEnter();
  await showMenu(token);
}

// Test connection to server
async function checkConnection() {
  console.clear();
  colorPrint(colors.bright + colors.blue, "=================================================");
  colorPrint(colors.bright + colors.blue, "Test Server Connection");
  colorPrint(colors.bright + colors.blue, "=================================================");
  console.log();
  
  colorPrint(colors.yellow, `Testing connection to: https://${BASE_URL}`);
  
  // Test health endpoint
  const healthResult = await testConnection();
  
  if (healthResult.success) {
    colorPrint(colors.green, "✓ Server is online and responding");
  } else {
    colorPrint(colors.red, `✗ Server connection failed: ${healthResult.error || `Status code: ${healthResult.statusCode}`}`);
    await waitForEnter();
    await showMenu(null);
    return;
  }
  
  // Check login endpoint
  try {
    const loginTest = await makeRequest({
      hostname: BASE_URL,
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': 2
      }
    }, '{}');
    
    if (loginTest.statusCode === 400 || loginTest.statusCode === 401) {
      colorPrint(colors.green, "✓ Login endpoint is available");
    } else {
      colorPrint(colors.yellow, `⚠ Login endpoint returned unexpected status: ${loginTest.statusCode}`);
    }
  } catch (error) {
    colorPrint(colors.red, `✗ Login endpoint check failed: ${error.message}`);
  }
  
  // Check users endpoint
  try {
    const usersTest = await makeRequest({
      hostname: BASE_URL,
      path: '/users',
      method: 'GET'
    });
    
    if (usersTest.statusCode === 401) {
      colorPrint(colors.green, "✓ Users endpoint is available (requires authentication)");
    } else {
      colorPrint(colors.yellow, `⚠ Users endpoint returned unexpected status: ${usersTest.statusCode}`);
    }
  } catch (error) {
    colorPrint(colors.red, `✗ Users endpoint check failed: ${error.message}`);
  }
  
  await waitForEnter();
  await showMenu(null);
}

// Reset all users
async function resetUsers(token) {
  console.clear();
  colorPrint(colors.bright + colors.red, "=================================================");
  colorPrint(colors.bright + colors.red, "DANGER: Reset All Users");
  colorPrint(colors.bright + colors.red, "=================================================");
  console.log();
  
  colorPrint(colors.red, "WARNING: This will delete ALL users except the admin account you're currently using.");
  colorPrint(colors.red, "This action is IRREVERSIBLE and for development/testing purposes only.");
  colorPrint(colors.red, "DO NOT use this on a production system with real user data!");
  console.log();
  
  await new Promise(resolve => {
    rl.question("To proceed, type 'RESET ALL USERS' in ALL CAPS: ", async (confirmation) => {
      if (confirmation === 'RESET ALL USERS') {
        colorPrint(colors.yellow, "\nProcessing user reset...");
        
        const result = await resetAllUsers(token, confirmation);
        
        if (result.success) {
          colorPrint(colors.green, "✓ All users have been reset successfully!");
        } else {
          colorPrint(colors.red, `✗ User reset failed: ${result.error}`);
        }
      } else {
        colorPrint(colors.yellow, "\nReset cancelled. Confirmation phrase did not match.");
      }
      
      resolve();
    });
  });
  
  await waitForEnter();
  await showMenu(token);
}

// Helper function to wait for Enter key
async function waitForEnter() {
  await new Promise(resolve => {
    rl.question("\nPress Enter to continue...", () => {
      resolve();
    });
  });
}

// Main function
async function main() {
  console.clear();
  colorPrint(colors.bright + colors.cyan, "=================================================");
  colorPrint(colors.bright + colors.cyan, "Moving Mountains Admin Management");
  colorPrint(colors.bright + colors.cyan, "=================================================");
  console.log();
  
  colorPrint(colors.yellow, `Connecting to: https://${BASE_URL}`);
  
  // First check if server is online
  const healthResult = await testConnection();
  
  if (!healthResult.success) {
    colorPrint(colors.red, `Connection failed: ${healthResult.error || 'Server not responding'}`);
    colorPrint(colors.yellow, "Please check if the server is running and try again.");
    rl.close();
    return;
  }
  
  colorPrint(colors.green, "Server is online!");
  console.log();
  
  // Get admin credentials
  let token = null;
  let loginSuccess = false;
  
  while (!loginSuccess) {
    const adminUsername = await new Promise(resolve => {
      rl.question("Enter admin username: ", resolve);
    });
    
    const adminPassword = await new Promise(resolve => {
      rl.question("Enter admin password: ", resolve);
    });
    
    console.log("\nLogging in...");
    
    const loginResult = await adminLogin(adminUsername, adminPassword);
    
    if (loginResult.success) {
      colorPrint(colors.green, "Login successful!");
      token = loginResult.token;
      loginSuccess = true;
    } else {
      colorPrint(colors.red, `Login failed: ${loginResult.error}`);
      
      const tryAgain = await new Promise(resolve => {
        rl.question("\nTry again? (y/n): ", resolve);
      });
      
      if (tryAgain.toLowerCase() !== 'y') {
        rl.close();
        return;
      }
      
      console.clear();
    }
  }
  
  // Show main menu
  await showMenu(token);
}

// Run the script
main(); 