-- Function to reset sequences after data migration
CREATE OR REPLACE FUNCTION reset_sequence(table_name text, id_value bigint) 
RETURNS void AS $$
DECLARE
  seq_name text;
BEGIN
  seq_name := table_name || '_id_seq';
  EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, id_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 