-- Fix: Allow all authenticated users to view confirmed reservations
-- This is necessary for the booking time selection to work properly
-- Users need to see which time slots are already booked by confirmed reservations

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view confirmed reservations" ON reservations;

-- Create new policy: Anyone can view confirmed reservations
-- This allows users to see which time slots are already booked
-- when selecting a time for their own reservation
CREATE POLICY "Anyone can view confirmed reservations"
  ON reservations FOR SELECT
  USING (status = 'confirmed');

-- Note: This policy works alongside existing policies:
-- - "Users can view their own reservations" (for all statuses of their own reservations)
-- - "Admins can view all reservations" (for admins to see everything)
-- 
-- With this new policy, any authenticated user can see confirmed reservations
-- from any user, which is necessary for the booking system to show
-- which time slots are unavailable.

