require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Import cross-fetch for Node environments
const fetch = require('cross-fetch');
global.fetch = fetch;

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Fallback to SQLite in development if Supabase credentials are missing
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_KEY in your environment variables.');
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('Falling back to SQLite for development environment');
    
    // Load SQLite version of the database module
    const sqlite3 = require('sqlite3').verbose();
    
    // Ensure data directory exists
    const dataDir = path.resolve(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Created data directory at', dataDir);
    }
    
    // Create database connection
    const dbPath = path.resolve(__dirname, process.env.DB_PATH || 'data/courier.db');
    console.log('Using SQLite database at path:', dbPath);
    
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
      }
      console.log('Connected to SQLite database');
      
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');
    });
    
    // Initialize SQLite database
    try {
      require('./database-sqlite-init')(db);
    } catch (err) {
      console.error('Error initializing SQLite database:', err);
      console.log('Created empty SQLite database instead');
    }
    
    // Helper function to run queries with promises for SQLite
    function run(query, params = []) {
      return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
          if (err) {
            console.error('SQL Error in run():', err.message);
            console.error('Query:', query);
            console.error('Params:', JSON.stringify(params));
            reject(err);
            return;
          }
          resolve({ id: this.lastID, changes: this.changes });
        });
      });
    }
    
    // Helper function to get single row for SQLite
    function get(query, params = []) {
      return new Promise((resolve, reject) => {
        db.get(query, params, (err, result) => {
          if (err) {
            console.error('SQL Error in get():', err.message);
            console.error('Query:', query);
            console.error('Params:', JSON.stringify(params));
            reject(err);
            return;
          }
          resolve(result);
        });
      });
    }
    
    // Helper function to get multiple rows for SQLite
    function all(query, params = []) {
      return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) {
            console.error('SQL Error in all():', err.message);
            console.error('Query:', query);
            console.error('Params:', JSON.stringify(params));
            reject(err);
            return;
          }
          resolve(rows || []);
        });
      });
    }
    
    // SQLite exports
    module.exports = {
      db,
      run,
      get,
      all
    };
    
    return;
  } else {
    console.error('Supabase credentials are required in production mode');
    process.exit(1);
  }
}

// If we reach here, we're using Supabase
console.log('Connecting to Supabase database at:', supabaseUrl);

