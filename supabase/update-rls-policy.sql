-- Update RLS policy for admins to update reservations
-- This ensures admins can update reservation status and rejection_reason

DROP POLICY IF EXISTS "Admins can update reservation status" ON reservations;

CREATE POLICY "Admins can update reservation status"
  ON reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );




