-- Verify that all migrations are complete
-- Run this in Supabase SQL Editor to check column types

-- Check rooms.id
SELECT 
  'rooms.id' as column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms' AND column_name = 'id';

-- Check reservations.room_id
SELECT 
  'reservations.room_id' as column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations' AND column_name = 'room_id';

-- Check reservations.user_id
SELECT 
  'reservations.user_id' as column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations' AND column_name = 'user_id';

-- Check room_restrictions.room_id (if table exists)
SELECT 
  'room_restrictions.room_id' as column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'room_restrictions' AND column_name = 'room_id';

-- Check users.id
SELECT 
  'users.id' as column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'id';

-- Summary: All should be 'uuid' type
-- If any show 'bigint' or 'int8', the migration is incomplete

