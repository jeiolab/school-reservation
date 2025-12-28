# Supabase 회원가입 오류 해결 가이드

## 문제 진단 방법

### 1단계: 진단 스크립트 실행

Supabase 대시보드 → **SQL Editor**에서 `supabase/diagnose-user-insert-issue.sql` 파일의 내용을 실행하세요.

이 스크립트는 다음을 확인합니다:
- 현재 RLS 정책 상태
- users 테이블 구조
- RLS 활성화 여부
- 제약 조건
- INSERT 정책 존재 여부

### 2단계: 결과 확인

#### 정상적인 경우
- `policyname`에 "Users can insert their own profile"이 있어야 합니다
- `cmd`가 "INSERT"여야 합니다
- `with_check`에 `(auth.uid() = id)` 조건이 있어야 합니다

#### 문제가 있는 경우
- INSERT 정책이 없거나
- RLS가 비활성화되어 있거나
- 정책 조건이 잘못되었을 수 있습니다

### 3단계: 해결 스크립트 실행

문제가 발견되면 `supabase/fix-user-insert-policy-complete.sql` 파일의 내용을 실행하세요.

이 스크립트는:
1. 기존 정책을 안전하게 삭제
2. RLS 활성화 확인
3. 올바른 INSERT 정책 생성
4. 정책 생성 확인

## Supabase 대시보드에서 수동 확인 방법

### 방법 1: Authentication → Policies 확인

1. Supabase 대시보드 접속
2. 왼쪽 메뉴에서 **Authentication** 클릭
3. **Policies** 탭 확인
4. `users` 테이블의 정책 목록 확인

### 방법 2: Table Editor에서 확인

1. 왼쪽 메뉴에서 **Table Editor** 클릭
2. `users` 테이블 선택
3. 상단의 **RLS** 아이콘 클릭
4. 정책 목록 확인

### 방법 3: SQL Editor에서 직접 확인

```sql
-- 모든 users 테이블 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'users';
```

## 일반적인 오류와 해결 방법

### 오류 1: "new row violates row-level security policy"
**원인**: INSERT 정책이 없거나 조건이 맞지 않음
**해결**: `fix-user-insert-policy-complete.sql` 실행

### 오류 2: "permission denied for table users"
**원인**: RLS가 활성화되어 있지만 정책이 없음
**해결**: INSERT 정책 생성

### 오류 3: "duplicate key value violates unique constraint"
**원인**: 이미 존재하는 이메일 또는 ID
**해결**: 다른 이메일로 시도하거나 기존 계정 확인

### 오류 4: "null value in column violates not-null constraint"
**원인**: 필수 필드가 누락됨
**해결**: 회원가입 폼에서 모든 필수 필드 입력 확인

## 추가 확인 사항

### 1. Supabase Auth 설정 확인
- **Authentication** → **Settings** → **Email Auth** 활성화 확인
- **Email Templates** 설정 확인

### 2. 환경 변수 확인
`.env.local` 파일에 다음이 설정되어 있는지 확인:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 브라우저 콘솔 확인
개발자 도구(F12) → **Console** 탭에서 상세 오류 메시지 확인

### 4. Network 탭 확인
개발자 도구 → **Network** 탭에서:
- `/rest/v1/users` 요청 확인
- 응답 상태 코드 확인 (401, 403, 500 등)
- 응답 본문에서 오류 메시지 확인

## 여전히 해결되지 않는 경우

1. **진단 스크립트 결과를 저장**하여 공유
2. **브라우저 콘솔의 오류 메시지** 캡처
3. **Network 탭의 요청/응답** 캡처
4. **Supabase 로그** 확인 (Dashboard → Logs)

이 정보들을 함께 확인하면 더 정확한 원인을 파악할 수 있습니다.

