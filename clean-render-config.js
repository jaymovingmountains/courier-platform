/**
 * This script cleans up Render-related configurations and files
 */
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🧹 Cleaning up Render-related configurations');
console.log('====================================================');

// Files to disable or remove
const filesToHandle = [
  {
    path: 'start-dev-with-render-db.js',
    action: 'disable' // Just rename instead of removing
  },
  {
    path: 'database-proxy.js',
    action: 'disable'
  },
  {
    path: 'add-db-proxy-endpoints.js',
    action: 'disable'
  },
  {
    path: 'update-render-server.js',
    action: 'disable'
  },
  {
    path: 'RENDER-SERVER-SETUP.md',
    action: 'disable'
  },
  {
    path: 'README-OPTION1.md',
    action: 'disable'
  }
];

// Process each file
filesToHandle.forEach(file => {
  const filePath = path.join(__dirname, file.path);
  
  if (fs.existsSync(filePath)) {
    if (file.action === 'remove') {
      // Remove the file
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file.path}`);
    } else if (file.action === 'disable') {
      // Rename to .disabled
      fs.renameSync(filePath, `${filePath}.disabled`);
      console.log(`✅ Disabled: ${file.path} → ${file.path}.disabled`);
    }
  } else {
    console.log(`⚠️ File not found: ${file.path}`);
  }
});

console.log('\nAll files have been handled. You can delete the .disabled files later if you no longer need them.');
console.log('====================================================');
console.log('✅ Cleanup complete');
console.log('===================================================='); 