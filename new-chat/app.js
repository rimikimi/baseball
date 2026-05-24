const teams = {
  Samsung: { ko: "삼성", full: "삼성 라이온즈", abbr: "SAM", color: "#1f63b7" },
  KT: { ko: "KT", full: "KT 위즈", abbr: "KT", color: "#2f2f35" },
  LG: { ko: "LG", full: "LG 트윈스", abbr: "LG", color: "#bd2544" },
  Kia: { ko: "KIA", full: "KIA 타이거즈", abbr: "KIA", color: "#d7252f" },
  Hanwha: { ko: "한화", full: "한화 이글스", abbr: "HAN", color: "#f37321" },
  SSG: { ko: "SSG", full: "SSG 랜더스", abbr: "SSG", color: "#c51d32" },
  Doosan: { ko: "두산", full: "두산 베어스", abbr: "DOO", color: "#162b4d" },
  Lotte: { ko: "롯데", full: "롯데 자이언츠", abbr: "LOT", color: "#143a68" },
  Kiwoom: { ko: "키움", full: "키움 히어로즈", abbr: "KIW", color: "#6e1732" },
  NC: { ko: "NC", full: "NC 다이노스", abbr: "NC", color: "#315288" },
};

const fallbackStandings = [
  { id: "Samsung", wins: 27, losses: 18, draws: 1, originalRank: 1 },
  { id: "KT", wins: 27, losses: 18, draws: 1, originalRank: 1 },
  { id: "LG", wins: 27, losses: 19, draws: 0, originalRank: 3 },
  { id: "Kia", wins: 24, losses: 22, draws: 1, originalRank: 4 },
  { id: "Hanwha", wins: 22, losses: 24, draws: 0, originalRank: 5 },
  { id: "SSG", wins: 22, losses: 24, draws: 1, originalRank: 5 },
  { id: "Doosan", wins: 22, losses: 24, draws: 1, originalRank: 5 },
  { id: "Lotte", wins: 19, losses: 25, draws: 1, originalRank: 8 },
  { id: "Kiwoom", wins: 20, losses: 27, draws: 1, originalRank: 9 },
  { id: "NC", wins: 18, losses: 27, draws: 1, originalRank: 10 },
];

let baseStandings = fallbackStandings;

const fallbackGames = [
  {
    id: "nc-kt",
    away: "NC",
    home: "KT",
    venue: "수원 KT 위즈파크",
    live: { away: 7, home: 3, status: "7회초 기준" },
    details: {
      count: "0-0",
      outs: "0 out",
      awayLine: "2 0 2 2 0 1 0",
      homeLine: "0 1 1 0 1 0",
      awayRheb: { r: 7, h: 11, e: 1, b: 5 },
      homeRheb: { r: 3, h: 8, e: 1, b: 2 },
    },
    matchup: { active: false, status: "저장된 데이터" },
  },
  {
    id: "doosan-hanwha",
    away: "Doosan",
    home: "Hanwha",
    venue: "대전 한화생명 이글스파크",
    live: { away: 2, home: 5, status: "8회말 기준" },
    details: {
      count: "2-1",
      outs: "0 out",
      awayLine: "0 0 0 0 0 1 1 0",
      homeLine: "1 0 0 2 2 0 0 0",
      awayRheb: { r: 2, h: 7, e: 1, b: 2 },
      homeRheb: { r: 5, h: 8, e: 0, b: 2 },
    },
    matchup: { active: false, status: "저장된 데이터" },
  },
  {
    id: "ssg-kia",
    away: "SSG",
    home: "Kia",
    venue: "광주 기아 챔피언스 필드",
    live: { away: 2, home: 3, status: "9회초 기준" },
    details: {
      count: "3-2",
      outs: "3 out",
      awayLine: "0 0 0 0 0 0 0 0 2",
      homeLine: "0 0 0 0 1 0 2 0",
      awayRheb: { r: 2, h: 5, e: 0, b: 1 },
      homeRheb: { r: 3, h: 5, e: 0, b: 1 },
    },
    matchup: { active: false, status: "저장된 데이터" },
  },
  {
    id: "samsung-lotte",
    away: "Samsung",
    home: "Lotte",
    venue: "사직 야구장",
    live: { away: 10, home: 0, status: "8회초 기준" },
    details: {
      count: "0-0",
      outs: "2 out",
      awayLine: "2 1 0 0 0 0 3 4",
      homeLine: "0 0 0 0 0 0 0",
      awayRheb: { r: 10, h: 13, e: 0, b: 5 },
      homeRheb: { r: 0, h: 1, e: 1, b: 0 },
    },
    matchup: { active: false, status: "저장된 데이터" },
  },
  {
    id: "kiwoom-lg",
    away: "Kiwoom",
    home: "LG",
    venue: "잠실 야구장",
    live: { away: 4, home: 3, status: "8회초 기준" },
    details: {
      count: "0-0",
      outs: "0 out",
      awayLine: "0 0 0 4 0 0 0 0",
      homeLine: "0 0 0 0 0 3 0",
      awayRheb: { r: 4, h: 8, e: 0, b: 1 },
      homeRheb: { r: 3, h: 5, e: 0, b: 3 },
    },
    matchup: { active: false, status: "저장된 데이터" },
  },
];

