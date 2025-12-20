-- Add missing columns to rooms table if they don't exist
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS restricted_hours TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

