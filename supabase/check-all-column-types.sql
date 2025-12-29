-- Check all column types that might cause type casting errors
-- This script should be run in Supabase SQL Editor to diagnose the issue

-- Check reservations table columns
SELECT 
  'reservations' as table_name,
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations' 
AND column_name IN ('id', 'user_id', 'room_id', 'approved_by', 'rejected_by')
ORDER BY column_name;

-- Check users table id column
SELECT 
  'users' as table_name,
  'id' as column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'id';

-- Check rooms table id column
SELECT 
  'rooms' as table_name,
  'id' as column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms' AND column_name = 'id';

-- If any column is not UUID, this will show the issue
-- All id, user_id, room_id, approved_by, rejected_by should be 'uuid' type