let games = fallbackGames;
let dataSource = {
  fetchedAtLabel: "저장된 스코어 기준",
  live: false,
};
let activePreset = "live";
let refreshTimerId = null;
window.__autoRefreshCount = 0;

function createGameState(sourceGames) {
  return sourceGames.reduce((state, game) => {
    state[game.id] = {
      awayScore: game.live.away,
      homeScore: game.live.home,
      result: resultFromScore(game.live.away, game.live.home),
    };
    return state;
  }, {});
}

let gameState = createGameState(games);

const gamesEl = document.querySelector("#games");
const standingsEl = document.querySelector("#standings");
const summaryEl = document.querySelector("#scenarioSummary");
const dataStampEl = document.querySelector("#dataStamp");
const sourceNoteEl = document.querySelector("#sourceNote");
const presetButtons = document.querySelectorAll(".preset-button");

function pct(team) {
  const decisions = team.wins + team.losses;
  return decisions === 0 ? 0 : team.wins / decisions;
}

function resultFromScore(awayScore, homeScore) {
  if (awayScore === "" || homeScore === "") return "pending";
  const away = Number(awayScore);
  const home = Number(homeScore);
  if (!Number.isFinite(away) || !Number.isFinite(home)) return "pending";
  if (away > home) return "away";
  if (home > away) return "home";
  return "draw";
}

function applyResult(record, game, result) {
  if (result === "away") {
    record[game.away].wins += 1;
    record[game.home].losses += 1;
  }
  if (result === "home") {
    record[game.home].wins += 1;
    record[game.away].losses += 1;
  }
  if (result === "draw") {
    record[game.away].draws += 1;
    record[game.home].draws += 1;
  }
}

function projectedStandings() {
  const record = Object.fromEntries(
    baseStandings.map((team) => [
      team.id,
      {
        ...team,
      },
    ]),
  );

  for (const game of games) {
    applyResult(record, game, gameState[game.id].result);
  }

  const sorted = Object.values(record).sort((a, b) => {
    const pctDiff = pct(b) - pct(a);
    if (Math.abs(pctDiff) > 0.0000001) return pctDiff;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return teams[a.id].ko.localeCompare(teams[b.id].ko, "ko");
  });

  let previousPct = null;
  let previousRank = 0;
  sorted.forEach((team, index) => {
    const currentPct = pct(team).toFixed(3);
    if (currentPct === previousPct) {
      team.rank = previousRank;
    } else {
      team.rank = index + 1;
      previousRank = team.rank;
      previousPct = currentPct;
    }
  });

  const leader = sorted[0];
  sorted.forEach((team) => {
    team.gamesBack = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
  });

  return sorted;
}

function formatPct(team) {
  return pct(team).toFixed(3).replace(/^0/, "");
}

