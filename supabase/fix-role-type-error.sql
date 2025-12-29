-- Fix "operator does not exist: text = user_role" error
-- This script should be run in Supabase SQL Editor

-- Recreate the function with explicit type casting
CREATE OR REPLACE FUNCTION check_user_role(user_id UUID, allowed_roles user_role[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY DEFINER allows this function to bypass RLS
  -- Explicitly cast role to text to avoid type mismatch with enum
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_id
    AND users.role::text = ANY(SELECT unnest(allowed_roles)::text)
  );
END;
$$;

