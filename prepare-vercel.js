#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Preparing application for Vercel deployment...');

// Check that required files exist
const requiredFiles = [
  'server.js',
  'database.js',
  'vercel.json',
  'package.json',
  '.env' // Will be used for local testing
];

requiredFiles.forEach(file => {
  if (!fs.existsSync(path.join(__dirname, file))) {
    console.error(`Error: Required file '${file}' is missing!`);
    process.exit(1);
  }
});

// Ensure Supabase dependencies are installed
try {
  console.log('Checking for required dependencies...');
  require('@supabase/supabase-js');
  console.log('✅ @supabase/supabase-js is installed');
} catch (err) {
  console.error('❌ @supabase/supabase-js is not installed. Installing now...');
  execSync('npm install @supabase/supabase-js', { stdio: 'inherit' });
}

// Check .env file for Supabase credentials
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  if (!envContent.includes('SUPABASE_URL=') || !envContent.includes('SUPABASE_KEY=')) {
    console.warn('⚠️ Warning: .env file does not contain Supabase credentials!');
    console.warn('You must add these in the Vercel environment variables.');
  } else {
    console.log('✅ Supabase credentials found in .env file');
  }
} catch (err) {
  console.warn('⚠️ Warning: Could not read .env file');
}

// Create temporary test file to test Supabase connectivity
const testFile = path.join(__dirname, 'test-supabase.js');
fs.writeFileSync(
  testFile,
  `
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Check environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('Data received:', data);
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

testConnection();
`
);

console.log('\nTo test your Supabase connection before deploying:');
console.log('node test-supabase.js');

console.log('\n✅ Application is ready for Vercel deployment!');
console.log('\nDeployment steps:');
console.log('1. Push your code to GitHub');
console.log('2. Connect your GitHub repository to Vercel');
console.log('3. Add the following environment variables in Vercel:');
console.log('   - SUPABASE_URL');
console.log('   - SUPABASE_KEY');
console.log('   - JWT_SECRET (use a strong random string)');
console.log('4. Deploy your project');
console.log('5. Test database connectivity with the endpoint:');
console.log('   https://your-vercel-app.vercel.app/api/test-db');

// Add prepare-vercel script to package.json if it doesn't exist
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  if (!packageJson.scripts || !packageJson.scripts['prepare-vercel']) {
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['prepare-vercel'] = 'node prepare-vercel.js';
    fs.writeFileSync(
      path.join(__dirname, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    console.log('\n✅ Added prepare-vercel script to package.json');
  }
} catch (err) {
  console.warn('⚠️ Could not update package.json');
} 