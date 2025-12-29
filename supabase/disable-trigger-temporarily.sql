-- ============================================
-- 트리거 일시적으로 비활성화
-- ============================================
-- 트리거가 오류를 발생시키는 경우 이 스크립트로 비활성화하세요

-- 트리거 비활성화
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- 확인
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' 
  AND trigger_schema = 'auth';

