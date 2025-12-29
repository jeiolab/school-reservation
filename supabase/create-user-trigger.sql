-- ============================================
-- 자동 사용자 프로필 생성 트리거
-- ============================================
-- auth.users에 사용자가 생성되면 자동으로 public.users에 프로필을 생성합니다
-- 이렇게 하면 RLS 정책 문제를 완전히 우회할 수 있습니다

-- 1. 함수 생성: 새 사용자 프로필 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_role_text TEXT;
  user_student_id TEXT;
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
  
  -- role이 비어있거나 null이면 기본값 설정
  IF user_role_text IS NULL OR user_role_text = '' THEN
    user_role_text := 'student';
  END IF;
  
  -- student_id 추출
  user_student_id := NULLIF(NEW.raw_user_meta_data->>'student_id', '');
  
  -- public.users 테이블에 사용자 프로필 생성
  -- 이 함수는 SECURITY DEFINER로 실행되므로 RLS를 우회합니다
  BEGIN
    INSERT INTO public.users (id, email, name, role, student_id)
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      user_role_text::user_role, -- INSERT 시에만 캐스팅
      user_student_id
    )
    ON CONFLICT (id) DO NOTHING; -- 이미 존재하면 무시
  EXCEPTION
    WHEN invalid_text_representation OR OTHERS THEN
      -- role 캐스팅 실패 시 기본값으로 재시도
      INSERT INTO public.users (id, email, name, role, student_id)
      VALUES (
        NEW.id,
        NEW.email,
        user_name,
        'student'::user_role,
        user_student_id
      )
      ON CONFLICT (id) DO NOTHING;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 오류 발생 시 로그만 남기고 계속 진행 (auth.users 생성은 성공)
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
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

