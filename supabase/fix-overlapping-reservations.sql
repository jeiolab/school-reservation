-- 개선된 중복 예약 방지 함수
-- 더 간단하고 정확한 겹침 체크 로직 사용
CREATE OR REPLACE FUNCTION check_overlapping_reservations()
RETURNS TRIGGER AS $$
BEGIN
  -- 두 시간 범위가 겹치는지 확인하는 간단한 로직:
  -- 기존 예약의 시작 시간 < 새 예약의 종료 시간 AND
  -- 기존 예약의 종료 시간 > 새 예약의 시작 시간
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

