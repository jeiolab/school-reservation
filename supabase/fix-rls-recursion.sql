-- Fix infinite recursion in RLS policies for users table
-- This script should be run in Supabase SQL Editor

-- 1. Create SECURITY DEFINER function to check user role without triggering RLS recursion
CREATE OR REPLACE FUNCTION check_user_role(user_id UUID, allowed_roles user_role[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY DEFINER allows this function to bypass RLS
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_id
    AND users.role = ANY(allowed_roles)
  );
END;
$$;

-- 2. Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can update reservation status" ON reservations;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- 3. Recreate admin policies using the function
CREATE POLICY "Admins can view all reservations"
  ON reservations FOR SELECT
  USING (check_user_role(auth.uid(), ARRAY['teacher', 'admin']::user_role[]));

CREATE POLICY "Admins can update reservation status"
  ON reservations FOR UPDATE
  USING (check_user_role(auth.uid(), ARRAY['teacher', 'admin']::user_role[]));

-- 4. Add policy for admins to view all users (needed for admin dashboard)
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (check_user_role(auth.uid(), ARRAY['teacher', 'admin']::user_role[]));

