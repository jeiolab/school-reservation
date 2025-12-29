-- ============================================
-- 회원가입 오류 최종 해결 스크립트
-- ============================================
-- 이 스크립트를 Supabase SQL Editor에서 순서대로 실행하세요

-- ============================================
-- 1단계: 현재 상태 확인
-- ============================================
-- 먼저 현재 정책 상태를 확인합니다
SELECT 
  policyname AS "정책 이름",
  cmd AS "명령",
  qual AS "USING 조건",
  with_check AS "WITH CHECK 조건"
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- ============================================
-- 2단계: 문제가 되는 정책 제거
-- ============================================
-- "Public Access" 같은 충돌하는 정책이 있다면 삭제
DROP POLICY IF EXISTS "Public Access" ON users;

-- ============================================
-- 3단계: 기존 INSERT 정책 재생성
-- ============================================
-- 기존 정책을 삭제하고 다시 생성합니다
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- RLS 활성화 확인
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- INSERT 정책 재생성 (auth.uid()가 null이 아닐 때만 작동)
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 4단계: 추가 정책 확인 및 생성
-- ============================================
-- SELECT 정책이 있는지 확인 (없으면 생성)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can view their own profile'
    AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON users FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

-- UPDATE 정책이 있는지 확인 (없으면 생성)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can update their own profile'
    AND cmd = 'UPDATE'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON users FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ============================================
-- 5단계: 최종 확인
-- ============================================
-- 정책이 올바르게 생성되었는지 확인
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

-- 예상 결과:
-- 1. "Users can view their own profile" (SELECT) - USING: (auth.uid() = id)
-- 2. "Users can insert their own profile" (INSERT) - WITH CHECK: (auth.uid() = id)
-- 3. "Users can update their own profile" (UPDATE) - USING: (auth.uid() = id), WITH CHECK: (auth.uid() = id)

