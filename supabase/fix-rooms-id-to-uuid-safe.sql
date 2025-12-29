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
INSERT INTO rooms_new (name, capacity, location, facilities, is_available, restricted_hours, notes, created_at, updated_at)
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

-- Step 5: Create mapping (match by name and location to ensure uniqueness)
INSERT INTO rooms_id_mapping (old_id, new_id, room_name, room_location)
SELECT 
  r_old.id::bigint as old_id,
  r_new.id as new_id,
  r_old.name as room_name,
  r_old.location as room_location
FROM rooms_backup r_old
JOIN rooms_new r_new ON r_old.name = r_new.name AND r_old.location = r_new.location;

-- Step 6: Update reservations.room_id to use new UUIDs
UPDATE reservations r
SET room_id = m.new_id::text
FROM rooms_id_mapping m
WHERE r.room_id::bigint = m.old_id;

-- Step 7: Drop foreign key constraint
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_room_id_fkey;

-- Step 8: Drop old rooms table and rename new one
DROP TABLE IF EXISTS rooms CASCADE;
ALTER TABLE rooms_new RENAME TO rooms;

-- Step 9: Recreate foreign key constraint
ALTER TABLE reservations 
ADD CONSTRAINT reservations_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- Step 10: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON reservations(room_id);

-- Step 11: Verify the fix
SELECT 
  'rooms' as table_name,
  'id' as column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms' AND column_name = 'id';

-- Step 12: Verify reservations.room_id matches rooms.id
SELECT 
  COUNT(*) as total_reservations,
  COUNT(DISTINCT r.room_id) as unique_room_ids,
  COUNT(DISTINCT rm.id) as matching_rooms
FROM reservations r
LEFT JOIN rooms rm ON r.room_id::uuid = rm.id;

-- Step 13: Clean up (optional - keep for safety)
-- DROP TABLE IF EXISTS rooms_backup;
-- DROP TABLE IF EXISTS rooms_id_mapping;

