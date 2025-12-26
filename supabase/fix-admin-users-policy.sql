-- 관리자가 모든 사용자 정보를 볼 수 있도록 RLS 정책 추가
-- 예약 목록 조회 시 users 테이블 조인이 필요하기 때문

-- 기존 정책은 유지하고, 관리자용 정책 추가
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('teacher', 'admin')
    )
  );




