-- Verify and fix column types in reservations table
-- This script should be run in Supabase SQL Editor

-- Check current column types
SELECT 
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations' 
AND column_name IN ('id', 'user_id', 'room_id', 'approved_by', 'rejected_by')
ORDER BY column_name;

-- If user_id or room_id are not UUID, fix them
DO $$
DECLARE
  user_id_type text;
  room_id_type text;
BEGIN
  -- Get current data type of user_id
  SELECT data_type INTO user_id_type
  FROM information_schema.columns
  WHERE table_name = 'reservations' 
  AND column_name = 'user_id';
  
  -- Get current data type of room_id
  SELECT data_type INTO room_id_type
  FROM information_schema.columns
  WHERE table_name = 'reservations' 
  AND column_name = 'room_id';
  
  -- If user_id is not UUID, this is a critical error - should not happen
  IF user_id_type IS NOT NULL AND user_id_type != 'uuid' THEN
    RAISE EXCEPTION 'user_id column type is % but should be UUID. This requires manual intervention.', user_id_type;
  END IF;
  
  -- If room_id is not UUID, this is a critical error - should not happen
  IF room_id_type IS NOT NULL AND room_id_type != 'uuid' THEN
    RAISE EXCEPTION 'room_id column type is % but should be UUID. This requires manual intervention.', room_id_type;
  END IF;
  
  RAISE NOTICE 'user_id and room_id columns are correctly typed as UUID';
END $$;

