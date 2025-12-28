-- ============================================
-- INSERT 정책 확인 쿼리
-- ============================================
-- 이 쿼리를 실행하여 INSERT 정책이 있는지 확인하세요

-- 1. users 테이블의 모든 INSERT 정책 확인
SELECT 
  policyname AS "정책 이름",
  cmd AS "명령",
  with_check AS "WITH CHECK 조건",
  CASE 
    WHEN with_check IS NULL THEN '❌ WITH CHECK 조건 없음'
    WHEN with_check LIKE '%auth.uid()%' THEN '✅ auth.uid() 조건 있음'
    ELSE '⚠️ 다른 조건 사용 중'
  END AS "상태"
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';

-- 2. 결과 해석:
-- - 결과가 비어있으면: INSERT 정책이 없습니다 → fix-user-insert-policy-complete.sql 실행 필요
-- - 결과가 있고 "✅ auth.uid() 조건 있음"이면: 정책이 올바르게 설정되어 있습니다
-- - 결과가 있지만 다른 상태면: 정책 조건을 확인해야 합니다

-- 3. RLS 활성화 여부 확인
SELECT 
  tablename AS "테이블",
  rowsecurity AS "RLS 활성화",
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS 활성화됨'
    ELSE '❌ RLS 비활성화됨'
  END AS "상태"
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

