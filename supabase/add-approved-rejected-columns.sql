-- Add approved_by and rejected_by columns to reservations table
-- This script should be run in Supabase SQL Editor if columns don't exist

-- Add rejection_reason column if it doesn't exist
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add approved_by column if it doesn't exist (UUID type)
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add rejected_by column if it doesn't exist (UUID type)
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- If columns exist but are wrong type (e.g., bigint), drop and recreate
DO $$
BEGIN
  -- Check if approved_by exists and is not UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' 
    AND column_name = 'approved_by'
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE reservations DROP COLUMN approved_by;
    ALTER TABLE reservations 
    ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Check if rejected_by exists and is not UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' 
    AND column_name = 'rejected_by'
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE reservations DROP COLUMN rejected_by;
    ALTER TABLE reservations 
    ADD COLUMN rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

