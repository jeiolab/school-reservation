-- Fix room_id type mismatch in reservations_archive table
-- reservations.room_id is UUID, but reservations_archive.room_id was BIGINT
-- This script changes reservations_archive.room_id to UUID to match

-- First, drop the foreign key constraint if it exists
ALTER TABLE reservations_archive 
DROP CONSTRAINT IF EXISTS reservations_archive_room_id_fkey;

-- Change room_id column type from BIGINT to UUID
-- Since BIGINT cannot be directly converted to UUID, we need to:
-- 1. Create a temporary column with UUID type
-- 2. Populate it from reservations table using original_id
-- 3. Drop the old column and rename the new one

DO $$
BEGIN
  -- Check if room_id column exists and is BIGINT type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'reservations_archive' 
    AND column_name = 'room_id' 
    AND data_type = 'bigint'
  ) THEN
    -- Step 1: Add temporary UUID column (nullable first)
    ALTER TABLE reservations_archive 
    ADD COLUMN room_id_new UUID;
    
    -- Step 2: Populate new column from reservations table using original_id
    UPDATE reservations_archive ra
    SET room_id_new = r.room_id
    FROM reservations r
    WHERE ra.original_id = r.id;
    
    -- Step 3: Drop old column
    ALTER TABLE reservations_archive 
    DROP COLUMN room_id;
    
    -- Step 4: Rename new column
    ALTER TABLE reservations_archive 
    RENAME COLUMN room_id_new TO room_id;
    
    -- Step 5: Set NOT NULL constraint
    ALTER TABLE reservations_archive 
    ALTER COLUMN room_id SET NOT NULL;
    
    -- Step 6: Recreate the foreign key constraint
    ALTER TABLE reservations_archive 
    ADD CONSTRAINT reservations_archive_room_id_fkey 
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
  END IF;
END $$;