function formatGamesBack(value) {
  if (value === 0) return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function movement(team) {
  const diff = team.originalRank - team.rank;
  if (diff > 0) return { label: `▲ ${diff}`, detail: "상승", className: "move-up" };
  if (diff < 0) return { label: `▼ ${Math.abs(diff)}`, detail: "하락", className: "move-down" };
  return { label: "－", detail: "유지", className: "move-even" };
}

function resultLabel(game, result) {
  if (result === "away") return `${teams[game.away].ko} 승`;
  if (result === "home") return `${teams[game.home].ko} 승`;
  if (result === "draw") return "무승부";
  return "미반영";
}

function renderRheb(rheb) {
  return `R ${rheb.r} · H ${rheb.h} · E ${rheb.e} · B ${rheb.b}`;
}

function renderMatchup(game) {
  const matchup = game.matchup || { active: false, status: "정보 없음" };
  if (!matchup.active) {
    return `
      <div class="player-matchup inactive">
        <div class="matchup-title">현재 투수·타자</div>
        <div class="matchup-empty">${matchup.status || "정보 없음"}</div>
      </div>
    `;
  }

  const batter = matchup.batter || {};
  const pitcher = matchup.pitcher || {};
  const batterMeta = [batter.order ? `${batter.order}번` : null, batter.position, batter.seasonAvg ? `시즌 ${batter.seasonAvg}` : null]
    .filter(Boolean)
    .join(" · ");
  const pitcherMeta = [pitcher.style, pitcher.seasonEra ? `ERA ${pitcher.seasonEra}` : null].filter(Boolean).join(" · ");
  return `
    <div class="player-matchup">
      <div class="matchup-title">현재 투수·타자</div>
      <div class="player-card hitter">
        <span>타자</span>
        <strong>${batter.name || "-"}</strong>
        <small>${batterMeta || matchup.battingTeam || ""}</small>
        <em>${batter.todayLine || "오늘 기록 없음"}</em>
      </div>
      <div class="player-card pitcher">
        <span>투수</span>
        <strong>${pitcher.name || "-"}</strong>
        <small>${pitcherMeta || matchup.fieldingTeam || ""}</small>
        <em>${pitcher.todayLine || "오늘 기록 없음"}</em>
      </div>
      <div class="vs-line">${batter.vsPitcher ? `상대전적 ${batter.vsPitcher}` : "상대전적 정보 없음"}</div>
    </div>
  `;
}

function renderGames() {
  gamesEl.innerHTML = games
    .map((game) => {
      const away = teams[game.away];
      const home = teams[game.home];
      const state = gameState[game.id];
      return `
        <article class="game-row" data-game="${game.id}">
          <div class="matchup">
            <div class="team-chip" style="--team-color: ${away.color}">
              <span class="team-dot"></span>
              <div>
                <div class="team-name">${away.full}</div>
                <div class="venue">원정</div>
              </div>
            </div>
            <div class="at-mark">@</div>
            <div class="team-chip home" style="--team-color: ${home.color}">
              <div>
                <div class="team-name">${home.full}</div>
                <div class="venue">${game.venue}</div>
              </div>
              <span class="team-dot"></span>
            </div>
          </div>
          <div class="score-controls">
            <input class="score-input" type="number" min="0" inputmode="numeric" value="${state.awayScore}" aria-label="${away.ko} 점수" data-score="away" />
            <input class="score-input" type="number" min="0" inputmode="numeric" value="${state.homeScore}" aria-label="${home.ko} 점수" data-score="home" />
            <div class="status-line">${game.live.status} · ${resultLabel(game, state.result)}</div>
          </div>
          <div class="result-buttons" aria-label="${away.ko} 대 ${home.ko} 결과 선택">
            <button class="result-button ${state.result === "away" ? "active" : ""}" data-result="away">${away.ko} 승</button>
            <button class="result-button ${state.result === "draw" ? "active" : ""}" data-result="draw">무</button>
            <button class="result-button ${state.result === "home" ? "active" : ""}" data-result="home">${home.ko} 승</button>
          </div>
          <div class="game-detail" aria-label="${away.ko} 대 ${home.ko} 경기 상세">
            <div class="detail-pill">
              <span>상황</span>
              <strong>${game.live.status.replace(" 기준", "")}</strong>
            </div>
            <div class="detail-pill">
              <span>카운트</span>
              <strong>${game.details.count}</strong>
            </div>
            <div class="detail-pill">
              <span>아웃</span>
              <strong>${game.details.outs}</strong>
            </div>
            <div class="line-score">
              <div class="line-team">${away.ko}</div>
              <div class="line-innings">${game.details.awayLine}</div>
              <div class="line-rheb">${renderRheb(game.details.awayRheb)}</div>
            </div>
            <div class="line-score">
              <div class="line-team">${home.ko}</div>
              <div class="line-innings">${game.details.homeLine}</div>
              <div class="line-rheb">${renderRheb(game.details.homeRheb)}</div>
            </div>
            ${renderMatchup(game)}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderStandings() {
  const standings = projectedStandings();
  standingsEl.innerHTML = standings
    .map((team) => {
      const club = teams[team.id];
      const move = movement(team);
      return `
        <tr style="--team-color: ${club.color}">
          <td class="rank muted-rank">${team.originalRank}</td>
          <td class="rank">${team.rank}</td>
          <td>
            <div class="club-cell">
              <span class="club-badge">${club.abbr}</span>
              <span>${club.full}</span>
            </div>
          </td>
          <td>${team.wins}</td>
          <td>${team.losses}</td>
          <td>${team.draws}</td>
          <td>${formatPct(team)}</td>
          <td>${formatGamesBack(team.gamesBack)}</td>
          <td class="${move.className}">
            <span class="move-label">${move.label}</span>
            <span class="move-detail">${move.detail}</span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderSource() {
  dataStampEl.textContent = dataSource.live
    ? `2026 KBO · ${dataSource.fetchedAtLabel} 확인`
    : `2026 KBO · ${dataSource.fetchedAtLabel}`;
  sourceNoteEl.textContent = dataSource.live
    ? `승률은 KBO식으로 무승부를 제외해 계산합니다. 현재 순위와 투수·타자는 네이버 스포츠, 진행 스코어는 KBO 공식 스코어보드에서 ${dataSource.fetchedAtLabel}에 가져온 값입니다.`
    : "승률은 KBO식으로 무승부를 제외해 계산합니다. 실시간 데이터를 불러오지 못하면 저장된 fallback 값으로 표시합니다.";
}

function updateGameRow(gameId) {
  const game = games.find((item) => item.id === gameId);
  const row = gamesEl.querySelector(`[data-game="${gameId}"]`);
  if (!game || !row) return;

  const state = gameState[gameId];
  const awayInput = row.querySelector('[data-score="away"]');
  const homeInput = row.querySelector('[data-score="home"]');
  if (document.activeElement !== awayInput) awayInput.value = state.awayScore;
  if (document.activeElement !== homeInput) homeInput.value = state.homeScore;

  row.querySelector(".status-line").textContent = `${game.live.status} · ${resultLabel(game, state.result)}`;
  row.querySelectorAll("[data-result]").forEach((button) => {
    button.classList.toggle("active", button.dataset.result === state.result);
  });
}

function render() {
  renderSource();
  renderGames();
  renderStandings();
}

function setPreset(preset) {
  activePreset = preset;
  if (preset === "reset") {
    gameState = games.reduce((state, game) => {
      state[game.id] = { awayScore: "", homeScore: "", result: "pending" };
      return state;
    }, {});
    summaryEl.textContent = "오늘 경기 결과를 아직 반영하지 않습니다.";
  }

  if (preset === "live") {
    gameState = createGameState(games);
    summaryEl.textContent = "기준 스코어가 최종 결과라고 가정합니다.";
  }

  if (preset === "away" || preset === "home" || preset === "draw") {
    gameState = games.reduce((state, game) => {
      state[game.id] = {
        awayScore: preset === "away" ? 1 : preset === "home" ? 0 : 1,
        homeScore: preset === "home" ? 1 : preset === "away" ? 0 : 1,
        result: preset,
      };
      return state;
    }, {});
    summaryEl.textContent =
      preset === "away"
        ? "오늘 경기가 모두 원정팀 승리라고 가정합니다."
        : preset === "home"
          ? "오늘 경기가 모두 홈팀 승리라고 가정합니다."
          : "오늘 경기가 모두 무승부라고 가정합니다.";
  }

  presetButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === preset);
  });
  render();
}

gamesEl.addEventListener("input", (event) => {
  const input = event.target.closest("[data-score]");
  if (!input) return;
  const row = input.closest("[data-game]");
  const id = row.dataset.game;
  const state = gameState[id];
  state[`${input.dataset.score}Score`] = input.value === "" ? "" : Math.max(0, Number(input.value));
  state.result = resultFromScore(state.awayScore, state.homeScore);
  summaryEl.textContent = "입력한 점수가 최종 결과라고 가정합니다.";
  activePreset = "custom";
  presetButtons.forEach((button) => button.classList.remove("active"));
  updateGameRow(id);
  renderStandings();
});

gamesEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-result]");
  if (!button) return;
  const row = button.closest("[data-game]");
  const id = row.dataset.game;
  const game = games.find((item) => item.id === id);
  const result = button.dataset.result;
  gameState[id].result = result;
  if (result === "away") {
    gameState[id].awayScore = Math.max(Number(gameState[id].awayScore) || 0, (Number(gameState[id].homeScore) || 0) + 1);
  }
  if (result === "home") {
    gameState[id].homeScore = Math.max(Number(gameState[id].homeScore) || 0, (Number(gameState[id].awayScore) || 0) + 1);
  }
  if (result === "draw") {
    const score = Math.max(Number(gameState[id].awayScore) || 0, Number(gameState[id].homeScore) || 0);
    gameState[id].awayScore = score;
    gameState[id].homeScore = score;
  }
  summaryEl.textContent = `${teams[game.away].ko}-${teams[game.home].ko} 경기 결과를 직접 반영했습니다.`;
  activePreset = "custom";
  presetButtons.forEach((presetButton) => presetButton.classList.remove("active"));
  updateGameRow(id);
  renderStandings();
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => setPreset(button.dataset.preset));
});

