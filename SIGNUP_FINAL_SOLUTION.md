# 회원가입 오류 최종 해결 방법

## ✅ 정책이 올바르게 설정되어 있는 경우

정책이 올바르게 설정되어 있는데도 오류가 발생한다면, **세션 문제**일 가능성이 높습니다.

---

## 🎯 해결 방법 1: Database Trigger 사용 (권장)

이 방법은 RLS 정책을 완전히 우회하므로 가장 확실합니다.

### 1단계: Supabase에서 트리거 생성

1. **Supabase 대시보드** 접속
2. **SQL Editor** 열기
3. `supabase/create-user-trigger.sql` 파일의 **전체 내용**을 복사하여 실행

이 트리거는:
- `auth.users`에 사용자가 생성되면 자동으로 `public.users`에 프로필 생성
- RLS 정책을 완전히 우회 (SECURITY DEFINER 사용)
- metadata에서 사용자 정보를 자동으로 가져옴

### 2단계: 회원가입 코드 확인

코드가 이미 업데이트되어 metadata에 정보를 포함하도록 수정되었습니다.

---

## 🔧 해결 방법 2: 세션 확인 및 재시도 (현재 적용됨)

코드가 이미 개선되어:
- 회원가입 시 metadata에 정보 포함
- 세션이 있는 경우 명시적으로 세션 설정
- 트리거가 작동하지 않은 경우 수동으로 INSERT 시도

---

## 📋 단계별 확인 사항

### 1. 트리거 생성 (권장)

```sql
-- supabase/create-user-trigger.sql 실행
```

### 2. 트리거 확인

```sql
-- 트리거가 생성되었는지 확인
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users' 
  AND trigger_schema = 'auth';
```

### 3. 함수 확인

```sql
-- 함수가 생성되었는지 확인
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';
```

---

## 🧪 테스트 방법

1. **새 이메일로 회원가입 시도**
2. **브라우저 콘솔 확인** (F12 → Console)
3. **오류가 없는지 확인**

---

## ⚠️ 여전히 오류가 발생하는 경우

### 브라우저 콘솔에서 확인

1. **F12** → **Console** 탭
2. 회원가입 시도
3. 다음 정보 확인:
   - 오류 코드
   - 오류 메시지
   - `Error details` 객체

### Network 탭에서 확인

1. **F12** → **Network** 탭
2. 회원가입 시도
3. `/rest/v1/users` 요청 찾기
4. **Response** 탭에서 실제 오류 확인

---

## 🔍 추가 확인 사항

### Supabase Auth 설정

1. **Authentication** → **Settings**
2. **Email Auth** 활성화 확인
3. **Confirm email** 비활성화 (개발 중)

### 환경 변수

`.env.local` 파일 확인:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 💡 트리거 방식의 장점

1. **RLS 정책 우회**: SECURITY DEFINER로 실행되므로 RLS를 우회
2. **자동화**: 사용자 생성 시 자동으로 프로필 생성
3. **안정성**: 세션 문제와 무관하게 작동
4. **일관성**: 모든 사용자에 대해 동일하게 작동

---

## 📝 요약

1. ✅ **정책 확인 완료** - 정책이 올바르게 설정되어 있음
2. ✅ **코드 개선 완료** - metadata 포함 및 세션 확인 추가
3. 🔧 **트리거 생성 필요** - `supabase/create-user-trigger.sql` 실행

**다음 단계**: Supabase에서 `create-user-trigger.sql` 실행 후 회원가입 테스트

