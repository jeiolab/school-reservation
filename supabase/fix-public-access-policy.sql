-- ============================================
-- Public Access 정책 수정
-- ============================================
-- "Public Access" 정책이 INSERT와 충돌할 수 있으므로 수정합니다

-- 1. 기존 Public Access 정책 확인
SELECT 
  policyname,
  cmd,
  qual AS "USING 조건",
  with_check AS "WITH CHECK 조건"
FROM pg_policies
WHERE tablename = 'users' AND policyname = 'Public Access';

-- 2. Public Access 정책 삭제 (ALL 명령은 위험할 수 있음)
DROP POLICY IF EXISTS "Public Access" ON users;

-- 3. 대신 SELECT만 허용하는 안전한 정책 생성 (필요한 경우)
-- 주의: 이 정책은 모든 사용자가 모든 사용자 정보를 볼 수 있게 합니다
-- 보안상 필요하지 않다면 이 단계를 건너뛰세요
-- CREATE POLICY "Public can view users"
--   ON users FOR SELECT
--   USING (true);

-- 4. INSERT 정책 확인 (이미 올바르게 설정되어 있어야 함)
SELECT 
  policyname,
  cmd,
  with_check AS "WITH CHECK 조건"
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';

-- 5. 최종 정책 목록 확인
SELECT 
  policyname AS "정책 이름",
  cmd AS "명령",
  qual AS "USING 조건",
  with_check AS "WITH CHECK 조건"
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

