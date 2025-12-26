# 능주고 특별실 예약 관리 시스템

능주고등학교 특별실 예약을 위한 모바일 퍼스트 웹 애플리케이션입니다.

## 기술 스택

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI 기반)
- **Database & Auth:** Supabase (Auth, Postgres DB)
- **Icons:** Lucide React
- **State Management:** React Query (TanStack Query) / Server Actions

## 주요 기능

1. **사용자 인증**
   - 이메일/비밀번호 로그인 (Supabase Auth)
   - 역할 기반 접근 제어 (학생/교사/관리자)

2. **예약 시스템**
   - 실시간 빈 교실 확인
   - 날짜 및 시간 선택 (중복 예약 방지)
   - 예약 사유 및 동반자 입력
   - 예약 상태 관리 (대기/승인/거부)

3. **대시보드**
   - 다가오는 예약 목록 (D-day 표시)
   - 예약 상태 확인

4. **관리자 기능**
   - 예약 승인/반려
   - 전체 예약 내역 조회

## 프로젝트 구조

```
school-reservation/
├── app/                    # Next.js App Router 페이지
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 랜딩 페이지
│   ├── login/             # 로그인 페이지
│   └── dashboard/         # 대시보드 페이지
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 컴포넌트
│   └── auth/             # 인증 관련 컴포넌트
├── utils/                # 유틸리티 함수
│   └── supabase/         # Supabase 클라이언트 설정
├── types/                # TypeScript 타입 정의
│   └── supabase.ts       # Supabase 데이터베이스 타입
├── supabase/             # Supabase 관련 파일
│   └── schema.sql        # 데이터베이스 스키마
└── lib/                  # 라이브러리 유틸리티
    └── utils.ts          # 공통 유틸리티 함수
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 교직원 회원가입 인증 코드 (선택사항)
# 설정하지 않으면 기본값 'TEACHER2024' 사용
NEXT_PUBLIC_TEACHER_VERIFICATION_CODE=your_secret_code

# 계정 삭제 기능 사용 시 필요 (선택사항)
# Supabase 대시보드 → Settings → API → service_role 키 복사
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. 데이터베이스 설정

1. Supabase 프로젝트를 생성합니다.
2. `supabase/schema.sql` 파일의 내용을 Supabase SQL Editor에서 실행합니다.
3. Supabase Auth 설정에서 이메일/비밀번호 인증을 활성화합니다.
4. **이메일 확인 비활성화** (선택사항):
   - Supabase 대시보드 → Authentication → Settings
   - "Email Auth" 섹션에서 "Enable email confirmations" 옵션을 비활성화합니다.
   - 이렇게 하면 회원가입 후 즉시 로그인할 수 있습니다.
5. 추가 SQL 스크립트 실행:
   - `supabase/add-approved-by-column.sql` - 승인자 정보 저장을 위한 컬럼 추가
   - `supabase/create-reservations-archive.sql` - 예약 보관함 테이블 및 함수 생성

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 데이터베이스 스키마

### users 테이블
- `id`: UUID (Primary Key)
- `email`: 이메일 주소
- `name`: 사용자 이름
- `role`: 역할 (student/teacher/admin)
- `student_id`: 학번 (선택)

### rooms 테이블
- `id`: UUID (Primary Key)
- `name`: 실 이름
- `capacity`: 수용 인원
- `location`: 위치
- `facilities`: 시설 목록 (배열)
- `is_available`: 사용 가능 여부

### reservations 테이블
- `id`: UUID (Primary Key)
- `user_id`: 사용자 ID (Foreign Key)
- `room_id`: 실 ID (Foreign Key)
- `start_time`: 시작 시간
- `end_time`: 종료 시간
- `purpose`: 예약 사유
- `status`: 상태 (pending/confirmed/rejected)
- `attendees`: 동반자 목록 (배열)
- `approved_by`: 승인자 ID (Foreign Key, users 테이블 참조)
- `rejection_reason`: 거부 사유 (텍스트)

### reservations_archive 테이블
- `id`: UUID (Primary Key)
- `original_id`: 원본 예약 ID
- `user_id`: 사용자 ID (Foreign Key)
- `room_id`: 실 ID (Foreign Key)
- `start_time`: 시작 시간
- `end_time`: 종료 시간
- `purpose`: 예약 사유
- `status`: 상태 (pending/confirmed/rejected)
- `attendees`: 동반자 목록 (배열)
- `approved_by`: 승인자 ID (Foreign Key, users 테이블 참조)
- `rejection_reason`: 거부 사유 (텍스트)
- `archived_at`: 보관 일시

## 주요 기능

- [x] 사용자 인증 (로그인/회원가입)
- [x] 역할 기반 접근 제어 (학생/교사/관리자)
- [x] 예약 시스템 (실 선택, 날짜/시간 선택, 요일 반복 예약)
- [x] 중복 예약 방지
- [x] 관리자 대시보드 (예약 승인/거부, 실 관리)
- [x] 모바일 반응형 디자인
- [x] 계정 삭제 기능

## 배포

Vercel에 배포하는 경우:

1. GitHub 저장소에 코드를 푸시합니다.
2. Vercel에서 프로젝트를 import합니다.
3. 환경 변수를 설정합니다.
4. 배포를 완료합니다.

## 라이선스

MIT

