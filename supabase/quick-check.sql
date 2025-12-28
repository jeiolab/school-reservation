-- ============================================
-- 빠른 확인 쿼리
-- ============================================
-- 이 쿼리로 INSERT 정책이 있는지 즉시 확인하세요

-- INSERT 정책 확인
SELECT 
  policyname AS "정책 이름",
  cmd AS "명령",
  with_check AS "WITH CHECK 조건"
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';

-- 결과 해석:
-- ✅ 결과가 1개 행이 있고 "Users can insert their own profile"이면 → 정책이 있습니다
-- ❌ 결과가 비어있으면 → 정책이 없습니다 (fix-user-insert-policy-complete.sql 실행 필요)

