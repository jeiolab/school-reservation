-- Fix approved_by and rejected_by columns type from bigint to UUID
-- This script should be run in Supabase SQL Editor

-- First, check current column types
DO $$
DECLARE
  approved_by_type text;
  rejected_by_type text;
BEGIN
  -- Get current data type of approved_by
  SELECT data_type INTO approved_by_type
  FROM information_schema.columns
  WHERE table_name = 'reservations' 
  AND column_name = 'approved_by';
  
  -- Get current data type of rejected_by
  SELECT data_type INTO rejected_by_type
  FROM information_schema.columns
  WHERE table_name = 'reservations' 
  AND column_name = 'rejected_by';
  
  -- If approved_by exists and is not UUID, fix it
  IF approved_by_type IS NOT NULL AND approved_by_type != 'uuid' THEN
    RAISE NOTICE 'approved_by column type is %, converting to UUID', approved_by_type;
    
    -- Drop the column
    ALTER TABLE reservations DROP COLUMN IF EXISTS approved_by CASCADE;
    
    -- Recreate as UUID
    ALTER TABLE reservations 
    ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'approved_by column converted to UUID';
  END IF;
  
  -- If rejected_by exists and is not UUID, fix it
  IF rejected_by_type IS NOT NULL AND rejected_by_type != 'uuid' THEN
    RAISE NOTICE 'rejected_by column type is %, converting to UUID', rejected_by_type;
    
    -- Drop the column
    ALTER TABLE reservations DROP COLUMN IF EXISTS rejected_by CASCADE;
    
    -- Recreate as UUID
    ALTER TABLE reservations 
    ADD COLUMN rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'rejected_by column converted to UUID';
  END IF;
  
  -- If columns don't exist, create them
  IF approved_by_type IS NULL THEN
    ALTER TABLE reservations 
    ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'approved_by column created as UUID';
  END IF;
  
  IF rejected_by_type IS NULL THEN
    ALTER TABLE reservations 
    ADD COLUMN rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'rejected_by column created as UUID';
  END IF;
END $$;

-- Verify the column types
SELECT 
  column_name, 
  data_type, 
  udt_name
FROM information_schema.columns
WHERE table_name = 'reservations' 
AND column_name IN ('approved_by', 'rejected_by');

