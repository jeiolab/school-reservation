-- Fix missing updated_at column in reservations_archive table
-- This script adds the updated_at column if it doesn't exist

ALTER TABLE reservations_archive 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW());

-- Update existing rows to have updated_at value if they don't have one
UPDATE reservations_archive 
SET updated_at = created_at 
WHERE updated_at IS NULL;


