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

// Check if a table exists in SQLite
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

// Function to prepare data for Postgres
function prepareDataForPostgres(rows, tableName) {
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
      
      // Convert date strings properly
      if (
        (key.endsWith('_at') || key === 'created_at' || key === 'updated_at' || key === 'estimated_delivery_time') && 
        value && 
        typeof value === 'string'
      ) {
        try {
          // Ensure valid ISO format
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            newRow[key] = date.toISOString();
          }
        } catch (err) {
          console.warn(`Warning: Could not convert date for ${key} in ${tableName}, row ID ${row.id}`);
        }
      }
    }
    
    return newRow;
  });
}

// Function to truncate (clear) a table in Supabase
async function truncateTable(tableName) {
  try {
    const { error } = await supabase.from(tableName).delete().neq('id', 0);
    if (error) {
      console.error(`Error truncating ${tableName}:`, error);
      return false;
    }
    console.log(`Truncated table ${tableName}`);
    return true;
  } catch (error) {
    console.error(`Error truncating ${tableName}:`, error);
    return false;
  }
}

// Function to reset sequence for a table in Supabase
async function resetSequence(tableName) {
  try {
    // Get the current max ID
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
      
    if (error) {
      console.error(`Error getting max ID for ${tableName}:`, error);
      return false;
    }
    
    const maxId = data && data.length > 0 ? data[0].id : 0;
    
    // Reset the sequence
    const { error: seqError } = await supabase.rpc('reset_sequence', { 
      table_name: tableName, 
      id_value: maxId + 1 
    });
    
    if (seqError) {
      console.error(`Error resetting sequence for ${tableName}:`, seqError);
      // This is not a critical error, so we'll return true anyway
    } else {
      console.log(`Reset sequence for ${tableName} to ${maxId + 1}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error resetting sequence for ${tableName}:`, error);
    return false;
  }
}

// Main migration function
async function migrateData() {
  try {
    console.log('Starting direct data migration from SQLite to Supabase...');
    
    // Create backup directory
    const backupDir = path.resolve(__dirname, 'migration_backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create reset_sequence function in Supabase if it doesn't exist
    try {
      await supabase.rpc('reset_sequence', { table_name: 'test', id_value: 1 });
    } catch (error) {
      console.log('Creating reset_sequence function in Supabase...');
      await supabase.rpc('exec_sql', { 
        query: `
          CREATE OR REPLACE FUNCTION reset_sequence(table_name text, id_value bigint) 
          RETURNS void AS $$
          DECLARE
            seq_name text;
          BEGIN
            seq_name := table_name || '_id_seq';
            EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, id_value);
          END;
          $$ LANGUAGE plpgsql;
        `
      });
    }
    
    // Migrate each table
    for (const tableName of tables) {
      try {
        console.log(`\n==== MIGRATING ${tableName.toUpperCase()} ====`);
        
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
        
        // Clear existing data in Supabase (optional - comment this out if you want to keep existing data)
        // await truncateTable(tableName);
        
        // Prepare data for Postgres
        const postgresData = prepareDataForPostgres(rows, tableName);
        
        // Log sample data for inspection
        if (postgresData.length > 0) {
          console.log(`Sample data for ${tableName}:`, JSON.stringify(postgresData[0], null, 2));
        }
        
        // Insert one by one to avoid foreign key issues
        console.log(`Migrating ${rows.length} rows to ${tableName}...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < postgresData.length; i++) {
          const item = postgresData[i];
          const { error } = await supabase.from(tableName).insert([item]);
          
          if (error) {
            console.error(`  ❌ Error inserting row ${i+1} (ID: ${item.id}):`, error);
            errorCount++;
            
            // Try an upsert instead
            console.log(`  Attempting upsert for row ${i+1} (ID: ${item.id})...`);
            const { error: upsertError } = await supabase
              .from(tableName)
              .upsert([item], { onConflict: 'id' });
              
            if (upsertError) {
              console.error(`  ❌ Upsert also failed for row ${i+1}:`, upsertError);
            } else {
              console.log(`  ✅ Upsert succeeded for row ${i+1} (ID: ${item.id})`);
              successCount++;
            }
          } else {
            if ((i + 1) % 10 === 0 || i === postgresData.length - 1) {
              console.log(`  ✅ Inserted rows ${i-9 > 0 ? i-9 : 1} to ${i+1} (total ${successCount+1}/${postgresData.length})`);
            }
            successCount++;
          }
        }
        
        console.log(`Migration for ${tableName} complete: ${successCount} successful, ${errorCount} errors`);
        
        // Reset sequence if needed
        await resetSequence(tableName);
      } catch (error) {
        console.error(`Error migrating table ${tableName}:`, error);
      }
    }
    
    console.log('\nData migration completed!');
    console.log('Check your Supabase dashboard to verify the data.');
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
migrateData(); 