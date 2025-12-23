# Supabase 이메일 확인 비활성화 가이드

## 방법 1: Supabase 대시보드에서 설정 (권장)

Supabase UI가 업데이트되면서 경로가 변경되었을 수 있습니다. 다음 경로들을 시도해보세요:

### 경로 A: Authentication → Providers
1. Supabase 대시보드 로그인
2. 왼쪽 사이드바에서 **Authentication** 클릭
3. **Providers** 탭 클릭
4. **Email** 프로바이더 찾기
5. **Email** 옆의 설정 아이콘 또는 **Configure** 버튼 클릭
6. **"Enable email confirmations"** 또는 **"Confirm email"** 옵션 찾기
7. 체크박스를 해제하고 저장

### 경로 B: Project Settings → Authentication
1. Supabase 대시보드 로그인
2. 왼쪽 사이드바 하단의 **Settings** (톱니바퀴 아이콘) 클릭
3. **Authentication** 메뉴 클릭
4. **Email Auth** 섹션 찾기
5. **"Enable email confirmations"** 옵션 비활성화
6. 저장

### 경로 C: Authentication → Configuration
1. Supabase 대시보드 로그인
2. 왼쪽 사이드바에서 **Authentication** 클릭
3. **Configuration** 또는 **Settings** 탭 클릭
4. **Email** 섹션에서 이메일 확인 옵션 찾기
5. 비활성화 후 저장

## 방법 2: SQL을 통한 설정 (고급)

Supabase는 이메일 확인 설정을 데이터베이스 레벨에서 직접 변경할 수 없습니다. 
이 설정은 Supabase Auth 서비스의 설정이므로 반드시 대시보드나 Management API를 통해 변경해야 합니다.

## 방법 3: Management API 사용 (프로그래밍 방식)

Supabase Management API를 사용하여 설정을 변경할 수 있습니다:

```typescript
// 이 방법은 서버 사이드에서만 사용 가능하며, 
// Management API 키가 필요합니다.
```

## 확인 방법

설정 변경 후:
1. 테스트 계정으로 회원가입 시도
2. 이메일 확인 없이 바로 로그인되는지 확인
3. 이메일함에 확인 메일이 오지 않는지 확인

## 참고

- 이메일 확인을 비활성화하면 보안이 약해질 수 있습니다
- 프로덕션 환경에서는 이메일 확인을 활성화하는 것을 권장합니다
- 개발/테스트 환경에서만 비활성화하는 것을 권장합니다

