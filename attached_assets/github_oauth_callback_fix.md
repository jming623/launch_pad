# GitHub OAuth Callback URL 수정 가이드

## 문제 상황
- GitHub OAuth 로그인 시 "redirect_uri is not associated with this application" 오류 발생
- 현재 GitHub App에 등록된 callback URL과 코드의 callback URL이 일치하지 않음

## 해결 방법

### 1. GitHub OAuth App 설정 수정 (권장)

1. GitHub.com에 로그인
2. Settings > Developer settings > OAuth Apps로 이동
3. 해당 OAuth App (Client ID: Iv23liT0tXoAhBR6utUA) 선택
4. "Authorization callback URL" 필드에 다음 URL 추가:
   ```
   https://7a6b3a00-659c-47ae-a2fe-cba3cfcb9759-00-1mh0t6c0982p8.picard.replit.dev/api/auth/github/callback
   ```

### 2. 대안: 새 GitHub OAuth App 생성

1. GitHub.com > Settings > Developer settings > OAuth Apps
2. "New OAuth App" 클릭
3. 다음 정보 입력:
   - Application name: `LaunchPad Dev`
   - Homepage URL: `https://7a6b3a00-659c-47ae-a2fe-cba3cfcb9759-00-1mh0t6c0982p8.picard.replit.dev`
   - Authorization callback URL: `https://7a6b3a00-659c-47ae-a2fe-cba3cfcb9759-00-1mh0t6c0982p8.picard.replit.dev/api/auth/github/callback`
4. 새로 생성된 Client ID와 Client Secret을 .env에 업데이트

### 3. 로컬 개발용 설정

개발 환경에서는 다음 callback URL도 추가하는 것이 좋습니다:
```
http://localhost:5000/api/auth/github/callback
```

## 현재 상태

- 코드에서 사용 중인 callback URL: `https://7a6b3a00-659c-47ae-a2fe-cba3cfcb9759-00-1mh0t6c0982p8.picard.replit.dev/api/auth/github/callback`
- GitHub App에 등록 필요한 URL: 위와 동일

## 참고사항

- Replit 도메인은 프로젝트마다 고유하므로 정확한 도메인을 사용해야 함
- 프로덕션 배포 시에는 실제 도메인으로 변경 필요