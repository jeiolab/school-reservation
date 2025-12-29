-- ============================================
-- 회원가입 INSERT 테스트 쿼리
-- ============================================
-- 이 쿼리로 실제 INSERT가 작동하는지 확인합니다

-- 1. 현재 인증된 사용자 확인 (세션이 있는 경우)
SELECT 
  auth.uid() AS "현재 사용자 ID",
  auth.email() AS "현재 사용자 이메일",
  auth.role() AS "현재 사용자 역할";

-- 2. users 테이블의 제약 조건 확인
SELECT
  conname AS "제약 조건 이름",
  contype AS "제약 타입",
  CASE contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'n' THEN 'NOT NULL'
    ELSE contype::text
  END AS "제약 타입 설명",
  pg_get_constraintdef(oid) AS "제약 조건 정의"
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
ORDER BY contype, conname;

-- 3. 이메일 중복 확인 (테스트용)
-- 회원가입 시도하는 이메일로 변경하여 실행
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM users
WHERE email = 'test@example.com';  -- 실제 테스트 이메일로 변경

-- 4. users 테이블 구조 확인
SELECT 
  column_name AS "컬럼 이름",
  data_type AS "데이터 타입",
  is_nullable AS "NULL 허용",
  column_default AS "기본값"
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 5. 트리거 확인 (트리거가 오류를 발생시킬 수 있음)
SELECT
  trigger_name AS "트리거 이름",
  event_manipulation AS "이벤트",
  action_timing AS "시점",
  action_statement AS "트리거 내용"
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;

