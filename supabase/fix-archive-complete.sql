-- Complete fix for archive function and reservations_archive table
-- This script fixes all issues: updated_at columns, room_id type mismatch, and archive function

-- ============================================
-- Step 1: Fix reservations table updated_at
-- ============================================
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

UPDATE reservations 
SET updated_at = created_at 
WHERE updated_at IS NULL;

ALTER TABLE reservations 
ALTER COLUMN updated_at SET DEFAULT TIMEZONE('utc', NOW()),
ALTER COLUMN updated_at SET NOT NULL;

-- ============================================
-- Step 2: Fix reservations_archive table updated_at
-- ============================================
ALTER TABLE reservations_archive 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

UPDATE reservations_archive 
SET updated_at = COALESCE(updated_at, created_at, archived_at, TIMEZONE('utc', NOW()))
WHERE updated_at IS NULL;

ALTER TABLE reservations_archive 
ALTER COLUMN updated_at SET DEFAULT TIMEZONE('utc', NOW()),
ALTER COLUMN updated_at SET NOT NULL;

-- ============================================
-- Step 3: Fix reservations_archive room_id type (BIGINT -> UUID)
-- ============================================
DO $$
DECLARE
  rooms_id_type TEXT;
  archive_room_id_type TEXT;
BEGIN
  -- Check rooms.id type
  SELECT data_type INTO rooms_id_type
  FROM information_schema.columns 
  WHERE table_schema = 'public'
  AND table_name = 'rooms' 
  AND column_name = 'id';
  
  -- Check reservations_archive.room_id type
  SELECT data_type INTO archive_room_id_type
  FROM information_schema.columns 
  WHERE table_schema = 'public'
  AND table_name = 'reservations_archive' 
  AND column_name = 'room_id';
  
  -- Only proceed if reservations_archive.room_id is BIGINT and needs to be changed
  IF archive_room_id_type = 'bigint' THEN
    -- Drop foreign key constraint
    ALTER TABLE reservations_archive 
    DROP CONSTRAINT IF EXISTS reservations_archive_room_id_fkey;
    
    -- If rooms.id is UUID, convert room_id to UUID
    IF rooms_id_type = 'uuid' THEN
      -- Add temporary UUID column
      ALTER TABLE reservations_archive 
      ADD COLUMN room_id_new UUID;
      
      -- Populate new column from reservations table using original_id
      -- Get UUID from rooms table by matching room_id
      UPDATE reservations_archive ra
      SET room_id_new = (
        SELECT rm.id
        FROM reservations r
        JOIN rooms rm ON r.room_id::text = rm.id::text
        WHERE CAST(ra.original_id AS TEXT) = CAST(r.id AS TEXT)
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM reservations r
        WHERE CAST(ra.original_id AS TEXT) = CAST(r.id AS TEXT)
      );
      
      -- Drop old column
      ALTER TABLE reservations_archive 
      DROP COLUMN room_id;
      
      -- Rename new column
      ALTER TABLE reservations_archive 
      RENAME COLUMN room_id_new TO room_id;
      
      -- Set NOT NULL constraint (only if all rows have room_id)
      IF NOT EXISTS (SELECT 1 FROM reservations_archive WHERE room_id IS NULL) THEN
        ALTER TABLE reservations_archive 
        ALTER COLUMN room_id SET NOT NULL;
      END IF;
      
      -- Recreate foreign key constraint
      ALTER TABLE reservations_archive 
      ADD CONSTRAINT reservations_archive_room_id_fkey 
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
    ELSE
      -- If rooms.id is also BIGINT, keep room_id as BIGINT
      -- Just ensure the foreign key constraint exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND table_name = 'reservations_archive'
        AND constraint_name = 'reservations_archive_room_id_fkey'
      ) THEN
        ALTER TABLE reservations_archive 
        ADD CONSTRAINT reservations_archive_room_id_fkey 
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================
-- Step 4: Fix archive_old_reservations function
-- ============================================
CREATE OR REPLACE FUNCTION archive_old_reservations()
RETURNS TABLE(archived_count INTEGER, deleted_count INTEGER) AS $$
DECLARE
  archived_count INTEGER := 0;
  deleted_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_date := NOW() - INTERVAL '14 days';
  
  -- Move confirmed reservations that were approved more than 2 weeks ago
  -- Use COALESCE to handle cases where updated_at might be NULL
  WITH to_archive AS (
    SELECT 
      r.id,
      r.user_id,
      r.room_id,
      r.start_time,
      r.end_time,
      r.purpose,
      r.status,
      r.attendees,
      r.approved_by,
      r.rejection_reason,
      r.created_at,
      COALESCE(r.updated_at, r.created_at) as updated_at
    FROM reservations r
    WHERE r.status = 'confirmed'
      AND r.approved_by IS NOT NULL
      AND COALESCE(r.updated_at, r.created_at) < cutoff_date
      AND NOT EXISTS (
        SELECT 1 FROM reservations_archive ra 
        WHERE ra.original_id = r.id
      )
  )
  INSERT INTO reservations_archive (
    original_id,
    user_id,
    room_id,
    start_time,
    end_time,
    purpose,
    status,
    attendees,
    approved_by,
    rejection_reason,
    created_at,
    updated_at,
    archived_at
  )
  SELECT 
    id,
    user_id,
    room_id,
    start_time,
    end_time,
    purpose,
    status,
    attendees,
    approved_by,
    rejection_reason,
    created_at,
    updated_at,
    TIMEZONE('utc', NOW())
  FROM to_archive;

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  -- Delete archived reservations from main table
  DELETE FROM reservations
  WHERE status = 'confirmed'
    AND approved_by IS NOT NULL
    AND COALESCE(updated_at, created_at) < cutoff_date
    AND EXISTS (
      SELECT 1 FROM reservations_archive ra 
      WHERE ra.original_id = reservations.id
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN QUERY SELECT archived_count, deleted_count;
END;
$$ LANGUAGE plpgsql;

