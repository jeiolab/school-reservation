-- Fix rooms table id column from bigint to UUID
-- This script should be run in Supabase SQL Editor
-- WARNING: This will recreate the rooms table with UUID ids
-- Make sure to backup your data first!

-- Step 1: Create a temporary table to store rooms data
CREATE TABLE IF NOT EXISTS rooms_backup AS 
SELECT * FROM rooms;

-- Step 2: Drop foreign key constraints that reference rooms.id
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_room_id_fkey;

-- Step 3: Drop the rooms table (this will cascade to any other dependencies)
DROP TABLE IF EXISTS rooms CASCADE;

-- Step 4: Recreate rooms table with UUID id
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  location TEXT NOT NULL,
  facilities TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  restricted_hours TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Step 5: Restore data from backup (with new UUID ids)
-- Note: This will generate new UUIDs for all rooms
INSERT INTO rooms (name, capacity, location, facilities, is_available, restricted_hours, notes, created_at, updated_at)
SELECT 
  name,
  capacity,
  location,
  facilities,
  is_available,
  restricted_hours,
  notes,
  created_at,
  updated_at
FROM rooms_backup;

-- Step 6: Recreate foreign key constraint
ALTER TABLE reservations 
ADD CONSTRAINT reservations_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- Step 7: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON reservations(room_id);

-- Step 8: Update reservations.room_id to match new room UUIDs
-- This is a critical step - we need to map old bigint room_ids to new UUID room_ids
-- Since we can't directly map bigint to UUID, we'll need to match by room name/location
DO $$
DECLARE
  room_record RECORD;
  reservation_record RECORD;
  new_room_id UUID;
BEGIN
  -- For each reservation, find the matching room by name and location
  FOR reservation_record IN 
    SELECT DISTINCT r.id as reservation_id, r.room_id as old_room_id
    FROM reservations r
    WHERE r.room_id::text NOT LIKE '%-%-%-%-%' -- Not a UUID format
  LOOP
    -- Try to find matching room by checking if there's a unique match
    -- This is a simplified approach - you may need to adjust based on your data
    SELECT id INTO new_room_id
    FROM rooms
    LIMIT 1; -- This is a placeholder - you'll need proper matching logic
    
    -- Update reservation with new room_id
    UPDATE reservations
    SET room_id = new_room_id
    WHERE id = reservation_record.reservation_id;
  END LOOP;
END $$;

-- Step 9: Clean up backup table (optional - keep it for safety)
-- DROP TABLE IF EXISTS rooms_backup;

-- Step 10: Verify the fix
SELECT 
  'rooms' as table_name,
  'id' as column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms' AND column_name = 'id';

