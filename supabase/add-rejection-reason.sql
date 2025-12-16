-- Add rejection_reason column to reservations table
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

