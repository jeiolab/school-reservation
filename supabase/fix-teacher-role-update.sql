-- ============================================
-- 교사 역할 업데이트 스크립트
-- ============================================
-- 기존 교사 사용자의 role이 'student'로 잘못 설정된 경우 수정

-- 1단계: 교사 이메일로 사용자 찾기 및 역할 확인
-- 아래 쿼리에서 실제 교사 이메일로 변경하세요
-- SELECT 
--   id,
--   email,
--   name,
--   role,
--   CASE 
--     WHEN role = 'teacher' THEN '✅ 올바름'
--     WHEN role = 'student' THEN '❌ 수정 필요'
--     ELSE '❓ 알 수 없음'
--   END AS status
-- FROM users
-- WHERE email LIKE '%@h.jne.go.kr' -- 교사 이메일 도메인으로 필터링
-- ORDER BY created_at DESC;

-- 2단계: 특정 교사 사용자의 역할을 'teacher'로 업데이트
-- 아래 쿼리에서 실제 교사 이메일로 변경하세요
-- UPDATE users
-- SET role = 'teacher'
-- WHERE email = 'teacher@example.com' -- 실제 교사 이메일로 변경
--   AND role != 'teacher';

-- 3단계: 모든 교사 이메일 도메인 사용자의 역할을 'teacher'로 일괄 업데이트
-- 주의: 이 쿼리는 교사 이메일 도메인을 정확히 알고 있을 때만 사용하세요
-- UPDATE users
-- SET role = 'teacher'
-- WHERE email LIKE '%@h.jne.go.kr' -- 실제 교사 이메일 도메인으로 변경
--   AND role != 'teacher';

-- 4단계: 업데이트 결과 확인
-- SELECT 
--   id,
--   email,
--   name,
--   role,
--   updated_at
-- FROM users
-- WHERE role = 'teacher'
-- ORDER BY updated_at DESC;

-- 5단계: RLS 정책 확인 - 사용자가 자신의 프로필을 업데이트할 수 있는지
SELECT 
  policyname,
  cmd,
  qual AS using_condition,
  with_check AS with_check_condition
FROM pg_policies
WHERE tablename = 'users' 
  AND cmd = 'UPDATE';

-- 성공 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 교사 역할 업데이트 스크립트 준비 완료';
  RAISE NOTICE '위 쿼리들을 실행하기 전에 이메일 주소를 실제 교사 이메일로 변경하세요.';
END $$;

