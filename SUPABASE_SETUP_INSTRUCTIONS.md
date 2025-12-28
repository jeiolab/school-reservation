# Supabase 설정 가이드

## 회원가입 오류 해결 방법

회원가입 시 "Database error saving new user" 오류가 발생하는 경우, 다음 SQL을 Supabase에서 실행해야 합니다.

### 1. Supabase 대시보드 접속
1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2. SQL 실행
다음 SQL을 복사하여 실행하세요:

```sql
-- Drop the policy if it already exists (for idempotency)
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create the INSERT policy
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### 3. 확인
SQL 실행 후 "Success. No rows returned" 메시지가 표시되면 정상적으로 적용된 것입니다.

### 4. 테스트
회원가입을 다시 시도해보세요. 오류가 해결되었는지 확인하세요.

## 추가 정보

이 정책은 사용자가 회원가입 시 자신의 프로필을 `users` 테이블에 생성할 수 있도록 허용합니다.

- **정책 이름**: "Users can insert their own profile"
- **테이블**: users
- **작업**: INSERT
- **조건**: `auth.uid() = id` (인증된 사용자가 자신의 ID로만 프로필을 생성할 수 있음)

