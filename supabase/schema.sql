-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'rejected');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  student_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  location TEXT NOT NULL,
  facilities TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  restricted_hours TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Reservations table
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  purpose TEXT NOT NULL,
  status reservation_status NOT NULL DEFAULT 'pending',
  attendees TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create indexes for better query performance
CREATE INDEX idx_reservations_user_id ON reservations(user_id);
CREATE INDEX idx_reservations_room_id ON reservations(room_id);
CREATE INDEX idx_reservations_start_time ON reservations(start_time);
CREATE INDEX idx_reservations_end_time ON reservations(end_time);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_time_range ON reservations USING GIST (tstzrange(start_time, end_time));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check for overlapping reservations
-- 개선된 겹침 체크 로직: 두 시간 범위가 겹치는지 확인
-- 겹침 조건: start_time < NEW.end_time AND end_time > NEW.start_time
CREATE OR REPLACE FUNCTION check_overlapping_reservations()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE room_id = NEW.room_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status IN ('pending', 'confirmed')
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION '해당 시간대에 이미 예약이 존재합니다.';
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to prevent double booking
CREATE TRIGGER prevent_overlapping_reservations
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION check_overlapping_reservations();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Rooms policies
CREATE POLICY "Anyone can view available rooms"
  ON rooms FOR SELECT
  USING (true);

-- Reservations policies
CREATE POLICY "Users can view their own reservations"
  ON reservations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reservations"
  ON reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending reservations"
  ON reservations FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admin policies (teachers and admins can view all reservations)
CREATE POLICY "Admins can view all reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Admins can update reservation status"
  ON reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

-- Allow all authenticated users to view confirmed reservations
-- This is necessary for the booking time selection to work properly
-- Users need to see which time slots are already booked by confirmed reservations
CREATE POLICY "Anyone can view confirmed reservations"
  ON reservations FOR SELECT
  USING (status = 'confirmed');

-- Insert sample data (optional, for testing)
-- INSERT INTO rooms (name, capacity, location, facilities) VALUES
-- ('음악실', 30, '2층', ARRAY['피아노', '스피커', '마이크']),
-- ('물리실', 40, '3층', ARRAY['실험대', '컴퓨터', '프로젝터']),
-- ('화학실', 35, '3층', ARRAY['실험대', '후드', '안전장비']),
-- ('미술실', 25, '1층', ARRAY['이젤', '작업대', '도구']);




