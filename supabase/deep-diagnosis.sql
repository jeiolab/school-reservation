-- ============================================
-- 심화 진단 쿼리
-- ============================================
-- 정책이 있는데도 오류가 발생하는 경우 실행하세요

-- 1. users 테이블의 모든 제약 조건 확인
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

-- 2. 이메일 중복 확인 (테스트용)
-- 실제 회원가입 시도하는 이메일로 변경하여 실행
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM users
WHERE email = 'test@example.com';  -- 실제 테스트 이메일로 변경

-- 3. users 테이블의 인덱스 확인
SELECT
  indexname AS "인덱스 이름",
  indexdef AS "인덱스 정의"
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;

-- 4. 트리거 확인
SELECT
  trigger_name AS "트리거 이름",
  event_manipulation AS "이벤트",
  action_statement AS "트리거 내용"
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;

-- 5. RLS 정책의 상세 정보 (모든 정책)
SELECT 
  policyname AS "정책 이름",
  cmd AS "명령",
  permissive AS "허용/제한",
  roles AS "역할",
  qual AS "USING 조건",
  with_check AS "WITH CHECK 조건"
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

