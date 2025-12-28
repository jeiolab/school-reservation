-- Fix: Add INSERT policy for users table
-- This allows users to create their own profile during signup

-- Drop the policy if it already exists (for idempotency)
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create the INSERT policy
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

