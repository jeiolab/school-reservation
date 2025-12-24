-- Add rejected_by column to reservations table
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_reservations_rejected_by ON reservations(rejected_by);

-- Add rejected_by column to reservations_archive table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservations_archive') THEN
    ALTER TABLE reservations_archive 
    ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_reservations_archive_rejected_by ON reservations_archive(rejected_by);
  END IF;
END $$;

