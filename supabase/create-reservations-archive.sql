-- Create enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create reservations_archive table
-- Note: If table already exists, use fix-archive-updated-at.sql to add missing columns
CREATE TABLE IF NOT EXISTS reservations_archive (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL, -- 원본 예약 ID (참고용)
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  purpose TEXT NOT NULL,
  status reservation_status NOT NULL DEFAULT 'confirmed',
  attendees TEXT[] DEFAULT '{}',
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reservations_archive_user_id ON reservations_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_archive_room_id ON reservations_archive(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_archive_start_time ON reservations_archive(start_time);
CREATE INDEX IF NOT EXISTS idx_reservations_archive_archived_at ON reservations_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_reservations_archive_original_id ON reservations_archive(original_id);
CREATE INDEX IF NOT EXISTS idx_reservations_archive_status ON reservations_archive(status);

-- Enable RLS
ALTER TABLE reservations_archive ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reservations_archive
CREATE POLICY "Users can view their own archived reservations"
  ON reservations_archive FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all archived reservations"
  ON reservations_archive FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

-- Function to archive old confirmed reservations (2 weeks after approval)
-- Optimized version with better performance
CREATE OR REPLACE FUNCTION archive_old_reservations()
RETURNS TABLE(archived_count INTEGER, deleted_count INTEGER) AS $$
DECLARE
  archived_count INTEGER := 0;
  deleted_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_date := NOW() - INTERVAL '14 days';
  
  -- Move confirmed reservations that were approved more than 2 weeks ago
  -- Using NOT EXISTS instead of NOT IN for better performance
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
      r.updated_at
    FROM reservations r
    WHERE r.status = 'confirmed'
      AND r.approved_by IS NOT NULL
      AND r.updated_at < cutoff_date
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

  -- Delete archived reservations from main table using the same cutoff date
  DELETE FROM reservations
  WHERE status = 'confirmed'
    AND approved_by IS NOT NULL
    AND updated_at < cutoff_date
    AND EXISTS (
      SELECT 1 FROM reservations_archive ra 
      WHERE ra.original_id = reservations.id
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN QUERY SELECT archived_count, deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run archive function (requires pg_cron extension)
-- Note: This requires pg_cron extension to be enabled in Supabase
-- You can also call this function manually or via a cron job service
-- SELECT cron.schedule('archive-old-reservations', '0 2 * * *', 'SELECT archive_old_reservations();');

