-- Add updated_at column to reservations table if it doesn't exist
-- This script ensures the updated_at column exists for the archive function

ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Update existing rows to have updated_at value if they don't have one
UPDATE reservations 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Make it NOT NULL with default (if it was nullable)
ALTER TABLE reservations 
ALTER COLUMN updated_at SET DEFAULT TIMEZONE('utc', NOW()),
ALTER COLUMN updated_at SET NOT NULL;

-- Create trigger to automatically update updated_at on UPDATE
-- Only create if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_reservations_updated_at'
  ) THEN
    CREATE TRIGGER update_reservations_updated_at 
    BEFORE UPDATE ON reservations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

