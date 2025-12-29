-- ============================================
-- 안전한 트리거 재생성
-- ============================================
-- 기존 트리거를 삭제하고 개선된 버전으로 재생성합니다

-- 1단계: 기존 트리거 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2단계: 기존 함수 삭제
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3단계: 개선된 함수 생성 (오류 처리 포함)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_role_text TEXT;
  user_student_id TEXT;
  final_role user_role;
BEGIN
  -- metadata에서 정보 추출 (안전하게)
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1) -- 이메일에서 이름 추출 (fallback)
  );
  
  -- name이 여전히 비어있으면 기본값 사용
  IF user_name IS NULL OR user_name = '' THEN
    user_name := '사용자';
  END IF;
  
  -- role 추출 (안전하게)
  user_role_text := NEW.raw_user_meta_data->>'role';
  
  -- role을 user_role enum으로 변환 (안전하게)
  BEGIN
    IF user_role_text IS NULL OR user_role_text = '' THEN
      final_role := 'student';
    ELSE
      final_role := user_role_text::user_role;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      final_role := 'student'; -- 기본값
  END;
  
  -- student_id 추출
  user_student_id := NULLIF(NEW.raw_user_meta_data->>'student_id', '');
  
  -- public.users 테이블에 사용자 프로필 생성
  -- 이 함수는 SECURITY DEFINER로 실행되므로 RLS를 우회합니다
  INSERT INTO public.users (id, email, name, role, student_id)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    final_role,
    user_student_id
  )
  ON CONFLICT (id) DO NOTHING; -- 이미 존재하면 무시
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 오류 발생 시 로그만 남기고 계속 진행 (auth.users 생성은 성공)
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4단계: 트리거 재생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5단계: 확인
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users' 
  AND trigger_schema = 'auth';

-- 성공 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 안전한 트리거가 성공적으로 재생성되었습니다!';
END $$;

