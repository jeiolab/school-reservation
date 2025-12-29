-- ============================================
-- 트리거 다시 활성화
-- ============================================
-- 트리거를 다시 활성화하려면 이 스크립트를 실행하세요

-- 트리거 활성화
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- 확인
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' 
  AND trigger_schema = 'auth';

