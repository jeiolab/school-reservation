-- Add rejection_reason column to reservations table if it doesn't exist
-- This script fixes the "rejection_reason 필드가 데이터베이스에 없습니다" error

-- Step 1: Add the column
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 2: Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND column_name = 'rejection_reason';

-- Step 3: Check existing rejected reservations
SELECT id, status, rejection_reason, created_at
FROM reservations 
WHERE status = 'rejected'
ORDER BY created_at DESC
LIMIT 10;

