# 회원가입 오류 해결 가이드

## "Database error saving new user" 오류 해결 방법

### ⚠️ 중요: 단계별로 정확히 따라하세요

---

## 1단계: Supabase에서 SQL 실행

1. **Supabase 대시보드** 접속: https://app.supabase.com
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. `supabase/final-fix-signup-issue.sql` 파일의 **전체 내용**을 복사하여 실행

이 스크립트는:
- 충돌하는 정책 제거
- INSERT 정책 재생성
- 필요한 모든 정책 확인 및 생성

---

## 2단계: 브라우저에서 실제 오류 확인

### A. 개발자 도구 열기
1. **F12** 키 누르기
2. **Console** 탭 선택

### B. 회원가입 시도
1. 회원가입 페이지로 이동
2. 정보 입력 후 회원가입 버튼 클릭

### C. 오류 메시지 확인
콘솔에서 다음 정보를 확인하세요:

```
Error inserting user: { ... }
Error details: {
  code: "...",      ← 이 코드를 확인하세요
  message: "...",   ← 이 메시지를 확인하세요
  details: "...",
  hint: "..."
}
```

---

## 3단계: 오류 코드별 해결 방법

### 오류 코드: `42501` (권한 거부)
**원인**: RLS 정책 문제

**해결**:
1. 1단계의 SQL 스크립트를 다시 실행
2. Supabase 대시보드 → **Table Editor** → `users` 테이블 → **RLS** 아이콘 클릭
3. 다음 정책이 있는지 확인:
   - ✅ "Users can insert their own profile" (INSERT)

### 오류 코드: `23505` (UNIQUE 제약 조건 위반)
**원인**: 이메일이 이미 존재함

**해결**:
- 다른 이메일로 시도
- 또는 Supabase에서 기존 사용자 삭제:
  ```sql
  DELETE FROM users WHERE email = '중복된이메일@example.com';
  ```

### 오류 코드: `23502` (NOT NULL 제약 조건 위반)
**원인**: 필수 필드 누락

**해결**:
- 회원가입 폼에서 모든 필수 필드 입력 확인
- 이름, 이메일, 학번 모두 입력되었는지 확인

### 오류 코드: `PGRST301` 또는 `permission denied`
**원인**: RLS 정책이 작동하지 않음

**해결**:
1. Supabase 대시보드 → **Authentication** → **Settings**
2. **Email Auth** 활성화 확인
3. **Confirm email** 비활성화 (개발 중)

---

## 4단계: Supabase Auth 설정 확인

### A. Email Auth 활성화
1. **Authentication** → **Settings**
2. **Email Auth** 섹션에서:
   - ✅ **Enable Email Auth** 체크
   - ✅ **Confirm email** 체크 해제 (개발 중)

### B. 이메일 템플릿 확인
1. **Authentication** → **Email Templates**
2. **Confirm signup** 템플릿 확인

---

## 5단계: 환경 변수 확인

`.env.local` 파일에 다음이 올바르게 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**확인 방법**:
1. Supabase 대시보드 → **Settings** → **API**
2. **Project URL**과 **anon public** 키 확인

---

## 6단계: Network 탭에서 확인

1. 개발자 도구 → **Network** 탭
2. 회원가입 시도
3. `/rest/v1/users` 요청 찾기
4. **Response** 탭 클릭
5. 실제 오류 메시지 확인

---

## 7단계: Supabase 로그 확인

1. Supabase 대시보드 → **Logs**
2. **API Logs** 또는 **Postgres Logs** 선택
3. 회원가입 시도 시점의 로그 확인
4. 오류 메시지 확인

---

## 여전히 해결되지 않는 경우

다음 정보를 함께 확인해주세요:

1. **브라우저 콘솔의 전체 오류 메시지** (스크린샷)
2. **오류 코드** (예: 42501, 23505 등)
3. **Network 탭의 Response 내용** (스크린샷)
4. **Supabase 로그의 오류 메시지**

이 정보들을 공유해주시면 더 정확한 진단이 가능합니다.

---

## 빠른 체크리스트

- [ ] `final-fix-signup-issue.sql` 실행 완료
- [ ] Supabase에서 INSERT 정책 존재 확인
- [ ] "Public Access" 정책 삭제 확인
- [ ] Email Auth 활성화 확인
- [ ] 환경 변수 올바르게 설정 확인
- [ ] 브라우저 콘솔에서 오류 코드 확인
- [ ] 다른 이메일로 시도

---

## 추가 팁

### 테스트용 사용자 삭제
회원가입 테스트 후 사용자를 삭제하려면:

```sql
-- Supabase SQL Editor에서 실행
DELETE FROM auth.users WHERE email = 'test@example.com';
DELETE FROM users WHERE email = 'test@example.com';
```

### 정책 상태 확인 쿼리
```sql
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';
```

결과에 "Users can insert their own profile"이 있어야 합니다.

