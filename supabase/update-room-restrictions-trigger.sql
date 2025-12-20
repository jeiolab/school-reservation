-- Update trigger to only set room unavailable for "전체 기간" restrictions
CREATE OR REPLACE FUNCTION set_room_unavailable_on_restriction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true AND NEW.restricted_hours LIKE '전체 기간%' THEN
    UPDATE rooms SET is_available = false WHERE id = NEW.room_id;
  ELSIF NEW.is_active = true AND NOT (NEW.restricted_hours LIKE '전체 기간%') THEN
    -- For non-"전체 기간" restrictions, ensure room is available
    UPDATE rooms SET is_available = true WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update trigger to restore room availability when restriction is deactivated
CREATE OR REPLACE FUNCTION restore_room_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Check if there are no other active "전체 기간" restrictions for this room
    IF NOT EXISTS (
      SELECT 1 FROM room_restrictions 
      WHERE room_id = NEW.room_id 
      AND id != NEW.id 
      AND is_active = true
      AND restricted_hours LIKE '전체 기간%'
    ) THEN
      UPDATE rooms SET is_available = true WHERE id = NEW.room_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to check if reservation time conflicts with room restrictions
CREATE OR REPLACE FUNCTION check_room_restrictions()
RETURNS TRIGGER AS $$
DECLARE
  restriction_record RECORD;
  reservation_date DATE;
  reservation_day_of_week INTEGER;
  reservation_start_time TIME;
  reservation_end_time TIME;
  restriction_start_time TIME;
  restriction_end_time TIME;
  restriction_date_start DATE;
  restriction_date_end DATE;
  restriction_text TEXT;
BEGIN
  -- Get all active restrictions for this room
  FOR restriction_record IN 
    SELECT * FROM room_restrictions 
    WHERE room_id = NEW.room_id 
    AND is_active = true
  LOOP
    restriction_text := restriction_record.restricted_hours;
    reservation_date := NEW.start_time::DATE;
    reservation_day_of_week := EXTRACT(DOW FROM reservation_date); -- 0=Sunday, 6=Saturday
    reservation_start_time := NEW.start_time::TIME;
    reservation_end_time := NEW.end_time::TIME;
    
    -- Check if it's "전체 기간" - should be blocked by is_available flag
    IF restriction_text LIKE '전체 기간%' THEN
      CONTINUE; -- Already handled by is_available flag
    END IF;
    
    -- Check if it's "평일" (Monday-Friday, DOW 1-5)
    IF restriction_text LIKE '평일%' THEN
      IF reservation_day_of_week BETWEEN 1 AND 5 THEN
        -- Check if time range is specified
        IF restriction_text ~ '\d{2}:\d{2}\s*-\s*\d{2}:\d{2}' THEN
          restriction_start_time := (regexp_match(restriction_text, '(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})'))[1]::TIME;
          restriction_end_time := (regexp_match(restriction_text, '(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})'))[2]::TIME;
          
          -- Check if reservation overlaps with restricted time
          IF (reservation_start_time < restriction_end_time AND reservation_end_time > restriction_start_time) THEN
            RAISE EXCEPTION '해당 시간대는 사용금지 시간입니다. (%)', restriction_record.reason;
          END IF;
        ELSE
          -- No time specified, entire weekday is restricted
          RAISE EXCEPTION '해당 날짜는 사용금지 날짜입니다. (%)', restriction_record.reason;
        END IF;
      END IF;
    END IF;
    
    -- Check if it's "주말" (Saturday-Sunday, DOW 0, 6)
    IF restriction_text LIKE '주말%' THEN
      IF reservation_day_of_week IN (0, 6) THEN
        -- Check if time range is specified
        IF restriction_text ~ '\d{2}:\d{2}\s*-\s*\d{2}:\d{2}' THEN
          restriction_start_time := (regexp_match(restriction_text, '(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})'))[1]::TIME;
          restriction_end_time := (regexp_match(restriction_text, '(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})'))[2]::TIME;
          
          -- Check if reservation overlaps with restricted time
          IF (reservation_start_time < restriction_end_time AND reservation_end_time > restriction_start_time) THEN
            RAISE EXCEPTION '해당 시간대는 사용금지 시간입니다. (%)', restriction_record.reason;
          END IF;
        ELSE
          -- No time specified, entire weekend is restricted
          RAISE EXCEPTION '해당 날짜는 사용금지 날짜입니다. (%)', restriction_record.reason;
        END IF;
      END IF;
    END IF;
    
    -- Check if it's a specific date range (format: yyyy년 MM월 dd일 or yyyy년 MM월 dd일 - yyyy년 MM월 dd일)
    IF restriction_text ~ '\d{4}년\s*\d{1,2}월\s*\d{1,2}일' THEN
      -- Parse date from restriction text
      IF restriction_text ~ '\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*-\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일' THEN
        -- Date range
        restriction_date_start := TO_DATE(
          regexp_replace(restriction_text, '(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*', '\1-\2-\3'),
          'YYYY-MM-DD'
        );
        restriction_date_end := TO_DATE(
          regexp_replace(restriction_text, '.*-\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*', '\1-\2-\3'),
          'YYYY-MM-DD'
        );
        
        IF reservation_date BETWEEN restriction_date_start AND restriction_date_end THEN
          -- Check if time range is specified
          IF restriction_text ~ '\d{2}:\d{2}\s*-\s*\d{2}:\d{2}' THEN
            restriction_start_time := (regexp_match(restriction_text, '(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})'))[1]::TIME;
            restriction_end_time := (regexp_match(restriction_text, '(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})'))[2]::TIME;
            
            -- Check if reservation overlaps with restricted time
            IF (reservation_start_time < restriction_end_time AND reservation_end_time > restriction_start_time) THEN
              RAISE EXCEPTION '해당 시간대는 사용금지 시간입니다. (%)', restriction_record.reason;
            END IF;
          ELSE
            -- No time specified, entire date range is restricted
            RAISE EXCEPTION '해당 날짜는 사용금지 날짜입니다. (%)', restriction_record.reason;
          END IF;
        END IF;
      ELSE
        -- Single date
        restriction_date_start := TO_DATE(
          regexp_replace(restriction_text, '(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*', '\1-\2-\3'),
          'YYYY-MM-DD'
        );
        
        IF reservation_date = restriction_date_start THEN
          -- Check if time range is specified
          IF restriction_text ~ '\d{2}:\d{2}\s*-\s*\d{2}:\d{2}' THEN
            restriction_start_time := (regexp_match(restriction_text, '(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})'))[1]::TIME;
            restriction_end_time := (regexp_match(restriction_text, '(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})'))[2]::TIME;
            
            -- Check if reservation overlaps with restricted time
            IF (reservation_start_time < restriction_end_time AND reservation_end_time > restriction_start_time) THEN
              RAISE EXCEPTION '해당 시간대는 사용금지 시간입니다. (%)', restriction_record.reason;
            END IF;
          ELSE
            -- No time specified, entire date is restricted
            RAISE EXCEPTION '해당 날짜는 사용금지 날짜입니다. (%)', restriction_record.reason;
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to check room restrictions before reservation
DROP TRIGGER IF EXISTS check_room_restrictions_trigger ON reservations;
CREATE TRIGGER check_room_restrictions_trigger
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION check_room_restrictions();

