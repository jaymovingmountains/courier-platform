/**
 * This script verifies and initializes the local SQLite database
 */
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'courier.db');

console.log('====================================================');
console.log('🔍 Local Database Setup');
console.log('====================================================');

// Check if data directory exists
if (!fs.existsSync(DB_DIR)) {
  console.log('Creating data directory...');
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Check if database file exists
if (!fs.existsSync(DB_PATH)) {
  console.log('Database file does not exist. Creating new database...');
}

// Connect to database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log(`Connected to SQLite database at ${DB_PATH}`);
});

// Define core tables that should be in the database
const coreTables = [
  {
    name: 'users',
    sql: `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT,
      email TEXT,
      phone TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'shipments',
    sql: `CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipper_id INTEGER,
      driver_id INTEGER,
      status TEXT,
      pickup_address TEXT,
      delivery_address TEXT,
      pickup_lat REAL,
      pickup_lng REAL,
      delivery_lat REAL,
      delivery_lng REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  }
];

// Create tables
db.serialize(() => {
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  // Create tables
  coreTables.forEach(table => {
    db.run(table.sql, (err) => {
      if (err) {
        console.error(`Error creating ${table.name} table:`, err.message);
      } else {
        console.log(`✅ Table '${table.name}' ready`);
      }
    });
  });
  
  // Check for admin user
  db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('Error checking admin users:', err.message);
      return;
    }
    
    if (row.count === 0) {
      // Create admin user if none exists
      const adminUser = {
        username: 'admin',
        password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // 'password' hashed with bcrypt
        name: 'Admin User',
        role: 'admin',
        email: 'admin@example.com'
      };
      
      db.run(
        'INSERT INTO users (username, password, name, role, email) VALUES (?, ?, ?, ?, ?)',
        [adminUser.username, adminUser.password, adminUser.name, adminUser.role, adminUser.email],
        function(err) {
          if (err) {
            console.error('Error creating admin user:', err.message);
          } else {
            console.log('✅ Created default admin user: admin/password');
          }
        }
      );
    } else {
      console.log(`✅ Admin users found (${row.count})`);
    }
  });
  
  // Check for core data
  db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
    if (err) {
      console.error('Error checking users:', err.message);
      return;
    }
    
    console.log(`Total users in database: ${row.count}`);
  });
  
  console.log('====================================================');
  console.log('✅ Local database setup complete');
  console.log('====================================================');
});

// Close the database connection
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
  });
}, 1000); 