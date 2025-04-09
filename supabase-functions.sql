-- This script creates the necessary functions in your Supabase database
-- to provide compatibility with the Moving Mountains application.
-- Run this in the Supabase SQL Editor.

-- Create execute_sql function for executing dynamic SQL queries
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT, params JSONB DEFAULT '[]'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  prepared_query TEXT;
  i INTEGER;
  param_value TEXT;
BEGIN
  -- Prepare the query by replacing parameters
  prepared_query := sql_query;
  
  -- Execute the query
  BEGIN
    EXECUTE prepared_query INTO result USING params;
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM, 'query', sql_query);
  END;
END;
$$;

-- Create exec_sql function for executing SQL statements that don't return results
CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- Create reset_sequence function for resetting ID sequences after data migration
CREATE OR REPLACE FUNCTION reset_sequence(table_name TEXT, id_value BIGINT) 
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq_name TEXT;
BEGIN
  seq_name := table_name || '_id_seq';
  EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, id_value);
END;
$$;

-- Test the function
SELECT execute_sql('SELECT 1 as test', '[]'::jsonb);

-- Success message
SELECT 'Supabase compatibility functions created successfully!' as message; 