# KBO 오늘 순위 시뮬레이터

오늘 KBO 경기 스코어를 기준으로 예상 순위 변동을 보여주는 작은 웹앱입니다.

> 팬메이드 프로젝트입니다. KBO, 구단, 네이버와 공식 제휴되어 있지 않습니다.

## 기능

- 10초마다 경기 스코어 자동 갱신
- 현재 순위와 예상 순위, 등락 표시
- 경기별 점수 시나리오 입력
- 경기 상세: 이닝, 카운트, R/H/E/B, 현재 투수와 타자
- 서버 캐시로 외부 데이터 요청 완화

## 실행

```bash
npm install
npm start
```

브라우저에서 `http://localhost:4173/`을 엽니다.

## 설정

`.env.example` 참고:

```bash
PORT=4173
SCOREBOARD_CACHE_MS=8000
```

## 배포

Node.js 서버를 실행할 수 있는 플랫폼이면 배포할 수 있습니다.

- Build command: 없음
- Start command: `npm start`
- Health check path: `/healthz`
- Required runtime: Node.js 20 이상

자세한 배포 절차는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

### Vercel에서 500이 뜰 때

Vercel은 `node server.mjs`처럼 계속 떠 있는 서버를 직접 실행하는 방식이 아닙니다. 이 저장소는 Vercel용 `api/scoreboard.js`, `api/healthz.js`, `vercel.json`을 포함하므로 GitHub에 최신 커밋을 푸시한 뒤 Vercel에서 다시 배포하면 됩니다.

Vercel 설정:

- Framework Preset: Other
- Build Command: 비워두기
- Output Directory: 비워두기
- Install Command: `npm install` 또는 비워두기

## GitHub에 올리기

GitHub에서 새 저장소를 만든 뒤 아래 명령을 실행합니다.

```bash
git remote add origin https://github.com/USER/kbo-standings-simulator.git
git push -u origin main
```

`USER`는 GitHub 사용자명 또는 조직명으로 바꿔주세요.

### Render

1. GitHub에 이 저장소를 올립니다.
2. Render에서 New Web Service를 선택합니다.
3. 저장소를 연결합니다.
4. `render.yaml`을 감지하면 설정을 그대로 사용합니다.

수동 설정이 필요하면 다음 값을 사용합니다.

- Runtime: Node
- Build command: 비워두기
- Start command: `npm start`
- Health check path: `/healthz`

### Railway

1. GitHub 저장소를 Railway 프로젝트로 연결합니다.
2. Start command가 필요하면 `npm start`를 지정합니다.
3. 환경 변수 `SCOREBOARD_CACHE_MS=8000`을 추가합니다.

Docker 배포:

```bash
docker build -t kbo-standings-simulator .
docker run -p 4173:4173 kbo-standings-simulator
```

## 데이터 출처

- 경기 스코어/RHEB: KBO 공식 스코어보드
- 현재 순위, 투수/타자 보강 정보: 네이버 스포츠 비공식 게이트웨이

이 앱은 팬메이드 도구이며 KBO, 구단, 네이버와 공식 제휴되어 있지 않습니다. 비공식 데이터 구조는 예고 없이 변경될 수 있습니다.

## 라이선스

[MIT](./LICENSE)
