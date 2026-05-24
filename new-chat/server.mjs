import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const cacheTtlMs = Number(process.env.SCOREBOARD_CACHE_MS || 8000);
const scoreboardUrl = "https://www.koreabaseball.com/schedule/scoreboard.aspx";
const naverBase = "https://api-gw.sports.naver.com";
let scoreboardCache = null;
let scoreboardInFlight = null;

const teamByKo = {
  삼성: "Samsung",
  KT: "KT",
  LG: "LG",
  KIA: "Kia",
  한화: "Hanwha",
  SSG: "SSG",
  두산: "Doosan",
  롯데: "Lotte",
  키움: "Kiwoom",
  NC: "NC",
};

const venueByHome = {
  KT: "수원 KT 위즈파크",
  Hanwha: "대전 한화생명 이글스파크",
  Kia: "광주 기아 챔피언스 필드",
  Lotte: "사직 야구장",
  LG: "잠실 야구장",
};

const naverCodeById = {
  Samsung: "SS",
  KT: "KT",
  LG: "LG",
  Kia: "HT",
  Hanwha: "HH",
  SSG: "SK",
  Doosan: "OB",
  Lotte: "LT",
  Kiwoom: "WO",
  NC: "NC",
};

const idByNaverCode = Object.fromEntries(Object.entries(naverCodeById).map(([id, code]) => [code, id]));

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#40;/g, "(")
    .replace(/&#41;/g, ")")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function textTokens(html) {
  const text = decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
  return text.split(/\s+/).filter(Boolean);
}

function isTeam(token) {
  return Object.hasOwn(teamByKo, token);
}

function isScore(token) {
  return /^\d+$/.test(token);
}

function isStatus(token) {
  return token === "경기종료" || /^\d+회[초말]$/.test(token);
}

function parseRheb(parts) {
  const [r = "0", h = "0", e = "0", b = "0"] = parts.slice(-4);
  return {
    r: Number(r),
    h: Number(h),
    e: Number(e),
    b: Number(b),
  };
}

function parseLine(parts) {
  return parts.slice(0, -4).filter((part) => part !== "-").join(" ");
}

function currentKstDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function gameId(awayId, homeId) {
  const slug = {
    Samsung: "samsung",
    KT: "kt",
    LG: "lg",
    Kia: "kia",
    Hanwha: "hanwha",
    SSG: "ssg",
    Doosan: "doosan",
    Lotte: "lotte",
    Kiwoom: "kiwoom",
    NC: "nc",
  };
  return `${slug[awayId]}-${slug[homeId]}`;
}

function parseGame(tokens, start) {
  const awayKo = tokens[start];
  const awayScore = Number(tokens[start + 1]);
  const status = tokens[start + 2];
  const homeScore = Number(tokens[start + 3]);
  const homeKo = tokens[start + 4];
  const awayId = teamByKo[awayKo];
  const homeId = teamByKo[homeKo];
  if (!awayId || !homeId || !isScore(tokens[start + 1]) || !isStatus(status) || !isScore(tokens[start + 3])) {
    return null;
  }

  const nextBlock = tokens.findIndex((token, index) => index > start + 4 && isTeam(token) && isScore(tokens[index + 1]) && isStatus(tokens[index + 2]));
  const end = nextBlock === -1 ? tokens.length : nextBlock;
  const block = tokens.slice(start, end);
  const countIndex = block.findIndex((token, index) => /^\d-\d$/.test(token) && /^\d+$/.test(block[index + 1]) && block[index + 2] === "out");
  const detailsStart = block.findIndex((token, index) => token === "TEAM" && block[index + 1] === "1");
  if (detailsStart === -1) return null;

  const awayRowStart = block.findIndex((token, index) => index > detailsStart && token === awayKo);
  const homeRowStart = block.findIndex((token, index) => index > awayRowStart && token === homeKo);
  if (awayRowStart === -1 || homeRowStart === -1) return null;

  const awayParts = block.slice(awayRowStart + 1, homeRowStart);
  const homeParts = block.slice(homeRowStart + 1, homeRowStart + 17);
  return {
    id: gameId(awayId, homeId),
    away: awayId,
    home: homeId,
    venue: venueByHome[homeId] || "",
    live: {
      away: awayScore,
      home: homeScore,
      status: status === "경기종료" ? status : `${status} 기준`,
    },
    details: {
      count: countIndex === -1 ? "-" : block[countIndex],
      outs: countIndex === -1 ? "-" : `${block[countIndex + 1]} out`,
      awayLine: parseLine(awayParts),
      homeLine: parseLine(homeParts),
      awayRheb: parseRheb(awayParts),
      homeRheb: parseRheb(homeParts),
    },
  };
}

