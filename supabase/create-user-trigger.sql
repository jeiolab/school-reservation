-- ============================================
-- 자동 사용자 프로필 생성 트리거
-- ============================================
-- auth.users에 사용자가 생성되면 자동으로 public.users에 프로필을 생성합니다
-- 이렇게 하면 RLS 정책 문제를 완전히 우회할 수 있습니다

-- 1. 함수 생성: 새 사용자 프로필 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- public.users 테이블에 사용자 프로필 생성
  -- 이 함수는 service_role 권한으로 실행되므로 RLS를 우회합니다
  INSERT INTO public.users (id, email, name, role, student_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    NULLIF(NEW.raw_user_meta_data->>'student_id', '')
  )
  ON CONFLICT (id) DO NOTHING; -- 이미 존재하면 무시
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 트리거 생성: auth.users에 INSERT 시 자동 실행
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. 확인 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 자동 사용자 프로필 생성 트리거가 생성되었습니다!';
  RAISE NOTICE '이제 회원가입 시 자동으로 public.users에 프로필이 생성됩니다.';
END $$;

