-- Fix updated_at trigger function to handle INSERT and UPDATE operations safely
-- This ensures the function works correctly with both INSERT and UPDATE operations

-- Update the function to only set updated_at on UPDATE, not on INSERT
-- INSERT 시에는 DEFAULT 값이 사용되고, UPDATE 시에만 updated_at을 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update updated_at on UPDATE operations, not on INSERT
  -- INSERT 시에는 DEFAULT 값이 자동으로 설정됨
  IF TG_OP = 'UPDATE' THEN
    -- Check if updated_at column exists before setting it
    IF TG_TABLE_NAME = 'users' THEN
      NEW.updated_at = TIMEZONE('utc', NOW());
    ELSIF TG_TABLE_NAME = 'rooms' THEN
      NEW.updated_at = TIMEZONE('utc', NOW());
    ELSIF TG_TABLE_NAME = 'reservations' THEN
      NEW.updated_at = TIMEZONE('utc', NOW());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure users table has updated_at column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Recreate trigger to work with UPDATE only (INSERT는 DEFAULT 값 사용)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

