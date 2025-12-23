-- Add approved_by column to reservations table
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_reservations_approved_by ON reservations(approved_by);

