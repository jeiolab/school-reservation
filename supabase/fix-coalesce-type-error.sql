-- Fix COALESCE type mismatch error in check_overlapping_reservations function
-- This script should be run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION check_overlapping_reservations()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE room_id = NEW.room_id
      AND (NEW.id IS NULL OR id::uuid != NEW.id::uuid)
      AND status IN ('pending', 'confirmed')
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION '해당 시간대에 이미 예약이 존재합니다.';
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

