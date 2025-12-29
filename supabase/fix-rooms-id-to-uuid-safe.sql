-- Safe migration: Fix rooms table id column from bigint to UUID
-- This script preserves existing reservations by creating a mapping table
-- Run this in Supabase SQL Editor

-- Step 1: Create a mapping table to store old bigint id -> new UUID id
CREATE TABLE IF NOT EXISTS rooms_id_mapping (
  old_id BIGINT PRIMARY KEY,
  new_id UUID NOT NULL,
  room_name TEXT NOT NULL,
  room_location TEXT NOT NULL
);

-- Step 2: Backup existing rooms data
CREATE TABLE IF NOT EXISTS rooms_backup AS 
SELECT * FROM rooms;

-- Step 3: Create new rooms table with UUID (temporary name)
CREATE TABLE IF NOT EXISTS rooms_new (
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

-- Step 4: Migrate rooms data and create mapping
-- Note: created_at and updated_at will use DEFAULT values (current timestamp)
INSERT INTO rooms_new (name, capacity, location, facilities, is_available, restricted_hours, notes)
SELECT 
  name,
  capacity,
  location,
  facilities,
  is_available,
  restricted_hours,
  notes
FROM rooms_backup;

-- Step 5: Create mapping (match by name and location to ensure uniqueness)
INSERT INTO rooms_id_mapping (old_id, new_id, room_name, room_location)
SELECT 
  r_old.id::bigint as old_id,
  r_new.id as new_id,
  r_old.name as room_name,
  r_old.location as room_location
FROM rooms_backup r_old
JOIN rooms_new r_new ON r_old.name = r_new.name AND r_old.location = r_new.location;

-- Step 6: Handle room_restrictions table FIRST (before reservations)
-- This prevents trigger function errors during migration
DO $$
BEGIN
  -- Check if room_restrictions table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_restrictions') THEN
    -- Drop any triggers that might use room_restrictions
    DROP TRIGGER IF EXISTS check_room_restrictions_trigger ON reservations;
    
    -- Drop foreign key constraint
    ALTER TABLE room_restrictions 
    DROP CONSTRAINT IF EXISTS room_restrictions_room_id_fkey;
    
    -- Change room_id from bigint to text temporarily
    ALTER TABLE room_restrictions 
    ALTER COLUMN room_id TYPE TEXT USING room_id::text;
    
    -- Update room_restrictions.room_id to use new UUIDs
    UPDATE room_restrictions rr
    SET room_id = m.new_id::text
    FROM rooms_id_mapping m
    WHERE rr.room_id = m.old_id::text;
    
    -- Change room_restrictions.room_id from text to uuid
    ALTER TABLE room_restrictions 
    ALTER COLUMN room_id TYPE UUID USING room_id::uuid;
  END IF;
END $$;

-- Step 7: Drop triggers and foreign key constraint for reservations
-- Drop the overlapping reservations trigger first to prevent type errors
DROP TRIGGER IF EXISTS prevent_overlapping_reservations ON reservations;

-- Drop foreign key constraint
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_room_id_fkey;

-- Step 8: Change reservations.room_id from bigint to text temporarily
-- This allows us to update the values
ALTER TABLE reservations 
ALTER COLUMN room_id TYPE TEXT USING room_id::text;

-- Step 9: Update reservations.room_id to use new UUIDs
UPDATE reservations r
SET room_id = m.new_id::text
FROM rooms_id_mapping m
WHERE r.room_id = m.old_id::text;

-- Step 10: Change reservations.room_id from text to uuid
ALTER TABLE reservations 
ALTER COLUMN room_id TYPE UUID USING room_id::uuid;

-- Step 11: Drop old rooms table and rename new one
DROP TABLE IF EXISTS rooms CASCADE;
ALTER TABLE rooms_new RENAME TO rooms;

-- Step 12: Recreate foreign key constraints
ALTER TABLE reservations 
ADD CONSTRAINT reservations_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- Step 12a: Recreate check_overlapping_reservations function to work with UUID
CREATE OR REPLACE FUNCTION check_overlapping_reservations()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE room_id = NEW.room_id::uuid
      AND (NEW.id IS NULL OR id::uuid != NEW.id::uuid)
      AND status IN ('pending', 'confirmed')
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION '해당 시간대에 이미 예약이 존재합니다.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER prevent_overlapping_reservations
BEFORE INSERT OR UPDATE ON reservations
FOR EACH ROW
WHEN (NEW.status IN ('pending', 'confirmed'))
EXECUTE FUNCTION check_overlapping_reservations();

-- Recreate room_restrictions foreign key if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_restrictions') THEN
    ALTER TABLE room_restrictions 
    ADD CONSTRAINT room_restrictions_room_id_fkey 
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 13: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON reservations(room_id);

-- Step 14: Recreate check_room_restrictions trigger function if it exists
-- This function should work with UUID now
-- Note: We need to check if table exists first, then create function outside DO block
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_restrictions') THEN
    -- Drop existing function and trigger first
    DROP FUNCTION IF EXISTS check_room_restrictions() CASCADE;
  END IF;
END $$;

-- Recreate the trigger function to work with UUID (outside DO block)
-- This will only work if room_restrictions table exists
CREATE OR REPLACE FUNCTION check_room_restrictions()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM room_restrictions 
    WHERE room_id = NEW.room_id::uuid 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION '해당 실에 활성화된 사용금지 공지가 있습니다.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (only if room_restrictions table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_restrictions') THEN
    CREATE TRIGGER check_room_restrictions_trigger
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION check_room_restrictions();
  END IF;
END $$;

-- Step 15: Verify the fix
SELECT 
  'rooms' as table_name,
  'id' as column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms' AND column_name = 'id';

-- Step 16: Verify reservations.room_id matches rooms.id
SELECT 
  COUNT(*) as total_reservations,
  COUNT(DISTINCT r.room_id) as unique_room_ids,
  COUNT(DISTINCT rm.id) as matching_rooms
FROM reservations r
LEFT JOIN rooms rm ON r.room_id::uuid = rm.id;

-- Step 17: Clean up (optional - keep for safety)
-- DROP TABLE IF EXISTS rooms_backup;
-- DROP TABLE IF EXISTS rooms_id_mapping;

