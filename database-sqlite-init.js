/**
 * SQLite database initialization module
 * This is used only for development mode when Supabase is not available
 */

module.exports = function initializeDatabase(db) {
  console.log('Initializing SQLite database for development');
  
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('shipper', 'admin', 'driver')),
      name TEXT,
      email TEXT,
      phone TEXT
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
      tracking_number TEXT UNIQUE,
      weight REAL NULL,
      length REAL NULL,
      width REAL NULL,
      height REAL NULL,
      dimension_unit TEXT NULL,
      pickup_address TEXT,
      pickup_city TEXT,
      pickup_postal_code TEXT,
      delivery_address TEXT,
      delivery_city TEXT,
      delivery_postal_code TEXT,
      status TEXT,
      quote_amount REAL NULL,
      tax_amount REAL NULL,
      total_amount REAL NULL,
      payment_status TEXT DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      estimated_delivery_time DATETIME NULL,
      province VARCHAR(2),
      invoiceUrl TEXT,
      description TEXT,
      origin_id INTEGER,
      destination_id INTEGER,
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
      province VARCHAR(2),
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

    // Create locations table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      country TEXT DEFAULT 'Canada',
      latitude REAL,
      longitude REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating locations table:', err);
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

    // Add seed data only if the development database is empty
    db.get('SELECT COUNT(*) as count FROM users', [], (err, result) => {
      if (err) {
        console.error('Error checking user count:', err);
        return;
      }
      
      // Only add seed data if no users exist
      if (result.count === 0) {
        console.log('Adding seed data for development...');
        addSeedData(db);
      }
    });
  });
};

/**
 * Add seed data for development
 */
function addSeedData(db) {
  const bcrypt = require('bcrypt');
  
  // 1. Add test driver
  bcrypt.hash('driver123', 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return;
    }
    
    db.run(`INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)`, 
      ['Driver1', hashedPassword, 'driver', 'John Doe'], 
      function(err) {
        if (err) {
          console.error('Error adding Driver1 user:', err);
          return;
        }
        console.log(`Added Driver1 user with ID: ${this.lastID}`);
      }
    );
  });
  
  // 2. Add test admin
  bcrypt.hash('admin123', 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return;
    }
    
    db.run(`INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)`, 
      ['Admin1', hashedPassword, 'admin', 'Admin User'], 
      function(err) {
        if (err) {
          console.error('Error adding Admin1 user:', err);
          return;
        }
        console.log(`Added Admin1 user with ID: ${this.lastID}`);
      }
    );
  });
  
  // 3. Add test shipper
  bcrypt.hash('shipper123', 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return;
    }
    
    db.run(`INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)`, 
      ['Shipper1', hashedPassword, 'shipper', 'Shipper User'], 
      function(err) {
        if (err) {
          console.error('Error adding Shipper1 user:', err);
          return;
        }
        console.log(`Added Shipper1 user with ID: ${this.lastID}`);
      }
    );
  });
  
  // 4. Add test vehicles
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
} 