try {
  // Create Supabase client with explicit fetch implementation
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetch,
    }
  });

  // Test connection immediately to catch any issues early
  console.log('Testing Supabase connection...');
  supabase.from('users').select('count').limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('Supabase connection test failed:', error);
      } else {
        console.log('✅ Supabase connection successful!');
      }
    })
    .catch(err => {
      console.error('Error testing Supabase connection:', err);
    });

  // Helper function to run INSERT/UPDATE/DELETE queries
  async function run(query, params = []) {
    try {
      // Convert SQLite-style placeholders to PostgreSQL style
      let processedQuery = query;
      if (params.length > 0) {
        let paramCount = 0;
        processedQuery = query.replace(/\?/g, () => `$${++paramCount}`);
      }
      
      // Debug query if not in production
      if (process.env.NODE_ENV !== 'production') {
        console.debug('RUN QUERY:', processedQuery.substring(0, 100) + (processedQuery.length > 100 ? '...' : ''));
        if (params.length) console.debug('PARAMS:', JSON.stringify(params));
      }
      
      // Execute the query using Supabase's rpc function
      try {
        // First check if execute_sql function exists
        const { data: funcCheck, error: funcError } = await supabase.rpc('execute_sql', {
          sql_query: 'SELECT 1 as test', 
          params: []
        });
        
        if (funcError) {
          // If the RPC function doesn't exist, use direct table operations instead
          console.warn('Warning: execute_sql function not found, using direct table operations');
          
          // Handle common query types
          if (processedQuery.trim().toUpperCase().startsWith('INSERT INTO')) {
            // Extract table name and handle insert
            const tableMatch = processedQuery.match(/INSERT INTO\s+(\w+)/i);
            if (tableMatch && tableMatch[1]) {
              const tableName = tableMatch[1];
              
              // Extract values to insert
              // This is simplified and won't work for all cases
              // In a real implementation, you'd need proper SQL parsing
              
              // For now, just log the error
              console.error('Direct INSERT not implemented');
              throw new Error('Direct insert operations not implemented. Please create the execute_sql function in Supabase.');
            }
          }
          
          throw new Error('SQL execution failed: execute_sql function not found in Supabase');
        }
        
        // If we get here, the function exists, use it
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: processedQuery,
          params: params
        });
        
        if (error) throw error;
        
        // Return an object that mimics the SQLite response
        return { 
          id: data?.id || data?.lastInsertId || null,
          changes: data?.rowCount || data?.changes || 0 
        };
      } catch (rpcError) {
        console.error('Error executing SQL via RPC:', rpcError);
        throw rpcError;
      }
    } catch (error) {
      console.error('SQL Error in run():', error.message);
      console.error('Query:', query);
      console.error('Params:', JSON.stringify(params));
      throw error;
    }
  }

  // Helper function to get single row
  async function get(query, params = []) {
    try {
      // Convert SQLite-style placeholders to PostgreSQL style
      let processedQuery = query;
      if (params.length > 0) {
        let paramCount = 0;
        processedQuery = query.replace(/\?/g, () => `$${++paramCount}`);
      }
      
      // Add LIMIT 1 if not present to ensure only one row is returned
      if (!processedQuery.toLowerCase().includes('limit')) {
        processedQuery += ' LIMIT 1';
      }
      
      // Debug query if not in production
      if (process.env.NODE_ENV !== 'production') {
        console.debug('GET QUERY:', processedQuery.substring(0, 100) + (processedQuery.length > 100 ? '...' : ''));
        if (params.length) console.debug('PARAMS:', JSON.stringify(params));
      }

      try {
        // Check if execute_sql function exists
        const { data: funcCheck, error: funcError } = await supabase.rpc('execute_sql', {
          sql_query: 'SELECT 1 as test', 
          params: []
        });
        
        if (funcError) {
          // If the RPC function doesn't exist, use direct table operations instead
          console.warn('Warning: execute_sql function not found, using direct table operations');
          
          // Extract table name for direct query
          // This is a very simplified approach and won't work for complex queries
          const tableMatch = processedQuery.match(/FROM\s+(\w+)/i);
          if (tableMatch && tableMatch[1]) {
            const tableName = tableMatch[1];
            
            // For now, just log the error
            console.error('Direct SELECT not implemented');
            throw new Error('Direct select operations not implemented. Please create the execute_sql function in Supabase.');
          }
          
          throw new Error('SQL execution failed: execute_sql function not found in Supabase');
        }
        
        // If the function exists, use it
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: processedQuery,
          params: params
        });
        
        if (error) throw error;
        return data && data.length > 0 ? data[0] : null;
      } catch (rpcError) {
        console.error('Error executing SQL via RPC:', rpcError);
        throw rpcError;
      }
    } catch (error) {
      console.error('SQL Error in get():', error.message);
      console.error('Query:', query);
      console.error('Params:', JSON.stringify(params));
      throw error;
    }
  }

  // Helper function to get multiple rows
  async function all(query, params = []) {
    try {
      // Convert SQLite-style placeholders to PostgreSQL style
      let processedQuery = query;
      if (params.length > 0) {
        let paramCount = 0;
        processedQuery = query.replace(/\?/g, () => `$${++paramCount}`);
      }
      
      // Debug query if not in production
      if (process.env.NODE_ENV !== 'production') {
        console.debug('ALL QUERY:', processedQuery.substring(0, 100) + (processedQuery.length > 100 ? '...' : ''));
        if (params.length) console.debug('PARAMS:', JSON.stringify(params));
      }

      try {
        // Check if execute_sql function exists
        const { data: funcCheck, error: funcError } = await supabase.rpc('execute_sql', {
          sql_query: 'SELECT 1 as test', 
          params: []
        });
        
        if (funcError) {
          // If the RPC function doesn't exist, use direct table operations instead
          console.warn('Warning: execute_sql function not found, using direct table operations');
          
          // Extract table name for direct query
          // This is a very simplified approach and won't work for complex queries
          const tableMatch = processedQuery.match(/FROM\s+(\w+)/i);
          if (tableMatch && tableMatch[1]) {
            const tableName = tableMatch[1];
            
            // For now, just log the error
            console.error('Direct SELECT not implemented');
            throw new Error('Direct select operations not implemented. Please create the execute_sql function in Supabase.');
          }
          
          throw new Error('SQL execution failed: execute_sql function not found in Supabase');
        }
        
        // If the function exists, use it
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: processedQuery,
          params: params
        });
        
        if (error) throw error;
        return data || [];
      } catch (rpcError) {
        console.error('Error executing SQL via RPC:', rpcError);
        throw rpcError;
      }
    } catch (error) {
      console.error('SQL Error in all():', error.message);
      console.error('Query:', query);
      console.error('Params:', JSON.stringify(params));
      throw error;
    }
  }

  // Execute raw SQL (use with caution)
  async function exec(sql) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        query: sql
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('SQL Error in exec():', error.message);
      throw error;
    }
  }

  // Supabase exports
  module.exports = {
    supabase,
    run,
    get,
    all,
    exec
  };
} catch (initError) {
  console.error('Fatal error initializing Supabase client:', initError);
  process.exit(1);
}