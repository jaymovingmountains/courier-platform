require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.resolve(__dirname, process.env.DB_PATH || 'courier.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to SQLite database');
  initializeDatabase();
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('shipper', 'admin', 'driver')),
      name TEXT
    )`);

    // Vehicles table
    db.run(`CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_name TEXT NOT NULL,
      license_plate TEXT UNIQUE
    )`);

    // Shipments table
    db.run(`CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipper_id INTEGER,
      driver_id INTEGER NULL,
      vehicle_id INTEGER NULL,
      shipment_type TEXT,
      pickup_address TEXT,
      pickup_city TEXT,
      pickup_postal_code TEXT,
      delivery_address TEXT,
      delivery_city TEXT,
      delivery_postal_code TEXT,
      status TEXT,
      quote_amount REAL NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      province VARCHAR(2),
      invoiceUrl TEXT,
      FOREIGN KEY (shipper_id) REFERENCES users(id),
      FOREIGN KEY (driver_id) REFERENCES users(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )`);

    // Jobs table (if it doesn't exist already)
    db.run(`CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id INTEGER NOT NULL,
      driver_id INTEGER NULL,
      status TEXT,
      assigned_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    )`);

    // Notifications table for tracking shipment status updates
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipper_id INTEGER NOT NULL,
      shipment_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0,
      FOREIGN KEY (shipper_id) REFERENCES users(id),
      FOREIGN KEY (shipment_id) REFERENCES shipments(id)
    )`);

    // Clients table
    db.run(`CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipper_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      company TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shipper_id) REFERENCES users(id)
    )`);

    // Saved Addresses table
    db.run(`CREATE TABLE IF NOT EXISTS saved_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipper_id INTEGER NOT NULL,
      address_name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      province TEXT NOT NULL,
      is_default BOOLEAN DEFAULT 0,
      is_pickup BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shipper_id) REFERENCES users(id)
    )`);

    // Alter existing tables if they already exist
    // Check if name column exists in users table
    db.get("PRAGMA table_info(users)", (err, rows) => {
      if (err) {
        console.error('Error checking users table schema:', err);
        return;
      }
      
      // If name column doesn't exist, add it
      const nameColumnExists = Array.isArray(rows) && rows.some(row => row.name === 'name');
      if (!nameColumnExists) {
        db.run(`ALTER TABLE users ADD COLUMN name TEXT`, (err) => {
          if (err) {
            console.error('Error adding name column to users table:', err);
            return;
          }
          console.log('Added name column to users table');
        });
      }
    });

    // Check if vehicle_id column exists in shipments table
    db.get("PRAGMA table_info(shipments)", (err, rows) => {
      if (err) {
        console.error('Error checking shipments table schema:', err);
        return;
      }
      
      // If vehicle_id column doesn't exist, add it
      const vehicleIdColumnExists = Array.isArray(rows) && rows.some(row => row.name === 'vehicle_id');
      if (!vehicleIdColumnExists) {
        db.run(`ALTER TABLE shipments ADD COLUMN vehicle_id INTEGER REFERENCES vehicles(id)`, (err) => {
          if (err) {
            console.error('Error adding vehicle_id column to shipments table:', err);
            return;
          }
          console.log('Added vehicle_id column to shipments table');
        });
      }
      
      // Check if province column exists in shipments table
      const provinceColumnExists = Array.isArray(rows) && rows.some(row => row.name === 'province');
      if (!provinceColumnExists) {
        db.run(`ALTER TABLE shipments ADD COLUMN province VARCHAR(2)`, (err) => {
          if (err) {
            console.error('Error adding province column to shipments table:', err);
            return;
          }
          console.log('Added province column to shipments table');
        });
      }
      
      // Check if invoiceUrl column exists in shipments table
      const invoiceUrlColumnExists = Array.isArray(rows) && rows.some(row => row.name === 'invoiceUrl');
      if (!invoiceUrlColumnExists) {
        db.run(`ALTER TABLE shipments ADD COLUMN invoiceUrl TEXT`, (err) => {
          if (err) {
            console.error('Error adding invoiceUrl column to shipments table:', err);
            return;
          }
          console.log('Added invoiceUrl column to shipments table');
        });
      }
      
      // Check if tax_amount column exists
      const taxAmountColumnExists = Array.isArray(rows) && rows.some(row => row.name === 'tax_amount');
      if (!taxAmountColumnExists) {
        db.run(`ALTER TABLE shipments ADD COLUMN tax_amount REAL`, (err) => {
          if (err) {
            console.error('Error adding tax_amount column to shipments table:', err);
            return;
          }
          console.log('Added tax_amount column to shipments table');
        });
      }
      
      // Check if total_amount column exists
      const totalAmountColumnExists = Array.isArray(rows) && rows.some(row => row.name === 'total_amount');
      if (!totalAmountColumnExists) {
        db.run(`ALTER TABLE shipments ADD COLUMN total_amount REAL`, (err) => {
          if (err) {
            console.error('Error adding total_amount column to shipments table:', err);
            return;
          }
          console.log('Added total_amount column to shipments table');
        });
      }
      
      // Check if payment_status column exists
      const paymentStatusColumnExists = Array.isArray(rows) && rows.some(row => row.name === 'payment_status');
      if (!paymentStatusColumnExists) {
        db.run(`ALTER TABLE shipments ADD COLUMN payment_status TEXT DEFAULT 'unpaid'`, (err) => {
          if (err) {
            console.error('Error adding payment_status column to shipments table:', err);
            return;
          }
          console.log('Added payment_status column to shipments table');
        });
      }
    });

    // Check if province column exists in jobs table
    db.get("PRAGMA table_info(jobs)", (err, rows) => {
      if (err) {
        console.error('Error checking jobs table schema:', err);
        return;
      }
      
      // If province column doesn't exist, add it
      const provinceColumnExists = Array.isArray(rows) && rows.some(row => row.name === 'province');
      if (!provinceColumnExists) {
        db.run(`ALTER TABLE jobs ADD COLUMN province VARCHAR(2)`, (err) => {
          if (err) {
            console.error('Error adding province column to jobs table:', err);
            return;
          }
          console.log('Added province column to jobs table');
        });
      }
    });

    // Migration: Update users with null names
    // Set name = username for any user where name is null
    db.run(`UPDATE users SET name = username WHERE name IS NULL OR name = ''`, (err) => {
      if (err) {
        console.error('Error updating users with null names:', err);
      } else {
        console.log('Migration: Updated users with null names to use username as name');
      }
    });

    // Add seed data
    
    // 1. Check if Driver1 exists, if not create it, then update name to 'John Doe'
    db.get(`SELECT id FROM users WHERE username = 'Driver1'`, (err, user) => {
      if (err) {
        console.error('Error checking for Driver1:', err);
        return;
      }
      
      if (!user) {
        // Hash the password before storing
        const bcrypt = require('bcrypt');
        bcrypt.hash('driver123', 10, (err, hashedPassword) => {
          if (err) {
            console.error('Error hashing password:', err);
            return;
          }
          
          // Driver1 doesn't exist, create it first with hashed password
          db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
            ['Driver1', hashedPassword, 'driver'], 
            function(err) {
              if (err) {
                console.error('Error adding Driver1 user:', err);
                return;
              }
              console.log(`Added Driver1 user with ID: ${this.lastID}`);
              
              // Now update the name
              db.run(`UPDATE users SET name = 'John Doe' WHERE username = 'Driver1'`, (err) => {
                if (err) {
                  console.error('Error updating Driver1 name:', err);
                } else {
                  console.log('Updated name for Driver1 to John Doe');
                }
              });
            }
          );
        });
      } else {
        // Driver1 exists, check if password needs to be hashed
        db.get(`SELECT password FROM users WHERE username = 'Driver1'`, (err, userData) => {
          if (err) {
            console.error('Error checking Driver1 password:', err);
            return;
          }
          
          // If password is not hashed (doesn't start with $2b$), hash it
          if (userData.password && !userData.password.startsWith('$2b$')) {
            const bcrypt = require('bcrypt');
            bcrypt.hash('driver123', 10, (err, hashedPassword) => {
              if (err) {
                console.error('Error hashing password:', err);
                return;
              }
              
              // Update with hashed password
              db.run(`UPDATE users SET password = ? WHERE username = 'Driver1'`, [hashedPassword], (err) => {
                if (err) {
                  console.error('Error updating Driver1 password:', err);
                } else {
                  console.log('Updated Driver1 password to hashed version');
                }
              });
            });
          }
          
          // Update the name
          db.run(`UPDATE users SET name = 'John Doe' WHERE username = 'Driver1'`, (err) => {
            if (err) {
              console.error('Error updating Driver1 name:', err);
            } else {
              console.log('Updated name for Driver1 to John Doe');
            }
          });
        });
      }
    });

    // 2. Add Van 1 vehicle (if it doesn't exist)
    db.get(`SELECT id FROM vehicles WHERE license_plate = 'ABC123'`, (err, vehicle) => {
      if (err) {
        console.error('Error checking for existing vehicle:', err);
        return;
      }
      
      if (!vehicle) {
        db.run(`INSERT INTO vehicles (vehicle_name, license_plate) VALUES (?, ?)`, 
          ['Van 1', 'ABC123'], 
          function(err) {
            if (err) {
              console.error('Error adding Van 1 vehicle:', err);
              return;
            }
            console.log(`Added Van 1 vehicle with ID: ${this.lastID}`);
          }
        );
      } else {
        console.log('Van 1 vehicle already exists');
      }
    });

    // 3. Add Truck 1 vehicle (if it doesn't exist)
    db.get(`SELECT id FROM vehicles WHERE license_plate = 'XYZ789'`, (err, vehicle) => {
      if (err) {
        console.error('Error checking for existing vehicle:', err);
        return;
      }
      
      if (!vehicle) {
        db.run(`INSERT INTO vehicles (vehicle_name, license_plate) VALUES (?, ?)`, 
          ['Truck 1', 'XYZ789'], 
          function(err) {
            if (err) {
              console.error('Error adding Truck 1 vehicle:', err);
              return;
            }
            console.log(`Added Truck 1 vehicle with ID: ${this.lastID}`);
          }
        );
      } else {
        console.log('Truck 1 vehicle already exists');
      }
    });
  });
}

// Helper function to run queries with promises
function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID });
    });
  });
}

// Helper function to get single row
function get(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

// Helper function to get multiple rows
function all(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all
};