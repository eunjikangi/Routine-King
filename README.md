# Routine King

긴 주기로 반복되는 생활의 일을 기억하고 다음 시점을 알려주는 Life Cycle Manager 프로토타입입니다.

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

일반적인 주소 형식은 다음과 같습니다.

```text
https://<github-username>.github.io/<repository-name>/
```

수동으로 다시 배포하려면 **Actions → Deploy to GitHub Pages → Run workflow**를 선택하세요.

## 테스트

```bash
npm test
```
