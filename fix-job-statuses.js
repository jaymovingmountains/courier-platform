// fix-job-statuses.js
// Script to fix job statuses in the database
// This script finds all shipments that have a driver_id assigned but status is 'approved'
// and updates them to have status 'assigned'

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function fixJobStatuses() {
  // Open database connection directly
  const db = new sqlite3.Database(path.join(__dirname, 'courier.db'), (err) => {
    if (err) {
      console.error('Error connecting to the database:', err.message);
      return;
    }
    console.log('Connected to the SQLite database');
  });

  // Wrap database operations in promises
  const all = (query, params) => {
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  const run = (query, params) => {
    return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  };

  try {
    console.log('Starting job status fix script...');
    
    // Find all shipments with status 'approved' that have a driver assigned
    const shipmentsToFix = await all(
      `SELECT id, driver_id, status 
       FROM shipments 
       WHERE status = 'approved' AND driver_id IS NOT NULL`,
      []
    );
    
    console.log(`Found ${shipmentsToFix.length} shipments that need fixing`);
    
    if (shipmentsToFix.length === 0) {
      console.log('No shipments need to be fixed. All jobs with drivers assigned already have correct status.');
      return;
    }
    
    // Log details of shipments to be fixed
    shipmentsToFix.forEach(shipment => {
      console.log(`- Shipment #${shipment.id}: Current status '${shipment.status}', Driver ID: ${shipment.driver_id}`);
    });
    
    // Update all matching shipments
    const result = await run(
      `UPDATE shipments
       SET status = 'assigned'
       WHERE status = 'approved' AND driver_id IS NOT NULL`,
      []
    );
    
    console.log(`✅ Successfully updated ${result.changes} shipments from 'approved' to 'assigned' status`);
    
    // Verify the updates
    const verificationCheck = await all(
      `SELECT COUNT(*) as count
       FROM shipments
       WHERE status = 'approved' AND driver_id IS NOT NULL`,
      []
    );
    
    if (verificationCheck[0].count === 0) {
      console.log('✅ Verification successful: No more approved shipments with drivers assigned.');
    } else {
      console.log(`⚠️ Verification warning: ${verificationCheck[0].count} approved shipments with drivers still exist.`);
    }
    
    console.log('These jobs can now be properly transitioned by drivers in the iOS app.');
    
  } catch (error) {
    console.error('Error fixing job statuses:', error);
  } finally {
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database connection:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

// Run the function
fixJobStatuses(); 