// check-job-statuses.js
// Script to check the current status of all jobs with drivers assigned

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkJobStatuses() {
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

  try {
    console.log('Checking job statuses...');
    
    // Get all shipments with drivers assigned
    const shipments = await all(
      `SELECT id, driver_id, status 
       FROM shipments 
       WHERE driver_id IS NOT NULL
       ORDER BY id`,
      []
    );
    
    console.log(`Found ${shipments.length} shipments with drivers assigned`);
    
    if (shipments.length === 0) {
      console.log('No shipments have drivers assigned yet.');
      return;
    }
    
    // Print table header
    console.log('\nSHIPMENT DETAILS:');
    console.log('---------------------------------------');
    console.log('| Shipment ID | Driver ID | Status    |');
    console.log('---------------------------------------');
    
    // Print shipment details
    shipments.forEach(shipment => {
      // Pad strings for neat formatting
      const id = String(shipment.id).padEnd(10);
      const driverId = String(shipment.driver_id).padEnd(9);
      const status = String(shipment.status).padEnd(10);
      
      console.log(`| ${id} | ${driverId} | ${status} |`);
    });
    console.log('---------------------------------------');
    
    // Count by status
    const statusCounts = {};
    shipments.forEach(shipment => {
      if (!statusCounts[shipment.status]) {
        statusCounts[shipment.status] = 0;
      }
      statusCounts[shipment.status]++;
    });
    
    console.log('\nSTATUS SUMMARY:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`- ${status}: ${count} shipment(s)`);
    });
    
    // Verify no jobs are in problematic state
    const approvedJobs = shipments.filter(s => s.status === 'approved');
    if (approvedJobs.length > 0) {
      console.log('\n⚠️ WARNING: Found jobs with drivers assigned that are still in "approved" status:');
      approvedJobs.forEach(job => {
        console.log(`- Shipment #${job.id}, Driver ID: ${job.driver_id}`);
      });
      console.log('These jobs should be updated to "assigned" status.');
    } else {
      console.log('\n✅ All jobs with drivers assigned have proper status values.');
    }
    
  } catch (error) {
    console.error('Error checking job statuses:', error);
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
checkJobStatuses(); 