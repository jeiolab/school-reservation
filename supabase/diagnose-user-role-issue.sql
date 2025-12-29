-- ============================================
-- 사용자 역할 표시 문제 진단 스크립트
-- ============================================
-- 대시보드에서 교사가 학생으로 표시되는 문제를 진단합니다

-- 1단계: 현재 인증된 사용자 확인
-- (Supabase SQL Editor에서 실행 시 auth.uid()가 작동하지 않을 수 있음)
-- 대신 특정 사용자 ID로 확인하려면 아래 쿼리를 수정하세요

-- 예시: 특정 이메일의 사용자 확인
-- SELECT 
--   u.id,
--   u.email,
--   u.name,
--   u.role,
--   u.student_id,
--   u.created_at,
--   u.updated_at
-- FROM users u
-- WHERE u.email = 'teacher@example.com'; -- 실제 교사 이메일로 변경

-- 2단계: RLS 정책 확인
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
ORDER BY cmd, policyname;

-- 3단계: 사용자가 자신의 프로필을 볼 수 있는지 테스트
-- (실제 사용자 ID로 변경 필요)
-- SELECT 
--   id,
--   email,
--   name,
--   role,
--   student_id
-- FROM users
-- WHERE id = auth.uid();

-- 4단계: 모든 사용자 역할 확인 (관리자 권한 필요)
-- RLS 정책 때문에 이 쿼리는 관리자만 실행 가능
SELECT 
  id,
  email,
  name,
  role,
  student_id,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 20;

-- 5단계: 특정 사용자의 실제 역할 확인
-- 아래 쿼리에서 이메일을 실제 교사 이메일로 변경하세요
-- SELECT 
--   u.id,
--   u.email,
--   u.name,
--   u.role,
--   CASE 
--     WHEN u.role = 'teacher' THEN '✅ 교사'
--     WHEN u.role = 'admin' THEN '✅ 관리자'
--     WHEN u.role = 'student' THEN '❌ 학생 (문제!)'
--     ELSE '❓ 알 수 없음'
--   END AS role_status
-- FROM users u
-- WHERE u.email = 'teacher@example.com'; -- 실제 교사 이메일로 변경

-- 6단계: RLS 정책이 올바르게 작동하는지 확인
-- "Users can view their own profile" 정책 확인
SELECT 
  policyname,
  cmd,
  qual AS using_condition,
  with_check AS with_check_condition
FROM pg_policies
WHERE tablename = 'users' 
  AND policyname = 'Users can view their own profile';

-- 7단계: 관리자가 모든 사용자를 볼 수 있는 정책 확인
SELECT 
  policyname,
  cmd,
  qual AS using_condition
FROM pg_policies
WHERE tablename = 'users' 
  AND policyname = 'Admins can view all users';

-- 8단계: 문제 해결을 위한 체크리스트
-- ✅ users 테이블에 해당 사용자의 role이 'teacher' 또는 'admin'으로 설정되어 있는가?
-- ✅ RLS 정책 "Users can view their own profile"이 존재하는가?
-- ✅ auth.uid()가 올바르게 작동하는가? (세션이 제대로 설정되어 있는가?)
-- ✅ 쿠키에 sb-access-token과 sb-refresh-token이 올바르게 설정되어 있는가?

