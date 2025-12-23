-- Add restricted_hours column to rooms table if it doesn't exist
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS restricted_hours TEXT;


