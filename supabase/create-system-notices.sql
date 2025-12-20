-- System Notices table for global announcements
CREATE TABLE IF NOT EXISTS system_notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restricted_hours TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_system_notices_updated_at BEFORE UPDATE ON system_notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE system_notices ENABLE ROW LEVEL SECURITY;

-- Anyone can view system notices
CREATE POLICY "Anyone can view system notices"
  ON system_notices FOR SELECT
  USING (true);

-- Only admins and teachers can update system notices
CREATE POLICY "Admins can update system notices"
  ON system_notices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Admins can insert system notices"
  ON system_notices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

-- Insert initial empty notice if none exists
INSERT INTO system_notices (id, restricted_hours, notes)
VALUES ('00000000-0000-0000-0000-000000000000', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

