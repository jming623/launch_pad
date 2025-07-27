# GitHub OAuth 연동 가이드

## 1. 필요한 라이브러리 설치

GitHub OAuth 로그인을 구현하기 위해 다음 패키지들이 설치되어 있습니다:

```bash
npm install passport-github2 @types/passport-github2
```

### 기존 인증 관련 패키지
- `passport`: 인증 미들웨어
- `passport-local`: 이메일/비밀번호 로그인
- `express-session`: 세션 관리
- `connect-pg-simple`: PostgreSQL 세션 저장소

## 2. GitHub OAuth App 생성 방법

### 2.1 GitHub에서 OAuth App 생성
1. GitHub 로그인 → Settings
2. 왼쪽 메뉴에서 "Developer settings" 클릭
3. "OAuth Apps" → "New OAuth App" 클릭
4. 다음 정보 입력:

**개발 환경 설정:**
```
Application name: 프로젝트헌터
Homepage URL: https://workspace--5000--jming95623.local-credentialless.webcontainer.io
Authorization callback URL: https://workspace--5000--jming95623.local-credentialless.webcontainer.io/api/auth/github/callback
```

**배포 환경 설정 (배포 후 변경):**
```
Application name: 프로젝트헌터
Homepage URL: https://your-app-name.replit.app
Authorization callback URL: https://your-app-name.replit.app/api/auth/github/callback
```

### 2.2 Client ID 및 Client Secret 확인
OAuth App 생성 후:
1. Client ID 복사
2. "Generate a new client secret" 클릭하여 Client Secret 생성 및 복사
3. Replit 환경변수에 추가:
   - `GITHUB_CLIENT_ID`: [복사한 Client ID]
   - `GITHUB_CLIENT_SECRET`: [복사한 Client Secret]

## 3. 구현될 기능

### 3.1 백엔드 구현
- `passport-github2` 전략 설정
- GitHub OAuth 인증 라우트 (`/api/auth/github`)
- 콜백 처리 라우트 (`/api/auth/github/callback`)
- 사용자 정보 자동 저장 (이메일, 프로필 사진, GitHub ID)

### 3.2 프론트엔드 구현
- GitHub 로그인 버튼 추가
- 기존 회원가입/로그인 폼과 통합
- 소셜 로그인과 일반 로그인 구분 처리

### 3.3 데이터베이스 스키마
기존 users 테이블에 다음 필드들이 이미 준비되어 있음:
- `provider`: 'local' | 'github' | 'google' | 'replit'
- `providerId`: 외부 서비스의 사용자 ID
- `profileImageUrl`: 프로필 이미지 URL

## 4. 배포 후 URL 수정 가이드

### 4.1 Replit 배포
1. Replit에서 "Deploy" 버튼 클릭
2. 배포 완료 후 실제 도메인 확인 (예: `your-app-name.replit.app`)

### 4.2 GitHub OAuth App URL 업데이트
1. GitHub → Settings → Developer settings → OAuth Apps
2. 생성한 OAuth App 선택
3. "Update application" 클릭
4. URL 필드 수정:
   ```
   Homepage URL: https://your-app-name.replit.app
   Authorization callback URL: https://your-app-name.replit.app/api/auth/github/callback
   ```
5. "Update application" 클릭하여 저장

### 4.3 환경 변수 확인
배포 환경에서도 다음 환경 변수들이 설정되어 있는지 확인:
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SESSION_SECRET`
- `DATABASE_URL`

## 5. 보안 고려사항

### 5.1 환경 변수 관리
- Client Secret은 절대 코드에 하드코딩하지 않음
- 개발/프로덕션 환경별로 별도 OAuth App 생성 권장

### 5.2 도메인 제한
- GitHub OAuth App의 Authorization callback URL은 정확히 일치해야 함
- 와일드카드 사용 불가

### 5.3 세션 보안
- HTTPS 환경에서만 secure 쿠키 사용
- 세션 타임아웃 설정 (현재 7일)

## 6. 테스트 방법

### 6.1 개발 환경 테스트
1. GitHub OAuth App 생성 완료 확인
2. 환경 변수 설정 확인
3. 서버 재시작: `npm run dev`
4. 브라우저에서 GitHub 로그인 버튼 클릭
5. GitHub 인증 페이지로 리다이렉트 확인
6. 인증 완료 후 사용자 정보 저장 확인

### 6.2 배포 환경 테스트
1. 배포 완료 후 실제 도메인에서 동일한 테스트 수행
2. HTTPS 환경에서 정상 작동 확인

## 7. 문제 해결

### 7.1 일반적인 오류
- **"redirect_uri_mismatch"**: Callback URL이 GitHub OAuth App 설정과 다름
- **"Application suspended"**: GitHub OAuth App이 일시 중단됨
- **401 Unauthorized**: Client ID/Secret이 잘못됨

### 7.2 디버깅 방법
- 서버 콘솔 로그 확인
- GitHub OAuth App 설정 재확인
- 환경 변수 값 확인 (실제 값은 노출하지 않고 존재 여부만)

## 8. 추가 참고사항

### 8.1 GitHub API 제한
- OAuth App당 시간당 5,000 API 호출 제한
- 사용자 인증 시에만 API 호출 발생

### 8.2 사용자 경험
- GitHub 로그인 시 프로필 정보 자동 입력
- 기존 이메일과 중복 시 계정 연동 처리
- 소셜 로그인 사용자는 비밀번호 없이 로그인

---

*이 가이드는 프로젝트헌터 플랫폼의 GitHub OAuth 연동을 위한 완전한 설정 가이드입니다.*