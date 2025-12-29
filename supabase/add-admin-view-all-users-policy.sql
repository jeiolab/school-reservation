-- ============================================
-- 관리자가 모든 사용자 정보를 볼 수 있도록 RLS 정책 추가
-- ============================================
-- 예약 목록 조회 시 users 테이블 조인이 필요하기 때문

-- 기존 정책 확인
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'SELECT';

-- 관리자용 정책 추가 (이미 존재하면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Admins can view all users'
    AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Admins can view all users"
      ON users FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND u.role IN ('teacher', 'admin')
        )
      );
    RAISE NOTICE '✅ 관리자용 정책이 생성되었습니다!';
  ELSE
    RAISE NOTICE 'ℹ️ 관리자용 정책이 이미 존재합니다.';
  END IF;
END $$;

-- 최종 정책 확인
SELECT 
  policyname AS "정책 이름",
  cmd AS "명령",
  qual AS "USING 조건"
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'SELECT'
ORDER BY policyname;

