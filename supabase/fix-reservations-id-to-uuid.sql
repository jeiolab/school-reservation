-- Fix reservations.id column from bigint to UUID
-- This script should be run in Supabase SQL Editor
-- WARNING: This will change the primary key type, which may affect existing data

-- Step 1: Drop dependent objects that might reference reservations.id
DROP TRIGGER IF EXISTS prevent_overlapping_reservations ON reservations;
DROP TRIGGER IF EXISTS update_reservations_updated_at ON reservations;
DROP TRIGGER IF EXISTS check_room_restrictions_trigger ON reservations;

-- Step 2: Drop foreign key constraints that might reference reservations.id
-- Check if reservations_archive table exists and has foreign key
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservations_archive') THEN
    ALTER TABLE reservations_archive 
    DROP CONSTRAINT IF EXISTS reservations_archive_original_id_fkey;
  END IF;
END $$;

-- Step 3: Create a temporary column with UUID type
ALTER TABLE reservations 
ADD COLUMN id_new UUID DEFAULT uuid_generate_v4();

-- Step 4: Generate new UUIDs for all existing rows
UPDATE reservations 
SET id_new = uuid_generate_v4();

-- Step 5: Drop the old primary key constraint
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_pkey;

-- Step 6: Drop the old id column
ALTER TABLE reservations 
DROP COLUMN id;

-- Step 7: Rename the new column to id
ALTER TABLE reservations 
RENAME COLUMN id_new TO id;

-- Step 8: Set id as NOT NULL and make it the primary key
ALTER TABLE reservations 
ALTER COLUMN id SET NOT NULL,
ADD PRIMARY KEY (id);

-- Step 9: Set default value for future inserts
ALTER TABLE reservations 
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Step 10: Recreate triggers
CREATE TRIGGER update_reservations_updated_at 
BEFORE UPDATE ON reservations
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Recreate check_overlapping_reservations function (if needed)
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

CREATE TRIGGER prevent_overlapping_reservations
BEFORE INSERT OR UPDATE ON reservations
FOR EACH ROW
WHEN (NEW.status IN ('pending', 'confirmed'))
EXECUTE FUNCTION check_overlapping_reservations();

-- Recreate check_room_restrictions trigger (if room_restrictions table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_restrictions') THEN
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
    
    CREATE TRIGGER check_room_restrictions_trigger
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION check_room_restrictions();
  END IF;
END $$;

-- Step 11: Verify the fix
SELECT 
  'reservations.id' as column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations' AND column_name = 'id';

