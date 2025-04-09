require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// SQLite connection
const dbPath = path.resolve(__dirname, process.env.DB_PATH || 'data/courier.db');
console.log(`Connecting to SQLite DB at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('Connected to Supabase');

// Tables to migrate in the correct order (respecting foreign key constraints)
const tables = [
  'users',
  'vehicles',
  'shipments',
  'jobs',
  'notifications', 
  'clients',
  'saved_addresses',
  'locations'
];

// Function to get all rows from a SQLite table
function getTableData(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
      if (err) {
        console.error(`Error reading from ${tableName}:`, err);
        reject(err);
      } else {
        console.log(`Retrieved ${rows.length} rows from ${tableName}`);
        resolve(rows);
      }
    });
  });
}

// Function to check if a table exists in SQLite
function checkTableExists(tableName) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      }
    );
  });
}

// Function to create the schema in Supabase
async function createSchema() {
  console.log('Creating schema in Supabase...');
  
  // SQL for creating the schema in Supabase (PostgreSQL)
  const schemaSql = `
    -- Users table
    CREATE TABLE IF NOT EXISTS public.users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT CHECK(role IN ('shipper', 'admin', 'driver')),
      name TEXT,
      email TEXT,
      phone TEXT
    );

    -- Vehicles table
    CREATE TABLE IF NOT EXISTS public.vehicles (
      id SERIAL PRIMARY KEY,
      vehicle_name TEXT NOT NULL,
      license_plate TEXT UNIQUE
    );

    -- Shipments table
    CREATE TABLE IF NOT EXISTS public.shipments (
      id SERIAL PRIMARY KEY,
      shipper_id INTEGER REFERENCES public.users(id),
      driver_id INTEGER REFERENCES public.users(id),
      vehicle_id INTEGER REFERENCES public.vehicles(id),
      shipment_type TEXT,
      tracking_number TEXT UNIQUE,
      weight REAL,
      length REAL,
      width REAL,
      height REAL,
      dimension_unit TEXT,
      pickup_address TEXT,
      pickup_city TEXT,
      pickup_postal_code TEXT,
      delivery_address TEXT,
      delivery_city TEXT,
      delivery_postal_code TEXT,
      status TEXT,
      quote_amount REAL,
      tax_amount REAL,
      total_amount REAL,
      payment_status TEXT DEFAULT 'unpaid',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      estimated_delivery_time TIMESTAMP WITH TIME ZONE,
      province VARCHAR(2),
      invoiceUrl TEXT,
      description TEXT,
      origin_id INTEGER,
      destination_id INTEGER
    );

    -- Jobs table
    CREATE TABLE IF NOT EXISTS public.jobs (
      id SERIAL PRIMARY KEY,
      shipment_id INTEGER NOT NULL REFERENCES public.shipments(id),
      driver_id INTEGER REFERENCES public.users(id),
      status TEXT,
      province VARCHAR(2),
      assigned_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS public.notifications (
      id SERIAL PRIMARY KEY,
      shipper_id INTEGER NOT NULL REFERENCES public.users(id),
      shipment_id INTEGER NOT NULL REFERENCES public.shipments(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0
    );

    -- Clients table
    CREATE TABLE IF NOT EXISTS public.clients (
      id SERIAL PRIMARY KEY,
      shipper_id INTEGER REFERENCES public.users(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      company TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Saved Addresses table
    CREATE TABLE IF NOT EXISTS public.saved_addresses (
      id SERIAL PRIMARY KEY,
      shipper_id INTEGER NOT NULL REFERENCES public.users(id),
      address_name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      province TEXT NOT NULL,
      is_default BOOLEAN DEFAULT false,
      is_pickup BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Locations table
    CREATE TABLE IF NOT EXISTS public.locations (
      id SERIAL PRIMARY KEY,
      name TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      country TEXT DEFAULT 'Canada',
      latitude REAL,
      longitude REAL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create a function to execute dynamic SQL (for compatibility)
    CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT, params JSONB DEFAULT '[]'::jsonb)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result JSONB;
    BEGIN
      EXECUTE sql_query INTO result;
      RETURN result;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('error', SQLERRM);
    END;
    $$;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { query: schemaSql });
    if (error) throw error;
    console.log('Schema created successfully in Supabase');
  } catch (error) {
    console.error('Error creating schema:', error);
    console.log('Trying to execute schema SQL in smaller batches...');
    
    // Splitting the schema into individual table creations
    const statements = schemaSql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { query: statement + ';' });
        if (error) {
          console.error(`Error executing statement: ${statement}`, error);
        } else {
          console.log(`Successfully executed: ${statement.substring(0, 50)}...`);
        }
      } catch (err) {
        console.error(`Error executing statement: ${statement}`, err);
      }
    }
  }
}

// Function to prepare data for Postgres
function prepareDataForPostgres(rows) {
  return rows.map(row => {
    const newRow = { ...row };
    
    // Convert SQLite boolean integers to PostgreSQL booleans
    for (const [key, value] of Object.entries(newRow)) {
      // Convert 0/1 to false/true for boolean fields
      if (key.startsWith('is_') && (value === 0 || value === 1)) {
        newRow[key] = value === 1;
      }
      
      // Handle NULL values
      if (value === null) {
        newRow[key] = null;
      }
    }
    
    return newRow;
  });
}

// Main migration function
async function migrateToSupabase() {
  try {
    console.log('Starting migration from SQLite to Supabase...');
    
    // Create backup directory if it doesn't exist
    const backupDir = path.resolve(__dirname, 'migration_backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create schema in Supabase
    await createSchema();
    
    // Migrate each table
    for (const tableName of tables) {
      try {
        // Check if table exists in SQLite
        const tableExists = await checkTableExists(tableName);
        if (!tableExists) {
          console.log(`Table ${tableName} does not exist in SQLite, skipping...`);
          continue;
        }
        
        // Get data from SQLite
        const rows = await getTableData(tableName);
        
        // Save a backup of the data
        const backupFile = path.join(backupDir, `${tableName}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(rows, null, 2));
        console.log(`Backed up ${tableName} data to ${backupFile}`);
        
        if (rows.length === 0) {
          console.log(`No data to migrate for table ${tableName}`);
          continue;
        }
        
        // Prepare data for Postgres
        const postgresData = prepareDataForPostgres(rows);
        
        // Insert data into Supabase
        console.log(`Migrating ${rows.length} rows to ${tableName} table...`);
        
        // Insert in batches of 100 to avoid request size limitations
        const batchSize = 100;
        for (let i = 0; i < postgresData.length; i += batchSize) {
          const batch = postgresData.slice(i, i + batchSize);
          const { error } = await supabase.from(tableName).insert(batch);
          
          if (error) {
            console.error(`Error inserting batch ${i / batchSize + 1} into ${tableName}:`, error);
          } else {
            console.log(`Successfully inserted batch ${i / batchSize + 1} (${batch.length} rows) into ${tableName}`);
          }
        }
        
        console.log(`Completed migration for table ${tableName}`);
      } catch (error) {
        console.error(`Error migrating table ${tableName}:`, error);
      }
    }
    
    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close SQLite connection
    db.close((err) => {
      if (err) {
        console.error('Error closing SQLite database:', err);
      } else {
        console.log('SQLite database connection closed');
      }
    });
  }
}

// Run the migration
migrateToSupabase(); 