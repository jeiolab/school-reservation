-- Function to update updated_at timestamp (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Room Restrictions table for room-specific usage restrictions
-- Note: room_id type should match the actual type of rooms.id in your database
-- If rooms.id is bigint, use bigint. If it's UUID, use UUID.
CREATE TABLE IF NOT EXISTS room_restrictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  restricted_hours TEXT NOT NULL,
  reason TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES users(id)
);

-- Create unique partial index to ensure only one active restriction per room
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_restrictions_active_unique 
ON room_restrictions(room_id) 
WHERE is_active = true;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_room_restrictions_updated_at ON room_restrictions;
CREATE TRIGGER update_room_restrictions_updated_at BEFORE UPDATE ON room_restrictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically set room to unavailable when restriction is created
CREATE OR REPLACE FUNCTION set_room_unavailable_on_restriction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE rooms SET is_available = false WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_set_room_unavailable ON room_restrictions;
CREATE TRIGGER trigger_set_room_unavailable
  AFTER INSERT ON room_restrictions
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION set_room_unavailable_on_restriction();

-- Trigger to restore room availability when restriction is deactivated
CREATE OR REPLACE FUNCTION restore_room_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Check if there are no other active restrictions for this room
    IF NOT EXISTS (
      SELECT 1 FROM room_restrictions 
      WHERE room_id = NEW.room_id 
      AND id != NEW.id 
      AND is_active = true
    ) THEN
      UPDATE rooms SET is_available = true WHERE id = NEW.room_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_restore_room_availability ON room_restrictions;
CREATE TRIGGER trigger_restore_room_availability
  AFTER UPDATE ON room_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION restore_room_availability();

-- Row Level Security (RLS) policies
ALTER TABLE room_restrictions ENABLE ROW LEVEL SECURITY;

-- Anyone can view active room restrictions
CREATE POLICY "Anyone can view active room restrictions"
  ON room_restrictions FOR SELECT
  USING (true);

-- Only admins and teachers can manage room restrictions
CREATE POLICY "Admins can insert room restrictions"
  ON room_restrictions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Admins can update room restrictions"
  ON room_restrictions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Admins can delete room restrictions"
  ON room_restrictions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

