const axios = require('axios');

// Test login function
async function testLogin() {
  try {
    console.log('Testing login API...');
    
    // Test shipper login
    console.log('\nTesting shipper login:');
    const shipperResponse = await axios.post('http://localhost:3001/login', 
      { username: 'testshipper', password: 'shipper123' },
      { 
        headers: {
          'Content-Type': 'application/json',
          'x-portal': 'shipper'
        }
      }
    );
    
    console.log('Shipper login successful!');
    console.log('Token:', shipperResponse.data.token.substring(0, 20) + '...');
    
    // Test with shipper1 (the new user we created)
    console.log('\nTesting shipper1 login:');
    const shipper1Response = await axios.post('http://localhost:3001/login', 
      { username: 'shipper1', password: 'shipper123' },
      { 
        headers: {
          'Content-Type': 'application/json',
          'x-portal': 'shipper'
        }
      }
    );
    
    console.log('Shipper1 login successful!');
    console.log('Token:', shipper1Response.data.token.substring(0, 20) + '...');
    
  } catch (error) {
    console.error('Login test failed:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error('Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    console.error('Error config:', error.config);
  }
}

// Run the test
testLogin(); 