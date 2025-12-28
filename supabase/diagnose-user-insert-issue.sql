-- ============================================
-- 회원가입 오류 진단 스크립트
-- ============================================
-- 이 스크립트를 Supabase SQL Editor에서 실행하여 문제를 진단하세요

-- 1. 현재 users 테이블의 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 2. users 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 3. RLS가 활성화되어 있는지 확인
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- 4. users 테이블의 제약 조건 확인
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
ORDER BY conname;

-- 5. 현재 존재하는 INSERT 정책 확인 (상세)
SELECT 
  policyname,
  cmd,
  qual,
  with_check,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK 조건: ' || with_check
    ELSE 'WITH CHECK 조건 없음'
  END AS check_condition
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';

-- 6. 인증된 사용자 정보 확인 (현재 세션이 있는 경우)
SELECT 
  auth.uid() AS current_user_id,
  auth.email() AS current_user_email,
  auth.role() AS current_user_role;