function parseScoreboard(html) {
  const tokens = textTokens(html);
  const games = [];
  for (let index = 0; index < tokens.length - 4; index += 1) {
    const game = parseGame(tokens, index);
    if (game && !games.some((item) => item.id === game.id)) {
      games.push(game);
    }
  }
  if (games.length === 0) throw new Error("KBO scoreboard parse failed");
  return games;
}

function findPlayerByCode(code, ...groups) {
  for (const group of groups) {
    const players = [...(group?.batter || []), ...(group?.pitcher || [])];
    const player = players.find((item) => item.pcode === code);
    if (player) return player;
  }
  return null;
}

function formatAverage(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const formatted = Number(value).toFixed(3);
  return formatted.startsWith("0.") ? formatted.slice(1) : formatted;
}

function batterLine(player) {
  if (!player) return null;
  const parts = [];
  if (player.ab != null) parts.push(`${player.ab}타수`);
  if (player.hit) parts.push(`${player.hit}안타`);
  if (player.hr) parts.push(`${player.hr}홈런`);
  if (player.rbi) parts.push(`${player.rbi}타점`);
  if (player.bb) parts.push(`${player.bb}볼넷`);
  if (player.so) parts.push(`${player.so}삼진`);
  return parts.length ? parts.join(" ") : null;
}

function pitcherLine(player) {
  if (!player) return null;
  const parts = [];
  if (player.inn) parts.push(`${player.inn}이닝`);
  if (player.ballCount) parts.push(`${player.ballCount}구`);
  if (player.kk) parts.push(`${player.kk}K`);
  if (player.bb) parts.push(`${player.bb}BB`);
  if (player.hit) parts.push(`${player.hit}피안타`);
  if (player.er != null) parts.push(`${player.er}자책`);
  return parts.length ? parts.join(" ") : null;
}

function normalizeMatchup(scheduleGame, relay) {
  if (!relay?.currentGameState) {
    return {
      active: false,
      status: scheduleGame.statusCode === "RESULT" || scheduleGame.statusCode === "ENDED" ? "경기종료" : "대기",
    };
  }

  const awayBatting = relay.homeOrAway === "0";
  const batter = awayBatting
    ? findPlayerByCode(relay.currentGameState.batter, relay.awayLineup, relay.awayEntry)
    : findPlayerByCode(relay.currentGameState.batter, relay.homeLineup, relay.homeEntry);
  const pitcher = awayBatting
    ? findPlayerByCode(relay.currentGameState.pitcher, relay.homeLineup, relay.homeEntry)
    : findPlayerByCode(relay.currentGameState.pitcher, relay.awayLineup, relay.awayEntry);

  return {
    active: true,
    battingTeam: awayBatting ? scheduleGame.awayTeamName : scheduleGame.homeTeamName,
    fieldingTeam: awayBatting ? scheduleGame.homeTeamName : scheduleGame.awayTeamName,
    batter: batter
      ? {
          name: batter.name,
          position: batter.posName || batter.pos || null,
          order: batter.batOrder || null,
          todayLine: batterLine(batter),
          seasonAvg: formatAverage(batter.seasonHra),
          vsPitcher: relay.pitcherVsBatterCareerStats?.trim() || null,
        }
      : null,
    pitcher: pitcher
      ? {
          name: pitcher.name,
          style: pitcher.pitchingStyle || pitcher.hitType || pitcher.hittype || null,
          todayLine: pitcherLine(pitcher),
          seasonEra: pitcher.seasonEra || null,
        }
      : null,
  };
}