function scoreboardEndpoint() {
  if (location.protocol === "file:") return "http://localhost:4173/api/scoreboard";
  return "/api/scoreboard";
}

function mergeLiveGames(liveGames) {
  const byId = new Map(liveGames.map((game) => [game.id, game]));
  games = fallbackGames.map((game) => {
    const liveGame = byId.get(game.id);
    return liveGame ? { ...game, ...liveGame } : game;
  });
  if (activePreset === "live") {
    gameState = createGameState(games);
  }
}

function mergeLiveStandings(liveStandings) {
  if (!Array.isArray(liveStandings) || liveStandings.length === 0) return;
  const valid = liveStandings.filter((team) => teams[team.id]);
  if (valid.length === Object.keys(teams).length) {
    baseStandings = valid;
  }
}

function renderPresetButtons() {
  presetButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === activePreset);
  });
}

async function loadLiveScoreboard({ silent = false } = {}) {
  try {
    if (!silent) {
      summaryEl.textContent = "KBO 공식 스코어보드에서 최신 정보를 불러오는 중입니다.";
      render();
    }
    const response = await fetch(scoreboardEndpoint(), { cache: "no-store" });
    if (!response.ok) throw new Error(`scoreboard ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.games) || payload.games.length === 0) {
      throw new Error("no games in scoreboard payload");
    }
    mergeLiveStandings(payload.standings);
    mergeLiveGames(payload.games);
    dataSource = {
      fetchedAtLabel: payload.fetchedAtLabel || "방금",
      live: true,
    };
    if (activePreset === "live") {
      summaryEl.textContent = "KBO 공식 스코어보드의 최신 스코어가 최종 결과라고 가정합니다.";
    } else if (silent) {
      summaryEl.textContent = "KBO 기준 스코어는 갱신했고, 직접 입력한 시나리오는 유지합니다.";
    }
    renderPresetButtons();
  } catch (error) {
    dataSource = {
      fetchedAtLabel: "저장된 스코어 기준",
      live: false,
    };
    gameState = createGameState(games);
    summaryEl.textContent = "실시간 스코어를 불러오지 못해 저장된 스코어로 표시합니다.";
    console.warn(error);
  } finally {
    window.__autoRefreshCount += 1;
    render();
  }
}

loadLiveScoreboard();
refreshTimerId = window.setInterval(() => {
  loadLiveScoreboard({ silent: true });
}, 10000);
