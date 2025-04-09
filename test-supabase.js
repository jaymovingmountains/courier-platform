require('dotenv').config();
// Import cross-fetch for Node environments
const fetch = require('cross-fetch');
global.fetch = fetch;

const { createClient } = require('@supabase/supabase-js');

// Check environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables');
  process.exit(1);
}

console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Supabase Key is set:', !!process.env.SUPABASE_KEY);

// Create Supabase client with options
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY, 
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetch,
    }
  }
);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Simple test query
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      console.error('Full error:', error);
      process.exit(1);
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('Data received:', data);
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Is your Supabase URL correct? It should look like: https://xyz.supabase.co');
    console.error('Is your Supabase key correct? It should start with "eyJ..."');
    console.error('Full error stack:', error.stack);
    process.exit(1);
  }
}

testConnection();
