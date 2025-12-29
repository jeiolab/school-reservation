-- Check reservations table column types
-- Run this in Supabase SQL Editor to diagnose the issue

-- Check all UUID columns in reservations table
SELECT 
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations' 
AND column_name IN ('id', 'user_id', 'room_id', 'approved_by', 'rejected_by')
ORDER BY column_name;

-- If any column shows 'bigint' or 'int8', the migration is incomplete
-- All should show 'uuid' type

