-- Add DELETE policy for admins to delete reservations
CREATE POLICY "Admins can delete reservations"
  ON reservations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

