-- ============================================
-- 회원가입 오류 완전 해결 스크립트
-- ============================================
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- 1단계: 기존 정책 확인 및 삭제
DO $$
BEGIN
  -- 기존 INSERT 정책이 있는지 확인하고 삭제
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can insert their own profile'
  ) THEN
    DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
    RAISE NOTICE '기존 정책 삭제 완료';
  ELSE
    RAISE NOTICE '기존 정책이 없습니다. 새로 생성합니다.';
  END IF;
END $$;

-- 2단계: RLS가 활성화되어 있는지 확인하고 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3단계: INSERT 정책 생성
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4단계: 정책이 제대로 생성되었는지 확인
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';

-- 성공 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 정책이 성공적으로 생성되었습니다!';
  RAISE NOTICE '이제 회원가입을 다시 시도해보세요.';
END $$;

