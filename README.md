# Routine King

긴 주기로 반복되는 생활의 일을 대신 기억하고 다음 시점을 알려주는 라이프 사이클 매니저입니다.

## 지금 할 수 있는 일

- 오늘 챙길 사이클과 앞으로 30일 안에 돌아올 일 확인
- 사이클 추가, 수정, 삭제와 삭제 취소
- 완료 기록 저장 및 다음 예정일 자동 계산
- 이름 검색과 카테고리별 탐색
- 완료 기록 타임라인과 생활 인사이트 확인
- 브라우저 데이터 JSON 백업 및 복원
- 모바일 사이드 메뉴와 반응형 레이아웃

데이터는 서버 계정 없이 현재 브라우저의 `localStorage`에 저장됩니다. 다른 브라우저나 기기로 옮길 때는 설정의 백업·복원 기능을 사용하세요.

## 로컬 실행

Node.js 18 이상에서 별도 패키지 설치 없이 실행할 수 있습니다.

```bash
npm start
```

브라우저에서 <http://localhost:4173>을 여세요.

## GitHub Pages 배포

`main` 브랜치에 변경이 반영되면 `Deploy to GitHub Pages` 워크플로가 `public` 디렉터리를 자동 배포합니다.

저장소에서 처음 한 번만 다음 설정을 확인하세요.

1. **Settings → Pages**로 이동합니다.
2. **Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. **Actions** 탭의 `Deploy to GitHub Pages` 실행이 끝날 때까지 기다립니다.
4. 완료된 실행의 `deploy` 단계 또는 **Settings → Pages**에 표시된 URL을 엽니다.

수동으로 다시 배포하려면 **Actions → Deploy to GitHub Pages → Run workflow**를 선택하세요.

## 테스트

```bash
npm test
```

날짜 계산, 상태 분류, 완료 기록, 가져온 데이터 보정과 정적 파일 응답을 확인합니다.
