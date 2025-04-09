const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('===== Database Schema Fix Utility =====');
console.log('This script adds missing columns to database tables');

// Connect to the database
const DB_PATH = path.join(__dirname, 'data', 'courier.db');
console.log(`Using database at path: ${DB_PATH}`);
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Define missing columns for each table
const columnsToAdd = [
  { table: 'shipments', column: 'quote_amount', type: 'REAL' },
  { table: 'shipments', column: 'tax_amount', type: 'REAL' },
  { table: 'shipments', column: 'total_amount', type: 'REAL' },
  { table: 'shipments', column: 'payment_status', type: 'TEXT' },
  { table: 'shipments', column: 'province', type: 'TEXT' },
  { table: 'shipments', column: 'vehicle_id', type: 'INTEGER' },
  { table: 'shipments', column: 'invoiceUrl', type: 'TEXT' },
  { table: 'shipments', column: 'origin_id', type: 'INTEGER' },
  { table: 'shipments', column: 'destination_id', type: 'INTEGER' },
  { table: 'users', column: 'email', type: 'TEXT' },
  { table: 'users', column: 'phone', type: 'TEXT' },
  { table: 'jobs', column: 'province', type: 'TEXT' },
];

// Create or ensure the locations table exists
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
    console.error('Error creating locations table:', err.message);
  } else {
    console.log('✅ Locations table ready');
  }
});

// Function to add a column to a table
function addColumn(table, column, type) {
  return new Promise((resolve) => {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
      if (err) {
        console.log(`Column ${column} in ${table} may already exist: ${err.message}`);
      } else {
        console.log(`✅ Added ${column} column to ${table} table`);
      }
      resolve();
    });
  });
}

// Add all missing columns
async function addAllColumns() {
  for (const col of columnsToAdd) {
    await addColumn(col.table, col.column, col.type);
  }
  
  console.log('\n===== Database schema updated =====');
  db.close(() => {
    console.log('Database connection closed');
  });
}

// Run the migration
addAllColumns(); 