async function getNaverJson(path) {
  const response = await fetch(`${naverBase}${path}`, {
    headers: {
      "User-Agent": "KBO standings simulator (+local personal app)",
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`Naver returned ${response.status}`);
  const json = await response.json();
  if (!json.success) throw new Error("Naver returned unsuccessful payload");
  return json.result;
}

async function enrichWithNaver(games) {
  const date = currentKstDate();
  const schedule = await getNaverJson(`/schedule/games?upperCategoryId=kbaseball&date=${date}`);
  const naverGames = (schedule.games || []).filter((game) => game.categoryId === "kbo");

  const enriched = await Promise.all(
    games.map(async (game) => {
      const match = naverGames.find(
        (item) => item.awayTeamCode === naverCodeById[game.away] && item.homeTeamCode === naverCodeById[game.home],
      );
      if (!match) return game;

      if (match.statusCode !== "STARTED" && match.statusCode !== "SUSPENDED") {
        return {
          ...game,
          matchup: {
            active: false,
            status: match.statusCode === "RESULT" || match.statusCode === "ENDED" ? "경기종료" : match.statusInfo || "대기",
          },
        };
      }

      try {
        const relay = await getNaverJson(`/schedule/games/${match.gameId}/relay`);
        return {
          ...game,
          matchup: normalizeMatchup(match, relay.textRelayData),
        };
      } catch {
        return {
          ...game,
          matchup: {
            active: false,
            status: "릴레이 정보 없음",
          },
        };
      }
    }),
  );

  return enriched;
}

async function fetchStandings() {
  const season = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric" }).format(new Date());
  const data = await getNaverJson(`/statistics/categories/kbo/seasons/${season}/teams`);
  return (data.seasonTeamStats || [])
    .map((team) => ({
      id: idByNaverCode[team.teamId],
      wins: Number(team.winGameCount ?? 0),
      losses: Number(team.loseGameCount ?? 0),
      draws: Number(team.drawnGameCount ?? 0),
      originalRank: Number(team.ranking ?? 0),
    }))
    .filter((team) => team.id && team.originalRank > 0);
}

function reverseCompletedGames(standings, games) {
  if (!Array.isArray(standings)) return standings;
  const byId = new Map(standings.map((team) => [team.id, { ...team }]));

  for (const game of games) {
    if (game.live.status !== "경기종료") continue;
    const away = byId.get(game.away);
    const home = byId.get(game.home);
    if (!away || !home) continue;

    if (game.live.away > game.live.home) {
      away.wins -= 1;
      home.losses -= 1;
    } else if (game.live.home > game.live.away) {
      home.wins -= 1;
      away.losses -= 1;
    } else {
      away.draws -= 1;
      home.draws -= 1;
    }
  }

  return rankStandings(Array.from(byId.values()).map((team) => ({
    ...team,
    wins: Math.max(0, team.wins),
    losses: Math.max(0, team.losses),
    draws: Math.max(0, team.draws),
  })));
}

function winningPct(team) {
  const decisions = team.wins + team.losses;
  return decisions === 0 ? 0 : team.wins / decisions;
}

function rankStandings(standings) {
  const sorted = [...standings].sort((a, b) => {
    const pctDiff = winningPct(b) - winningPct(a);
    if (Math.abs(pctDiff) > 0.0000001) return pctDiff;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.id.localeCompare(b.id);
  });

  let previousPct = null;
  let previousRank = 0;
  sorted.forEach((team, index) => {
    const currentPct = winningPct(team).toFixed(3);
    team.originalRank = currentPct === previousPct ? previousRank : index + 1;
    previousPct = currentPct;
    previousRank = team.originalRank;
  });

  return sorted;
}

function nowKstLabel() {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${formatter.format(new Date())} KST`;
}

async function scoreboardResponse() {
  if (scoreboardCache && Date.now() - scoreboardCache.createdAt < cacheTtlMs) {
    return { ...scoreboardCache.payload, cached: true };
  }
  if (scoreboardInFlight) return scoreboardInFlight;

  scoreboardInFlight = buildScoreboardResponse()
    .then((payload) => {
      scoreboardCache = { createdAt: Date.now(), payload };
      return payload;
    })
    .finally(() => {
      scoreboardInFlight = null;
    });
  return scoreboardInFlight;
}

async function buildScoreboardResponse() {
  const response = await fetch(scoreboardUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 KBO standings simulator",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`KBO returned ${response.status}`);
  const html = await response.text();
  const games = parseScoreboard(html);
  const standings = await fetchStandings().catch(() => null);
  const baseStandings = standings ? reverseCompletedGames(standings, games) : null;
  return {
    source: scoreboardUrl,
    playerSource: `${naverBase}/schedule/games/{gameId}/relay`,
    standingsSource: `${naverBase}/statistics/categories/kbo/seasons/{season}/teams`,
    fetchedAt: new Date().toISOString(),
    fetchedAtLabel: nowKstLabel(),
    cacheTtlMs,
    standings: baseStandings,
    liveStandings: standings,
    games: await enrichWithNaver(games).catch(() => games),
  };
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    ...securityHeaders,
  });
  res.end(body);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const path = normalize(join(root, requested));
  if (!path.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }
  try {
    const body = await readFile(path);
    send(res, 200, body, contentTypes[extname(path)] || "application/octet-stream");
  } catch {
    send(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  if (req.url === "/healthz") {
    send(res, 200, JSON.stringify({ ok: true, cacheTtlMs }), "application/json; charset=utf-8");
    return;
  }
  if (req.url?.startsWith("/api/scoreboard")) {
    try {
      send(res, 200, JSON.stringify(await scoreboardResponse()), "application/json; charset=utf-8");
    } catch (error) {
      send(res, 502, JSON.stringify({ error: error.message }), "application/json; charset=utf-8");
    }
    return;
  }
  await serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`KBO simulator running at http://localhost:${port}/`);
});
