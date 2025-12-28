-- ============================================
-- 정책 충돌 해결 스크립트
-- ============================================
-- "Public Access" 정책이 INSERT와 충돌할 수 있으므로 수정합니다

-- 1단계: 기존 Public Access 정책 삭제
-- 이 정책은 보안상 위험할 수 있으며 INSERT와 충돌할 수 있습니다
DROP POLICY IF EXISTS "Public Access" ON users;

-- 2단계: 필요한 정책만 유지
-- 다음 정책들이 올바르게 설정되어 있는지 확인:

-- SELECT 정책: 사용자는 자신의 프로필만 볼 수 있음
-- (이미 "Users can view their own profile" 정책이 있음)

-- INSERT 정책: 사용자는 자신의 프로필만 생성할 수 있음
-- (이미 "Users can insert their own profile" 정책이 있음)

-- UPDATE 정책: 사용자는 자신의 프로필만 수정할 수 있음
-- (이미 "Users can update their own profile" 정책이 있음)

-- 3단계: 최종 정책 목록 확인
SELECT 
  policyname AS "정책 이름",
  cmd AS "명령",
  CASE 
    WHEN qual IS NOT NULL THEN qual
    ELSE 'null'
  END AS "USING 조건",
  CASE 
    WHEN with_check IS NOT NULL THEN with_check
    ELSE 'null'
  END AS "WITH CHECK 조건"
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- 4단계: 예상 결과
-- 다음 정책들만 있어야 합니다:
-- - "Users can view their own profile" (SELECT)
-- - "Users can insert their own profile" (INSERT)
-- - "Users can update their own profile" (UPDATE)

