-- Fix archive_old_reservations function to handle missing updated_at column
-- This function will work even if updated_at column doesn't exist in reservations_archive

-- First, ensure updated_at column exists in reservations_archive
ALTER TABLE reservations_archive 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Update existing rows to have updated_at value if they don't have one
UPDATE reservations_archive 
SET updated_at = COALESCE(updated_at, created_at, archived_at, TIMEZONE('utc', NOW()))
WHERE updated_at IS NULL;

-- Now make it NOT NULL with default
ALTER TABLE reservations_archive 
ALTER COLUMN updated_at SET DEFAULT TIMEZONE('utc', NOW()),
ALTER COLUMN updated_at SET NOT NULL;

-- Fix archive function to use COALESCE for safety
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

