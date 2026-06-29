import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CircleDollarSign,
  Clock,
  Languages,
  Monitor,
  Moon,
  Sun,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { Link, Route, Routes, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { loadLeagueData } from "./data/loadLeagueData";
import {
  getHeadToHead,
  getLeaderboard,
  getMatchDetail,
  getModelCostSummary,
  getModelDetail,
  getRatingSeries,
} from "./domain/selectors";
import type {
  ArenaModel,
  LeagueData,
  MatchSummary,
  RatingPoint,
  RecordSummary,
} from "./domain/types";
import { validateLeagueData } from "./domain/validation";

type AppProps = {
  initialData?: LeagueData;
};

type ThemeMode = "system" | "light" | "dark";
type Language = "en" | "ko";
type Copy = (typeof translations)[Language];

const chartColors = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#d97706"];
const themeStorageKey = "fightall-theme";
const languageStorageKey = "fightall-language";
const themeModes: ThemeMode[] = ["system", "light", "dark"];

const translations = {
  en: {
    appNav: "Main",
    leaderboard: "Leaderboard",
    aiPlayers: "AI Players",
    playersEyebrow: "Model roster",
    playersCopy:
      "Browse FightAll models as league players with form, language records, and cost efficiency from generated match history.",
    languageRecords: "Language records",
    viewPlayer: "View",
    sampleLeagueData: "Generated league data",
    heroCopy:
      "A record-first AI model arena MVP for comparing Werewolf ratings, opponent records, and cost efficiency across English and Korean sample leagues.",
    leader: "Leader",
    rating: "rating",
    bestRecentMove: "Best recent move",
    latestDelta: "latest delta",
    costEfficient: "Cost-efficient",
    perWin: "per win",
    gameAndLanguage: "Game and language",
    gameLanguageFilter: "Game language filter",
    leagueScope: "League scope",
    allLeague: "All League",
    overallLeagueNote:
      "Overall view combines the English and Korean Werewolf sample leagues without treating one language as the universal ranking.",
    ratingTrendOverview: "Rating trend overview",
    leagueRatingMovement: "League rating movement",
    momentum: "Momentum",
    risingAndFalling: "Rising and falling",
    currentStandings: "Current standings",
    rank: "Rank",
    model: "Model",
    provider: "Provider",
    version: "Version",
    delta: "Delta",
    record: "Record",
    recentForm: "Recent form",
    costPerWin: "Cost / win",
    currentRating: "Current rating",
    ratingHistory: "Rating history",
    graphFirstModelDetail: "Graph-first model detail",
    overallRecord: "Overall record",
    winRate: "win rate",
    latestFiveMatches: "Latest five matches",
    averageTime: "Average time",
    totalRequests: "total requests",
    total: "total",
    byGame: "By game",
    gameRecords: "Game records",
    opponents: "Opponents",
    opponent: "Opponent",
    opponentRecords: "Opponent records",
    latestMeeting: "Latest meeting",
    detail: "Detail",
    latestResults: "Latest results",
    recentMatches: "Recent matches",
    recentMeetings: "Recent meetings",
    match: "Match",
    game: "Game",
    models: "Models",
    result: "Result",
    turns: "Turns",
    played: "Played",
    directRecord: "Direct record",
    gameBreakdown: "Game breakdown",
    matchHistory: "Match history",
    headToHeadCopy:
      "Head-to-head results, per-game splits, recent meetings, and cost/time comparison computed from match history.",
    duration: "Duration",
    participants: "Participants",
    matchSummary: "Match summary",
    modelA: "Model A",
    modelB: "Model B",
    outcome: "Outcome",
    spend: "Spend",
    costAndTokens: "Cost and tokens",
    input: "Input",
    output: "Output",
    cached: "Cached",
    requests: "Requests",
    elapsed: "Elapsed",
    cost: "Cost",
    elo: "Elo",
    ratingChanges: "Rating changes",
    noData: "n/a",
    draw: "Draw",
    won: "won",
    notFound: "Not found",
    dataError: "Data error",
    notFoundCopy: "This record is not available in the bundled sample league data.",
    backToLeaderboard: "Back to leaderboard",
    loading: "Loading FightAll league data...",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystemLabel: "Theme: System",
    themeLightLabel: "Theme: Light",
    themeDarkLabel: "Theme: Dark",
    languageControl: "Language",
    viewInEnglish: "View in English",
    viewInKorean: "한국어로 보기",
    avg: "avg",
    wins: "W",
    losses: "L",
    draws: "D",
  },
  ko: {
    appNav: "주요 메뉴",
    leaderboard: "리더보드",
    aiPlayers: "AI 선수",
    playersEyebrow: "모델 선수 명단",
    playersCopy:
      "생성된 경기 기록에서 계산한 최근 흐름, 언어별 전적, 비용 효율을 기준으로 FightAll 모델을 리그 선수처럼 살펴봅니다.",
    languageRecords: "언어별 전적",
    viewPlayer: "보기",
    sampleLeagueData: "생성 리그 데이터",
    heroCopy:
      "영어와 한국어 늑대인간 샘플 리그의 레이팅, 상대 전적, 비용 효율을 비교하는 기록 기반 AI 모델 아레나 MVP입니다.",
    leader: "선두",
    rating: "레이팅",
    bestRecentMove: "최근 상승",
    latestDelta: "최근 변화",
    costEfficient: "비용 효율",
    perWin: "승당",
    gameAndLanguage: "게임과 언어",
    gameLanguageFilter: "게임 언어 필터",
    leagueScope: "리그 범위",
    allLeague: "전체 리그",
    overallLeagueNote:
      "전체 보기는 영어와 한국어 늑대인간 샘플 리그를 함께 보여주며, 특정 언어 하나를 보편 순위처럼 취급하지 않습니다.",
    ratingTrendOverview: "레이팅 추이",
    leagueRatingMovement: "리그 레이팅 변화",
    momentum: "모멘텀",
    risingAndFalling: "상승과 하락",
    currentStandings: "현재 순위",
    rank: "순위",
    model: "모델",
    provider: "제공사",
    version: "버전",
    delta: "변화",
    record: "전적",
    recentForm: "최근 흐름",
    costPerWin: "승당 비용",
    currentRating: "현재 레이팅",
    ratingHistory: "레이팅 기록",
    graphFirstModelDetail: "그래프 중심 모델 상세",
    overallRecord: "전체 전적",
    winRate: "승률",
    latestFiveMatches: "최근 5경기",
    averageTime: "평균 시간",
    totalRequests: "총 요청",
    total: "합계",
    byGame: "게임별",
    gameRecords: "게임별 전적",
    opponents: "상대",
    opponent: "상대 모델",
    opponentRecords: "상대 전적",
    latestMeeting: "최근 맞대결",
    detail: "상세",
    latestResults: "최근 결과",
    recentMatches: "최근 경기",
    recentMeetings: "최근 맞대결",
    match: "경기",
    game: "게임",
    models: "모델",
    result: "결과",
    turns: "턴",
    played: "일시",
    directRecord: "직접 전적",
    gameBreakdown: "게임별 분석",
    matchHistory: "경기 기록",
    headToHeadCopy:
      "경기 기록에서 계산한 맞대결 결과, 게임별 구분, 최근 경기, 비용/시간 비교입니다.",
    duration: "소요 시간",
    participants: "참가 모델",
    matchSummary: "경기 요약",
    modelA: "모델 A",
    modelB: "모델 B",
    outcome: "판정",
    spend: "사용량",
    costAndTokens: "비용과 토큰",
    input: "입력",
    output: "출력",
    cached: "캐시",
    requests: "요청",
    elapsed: "응답 시간",
    cost: "비용",
    elo: "Elo",
    ratingChanges: "레이팅 변화",
    noData: "없음",
    draw: "무승부",
    won: "승리",
    notFound: "찾을 수 없음",
    dataError: "데이터 오류",
    notFoundCopy: "번들된 샘플 리그 데이터에서 이 기록을 찾을 수 없습니다.",
    backToLeaderboard: "리더보드로 돌아가기",
    loading: "FightAll 리그 데이터를 불러오는 중...",
    themeSystem: "시스템",
    themeLight: "라이트",
    themeDark: "다크",
    themeSystemLabel: "테마: 시스템",
    themeLightLabel: "테마: 라이트",
    themeDarkLabel: "테마: 다크",
    languageControl: "언어",
    viewInEnglish: "View in English",
    viewInKorean: "한국어로 보기",
    avg: "평균",
    wins: "승",
    losses: "패",
    draws: "무",
  },
} as const;

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const saved = window.localStorage.getItem(themeStorageKey);
  return saved === "light" || saved === "dark" || saved === "system"
    ? saved
    : "system";
}

function getInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const saved = window.localStorage.getItem(languageStorageKey);
  if (saved === "en" || saved === "ko") {
    return saved;
  }

  return window.navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDelta(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatMoney(value: number | null, t: Copy) {
  return value === null ? t.noData : `$${value.toFixed(3)}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(seconds: number, language: Language) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return language === "ko" ? `${remainingSeconds}초` : `${remainingSeconds}s`;
  }

  return language === "ko"
    ? `${minutes}분 ${remainingSeconds}초`
    : `${minutes}m ${remainingSeconds}s`;
}

function recordText(record: RecordSummary, t: Copy) {
  return `${record.wins}${t.wins} ${record.losses}${t.losses} ${record.draws}${t.draws}`;
}

function matchOutcomeText(data: LeagueData, match: MatchSummary, t: Copy) {
  if (!match.winnerModelId) {
    return t.draw;
  }

  return `${modelName(data, match.winnerModelId)} ${t.won}`;
}

function modelName(data: LeagueData, modelId: string) {
  return data.models.find((model) => model.id === modelId)?.name ?? modelId;
}

function gameName(data: LeagueData, gameId: string) {
  return data.games.find((game) => game.id === gameId)?.name ?? gameId;
}

function EmptyState({ title, t }: { title: string; t: Copy }) {
  return (
    <section className="empty-state">
      <h1>{title}</h1>
      <p>{t.notFoundCopy}</p>
      <Link className="button-link" to="/">
        {t.backToLeaderboard}
      </Link>
    </section>
  );
}

function DeltaBadge({ value }: { value: number }) {
  const direction = value >= 0 ? "up" : "down";
  const Icon = value >= 0 ? ArrowUp : ArrowDown;

  return (
    <span className={`delta-badge ${direction}`}>
      <Icon aria-hidden="true" size={14} />
      {formatDelta(value)}
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="stat-tile">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </div>
  );
}

function RatingOverviewChart({
  data,
  gameId,
  language,
}: {
  data: LeagueData;
  gameId: string | null;
  language: Language;
}) {
  const rows = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number>>();
    const snapshots = data.ratingSnapshots.filter(
      (snapshot) => snapshot.gameId === gameId,
    );

    for (const snapshot of snapshots) {
      const row = byDate.get(snapshot.recordedAt) ?? {
        date: formatShortDate(snapshot.recordedAt, language),
      };
      row[snapshot.modelId] = snapshot.rating;
      byDate.set(snapshot.recordedAt, row);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => row);
  }, [data, gameId, language]);

  return (
    <div className="chart-frame" data-testid="rating-overview-chart">
      <LineChart
        width={760}
        height={300}
        data={rows}
        margin={{ left: 8, right: 24 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          stroke="var(--muted)"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          domain={["dataMin - 20", "dataMax + 20"]}
          stroke="var(--muted)"
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            borderColor: "var(--line)",
            color: "var(--text)",
          }}
        />
        <Legend />
        {data.models.map((model, index) => (
          <Line
            key={model.id}
            type="monotone"
            dataKey={model.id}
            name={model.name}
            stroke={chartColors[index % chartColors.length]}
            strokeWidth={2.5}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </div>
  );
}

function ModelRatingChart({
  series,
  language,
  t,
}: {
  series: RatingPoint[];
  language: Language;
  t: Copy;
}) {
  return (
    <div className="chart-frame" data-testid="model-rating-chart">
      <LineChart
        width={760}
        height={300}
        data={series.map((point) => ({
          date: formatShortDate(point.recordedAt, language),
          rating: point.rating,
        }))}
        margin={{ left: 8, right: 24 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          stroke="var(--muted)"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          domain={["dataMin - 20", "dataMax + 20"]}
          stroke="var(--muted)"
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            borderColor: "var(--line)",
            color: "var(--text)",
          }}
        />
        <Line
          type="monotone"
          dataKey="rating"
          name={t.rating}
          stroke="#2563eb"
          strokeWidth={3}
          dot={{ r: 4 }}
        />
      </LineChart>
    </div>
  );
}

function Dashboard({
  data,
  language,
  t,
}: {
  data: LeagueData;
  language: Language;
  t: Copy;
}) {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const selectedGame =
    selectedGameId === null
      ? null
      : data.games.find((game) => game.id === selectedGameId) ?? null;
  const leaderboard = getLeaderboard(data, selectedGameId);
  const topModel = leaderboard[0];
  const rising = [...leaderboard].sort((a, b) => b.ratingDelta - a.ratingDelta)[0];
  const efficient = [...leaderboard]
    .filter((row) => row.costSummary.costPerWin !== null)
    .sort((a, b) => (a.costSummary.costPerWin ?? 0) - (b.costSummary.costPerWin ?? 0))[0];

  return (
    <div className="page-stack">
      <section className="hero-band">
        <div>
          <p className="eyebrow">{t.sampleLeagueData}</p>
          <h1>FightAll</h1>
          <p>{t.heroCopy}</p>
        </div>
        <div className="hero-stats">
          <StatTile
            icon={<Trophy aria-hidden="true" />}
            label={t.leader}
            value={topModel.model.name}
            detail={`${topModel.currentRating} ${t.rating}`}
          />
          <StatTile
            icon={<Activity aria-hidden="true" />}
            label={t.bestRecentMove}
            value={rising.model.name}
            detail={`${formatDelta(rising.ratingDelta)} ${t.latestDelta}`}
          />
          <StatTile
            icon={<CircleDollarSign aria-hidden="true" />}
            label={t.costEfficient}
            value={efficient.model.name}
            detail={`${formatMoney(efficient.costSummary.costPerWin, t)} ${t.perWin}`}
          />
        </div>
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <div>
            <span>{t.gameAndLanguage}</span>
            <h2>{t.leagueScope}</h2>
          </div>
        </div>
        <div className="segmented-control" aria-label={t.gameLanguageFilter}>
          <button
            className={selectedGameId === null ? "active" : ""}
            type="button"
            onClick={() => setSelectedGameId(null)}
          >
            {t.allLeague}
          </button>
          {data.games.map((game) => (
            <button
              className={selectedGameId === game.id ? "active" : ""}
              key={game.id}
              type="button"
              onClick={() => setSelectedGameId(game.id)}
            >
              {game.name}
            </button>
          ))}
        </div>
        <p className="language-note">
          {selectedGame ? selectedGame.description : t.overallLeagueNote}
        </p>
      </section>

      <section className="section-grid">
        <div className="panel wide">
          <div className="section-heading">
            <div>
              <span>{t.ratingTrendOverview}</span>
              <h2>{t.leagueRatingMovement}</h2>
            </div>
            <BarChart3 aria-hidden="true" />
          </div>
          <RatingOverviewChart
            data={data}
            gameId={selectedGameId}
            language={language}
          />
        </div>
        <div className="panel">
          <div className="section-heading compact">
            <div>
              <span>{t.momentum}</span>
              <h2>{t.risingAndFalling}</h2>
            </div>
          </div>
          <ol className="momentum-list">
            {[...leaderboard]
              .sort((a, b) => b.ratingDelta - a.ratingDelta)
              .map((row) => (
                <li key={row.model.id}>
                  <Link to={`/models/${row.model.id}`}>{row.model.name}</Link>
                  <DeltaBadge value={row.ratingDelta} />
                </li>
              ))}
          </ol>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span>{t.currentStandings}</span>
            <h2>{selectedGame ? selectedGame.name : t.leaderboard}</h2>
          </div>
          <Swords aria-hidden="true" />
        </div>
        <div className="table-scroll">
          <table aria-label={t.leaderboard}>
            <thead>
              <tr>
                <th>{t.rank}</th>
                <th>{t.model}</th>
                <th>{t.provider}</th>
                <th>{t.version}</th>
                <th>{t.rating}</th>
                <th>{t.delta}</th>
                <th>{t.record}</th>
                <th>{t.recentForm}</th>
                <th>{t.costPerWin}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => (
                <tr key={row.model.id}>
                  <td>{index + 1}</td>
                  <td>
                    <Link to={`/models/${row.model.id}`}>{row.model.name}</Link>
                  </td>
                  <td>{row.model.provider}</td>
                  <td>{row.model.version}</td>
                  <td>{row.currentRating}</td>
                  <td>
                    <DeltaBadge value={row.ratingDelta} />
                  </td>
                  <td>{recordText(row.overallRecord, t)}</td>
                  <td>{recordText(row.recentForm, t)}</td>
                  <td>{formatMoney(row.costSummary.costPerWin, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PlayersPage({
  data,
  language,
  t,
}: {
  data: LeagueData;
  language: Language;
  t: Copy;
}) {
  const leaderboard = getLeaderboard(data);
  const playerRows = leaderboard
    .map((row) => {
      const detail = getModelDetail(data, row.model.id);
      return detail ? { ...row, detail } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className="page-stack">
      <section className="model-header">
        <div>
          <p className="eyebrow">{t.playersEyebrow}</p>
          <h1>{t.aiPlayers}</h1>
          <p>{t.playersCopy}</p>
        </div>
        <div className="header-actions">
          <Users aria-hidden="true" />
        </div>
      </section>

      <section className="player-grid" aria-label={t.aiPlayers}>
        {playerRows.map((row, index) => (
          <article className="player-card" key={row.model.id}>
            <div className="player-card-header">
              <div>
                <span className="profile-provider">{row.model.provider}</span>
                <h2>{row.model.name}</h2>
                <p>{row.model.profile.tagline}</p>
              </div>
              <span className="rank-chip">#{index + 1}</span>
            </div>

            <div className="tag-row compact-tags">
              {row.model.profile.styleTags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <dl className="player-metrics">
              <div>
                <dt>{t.currentRating}</dt>
                <dd>{row.currentRating}</dd>
              </div>
              <div>
                <dt>{t.delta}</dt>
                <dd>
                  <DeltaBadge value={row.ratingDelta} />
                </dd>
              </div>
              <div>
                <dt>{t.overallRecord}</dt>
                <dd>{recordText(row.overallRecord, t)}</dd>
              </div>
              <div>
                <dt>{t.recentForm}</dt>
                <dd>{recordText(row.recentForm, t)}</dd>
              </div>
              <div>
                <dt>{t.costPerWin}</dt>
                <dd>{formatMoney(row.costSummary.costPerWin, t)}</dd>
              </div>
            </dl>

            <div className="player-language-records">
              <h3>{t.languageRecords}</h3>
              <ul className="breakdown-list">
                {row.detail.gameRecords.map((gameRecord) => (
                  <GameRecordItem
                    key={gameRecord.game.id}
                    data={data}
                    gameId={gameRecord.game.id}
                    modelId={row.model.id}
                    name={gameRecord.game.name}
                    record={gameRecord.record}
                    language={language}
                    t={t}
                  />
                ))}
              </ul>
            </div>

            <Link className="button-link player-link" to={`/models/${row.model.id}`}>
              {t.viewPlayer} {row.model.name}
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}

function ModelProfile({
  model,
  currentRating,
  t,
}: {
  model: ArenaModel;
  currentRating: number;
  t: Copy;
}) {
  return (
    <aside className="profile-panel">
      <span className="profile-provider">{model.provider}</span>
      <h2>{model.profile.mbti}</h2>
      <p>{model.profile.tagline}</p>
      <blockquote>{model.profile.quote}</blockquote>
      <div className="tag-row">
        {model.profile.styleTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <dl className="profile-rating">
        <div>
          <dt>{t.currentRating}</dt>
          <dd>{currentRating}</dd>
        </div>
        <div>
          <dt>{t.version}</dt>
          <dd>{model.version}</dd>
        </div>
      </dl>
    </aside>
  );
}

function GameRecordItem({
  data,
  gameId,
  modelId,
  name,
  record,
  language,
  t,
}: {
  data: LeagueData;
  gameId: string;
  modelId: string;
  name: string;
  record: RecordSummary;
  language: Language;
  t: Copy;
}) {
  const ratingSeries = getRatingSeries(data, modelId, gameId);
  const costSummary = getModelCostSummary(data, modelId, gameId);
  const ratingDelta =
    ratingSeries.length < 2
      ? 0
      : ratingSeries.at(-1)!.rating - ratingSeries.at(-2)!.rating;

  return (
    <li>
      <span>
        {name}
        <small>
          {formatDelta(ratingDelta)} {t.rating} ·{" "}
          {formatMoney(costSummary.costPerWin, t)} {t.perWin} ·{" "}
          {formatDuration(Math.round(costSummary.averageElapsedSeconds), language)}{" "}
          {t.avg}
        </small>
      </span>
      <strong>{recordText(record, t)}</strong>
    </li>
  );
}

function ModelDetailPage({
  data,
  language,
  t,
}: {
  data: LeagueData;
  language: Language;
  t: Copy;
}) {
  const { modelId } = useParams();
  const detail = modelId ? getModelDetail(data, modelId) : null;

  if (!detail) {
    return <EmptyState title={t.notFound} t={t} />;
  }

  return (
    <div className="page-stack">
      <section className="model-header">
        <div>
          <Link className="back-link" to="/">
            {t.leaderboard}
          </Link>
          <h1>{detail.model.name}</h1>
          <p>{detail.model.profile.tagline}</p>
        </div>
        <div className="header-actions">
          <DeltaBadge value={detail.ratingDelta} />
        </div>
      </section>

      <section className="section-grid model-grid">
        <div className="panel wide">
          <div className="section-heading">
            <div>
              <span>{t.ratingHistory}</span>
              <h2>{t.graphFirstModelDetail}</h2>
            </div>
          </div>
          <ModelRatingChart
            series={detail.ratingSeries}
            language={language}
            t={t}
          />
        </div>
        <ModelProfile
          model={detail.model}
          currentRating={detail.currentRating}
          t={t}
        />
      </section>

      <section className="stats-strip">
        <StatTile
          icon={<Trophy aria-hidden="true" />}
          label={t.overallRecord}
          value={recordText(detail.overallRecord, t)}
          detail={`${formatPercent(detail.overallRecord.winRate)} ${t.winRate}`}
        />
        <StatTile
          icon={<Activity aria-hidden="true" />}
          label={t.recentForm}
          value={recordText(detail.recentForm, t)}
          detail={t.latestFiveMatches}
        />
        <StatTile
          icon={<Clock aria-hidden="true" />}
          label={t.averageTime}
          value={formatDuration(
            Math.round(detail.costSummary.averageElapsedSeconds),
            language,
          )}
          detail={`${detail.costSummary.totalRequests} ${t.totalRequests}`}
        />
        <StatTile
          icon={<CircleDollarSign aria-hidden="true" />}
          label={t.costPerWin}
          value={formatMoney(detail.costSummary.costPerWin, t)}
          detail={`${formatMoney(detail.costSummary.totalCostUsd, t)} ${t.total}`}
        />
      </section>

      <section className="section-grid">
        <div className="panel">
          <div className="section-heading compact">
            <div>
              <span>{t.byGame}</span>
              <h2>{t.gameRecords}</h2>
            </div>
          </div>
          <ul className="breakdown-list">
            {detail.gameRecords.map((row) => (
              <GameRecordItem
                key={row.game.id}
                data={data}
                gameId={row.game.id}
                modelId={detail.model.id}
                name={row.game.name}
                record={row.record}
                language={language}
                t={t}
              />
            ))}
          </ul>
        </div>

        <div className="panel wide">
          <div className="section-heading compact">
            <div>
              <span>{t.opponents}</span>
              <h2>{t.opponentRecords}</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table aria-label={t.opponentRecords}>
              <thead>
                <tr>
                  <th>{t.opponent}</th>
                  <th>{t.record}</th>
                  <th>{t.winRate}</th>
                  <th>{t.latestMeeting}</th>
                  <th>{t.detail}</th>
                </tr>
              </thead>
              <tbody>
                {detail.opponentRecords.map((row) => (
                  <tr key={row.opponent.id}>
                    <td>{row.opponent.name}</td>
                    <td>{recordText(row.record, t)}</td>
                    <td>{formatPercent(row.record.winRate)}</td>
                    <td>
                      {row.latestMatch
                        ? formatDate(row.latestMatch.playedAt, language)
                        : t.noData}
                    </td>
                    <td>
                      <Link to={`/models/${detail.model.id}/vs/${row.opponent.id}`}>
                        vs {row.opponent.name}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <div>
            <span>{t.latestResults}</span>
            <h2>{t.recentMatches}</h2>
          </div>
        </div>
        <MatchTable data={data} matches={detail.recentMatches} language={language} t={t} />
      </section>
    </div>
  );
}

function MatchTable({
  data,
  matches,
  language,
  t,
}: {
  data: LeagueData;
  matches: MatchSummary[];
  language: Language;
  t: Copy;
}) {
  return (
    <div className="table-scroll">
      <table aria-label={t.recentMatches}>
        <thead>
          <tr>
            <th>{t.match}</th>
            <th>{t.game}</th>
            <th>{t.models}</th>
            <th>{t.result}</th>
            <th>{t.turns}</th>
            <th>{t.played}</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr key={match.id}>
              <td>
                <Link to={`/matches/${match.id}`}>{match.id}</Link>
              </td>
              <td>{gameName(data, match.gameId)}</td>
              <td>
                {modelName(data, match.modelAId)} vs {modelName(data, match.modelBId)}
              </td>
              <td>
                {match.winnerModelId
                  ? modelName(data, match.winnerModelId)
                  : t.draw}
              </td>
              <td>{match.turns}</td>
              <td>{formatDate(match.playedAt, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeadToHeadPage({
  data,
  language,
  t,
}: {
  data: LeagueData;
  language: Language;
  t: Copy;
}) {
  const { modelId, opponentId } = useParams();
  const detail =
    modelId && opponentId ? getHeadToHead(data, modelId, opponentId) : null;

  if (!detail) {
    return <EmptyState title={t.notFound} t={t} />;
  }

  return (
    <div className="page-stack">
      <section className="model-header">
        <div>
          <Link className="back-link" to={`/models/${detail.model.id}`}>
            {detail.model.name}
          </Link>
          <h1>
            {detail.model.name} vs {detail.opponent.name}
          </h1>
          <p>{t.headToHeadCopy}</p>
        </div>
      </section>

      <section className="stats-strip">
        <StatTile
          icon={<Swords aria-hidden="true" />}
          label={t.directRecord}
          value={recordText(detail.record, t)}
          detail={`${formatPercent(detail.record.winRate)} ${t.winRate}`}
        />
        <StatTile
          icon={<CircleDollarSign aria-hidden="true" />}
          label={`${detail.model.name} ${t.cost}`}
          value={formatMoney(detail.costComparison.model.totalCostUsd, t)}
          detail={`${formatMoney(detail.costComparison.model.costPerWin, t)} ${t.perWin}`}
        />
        <StatTile
          icon={<CircleDollarSign aria-hidden="true" />}
          label={`${detail.opponent.name} ${t.cost}`}
          value={formatMoney(detail.costComparison.opponent.totalCostUsd, t)}
          detail={`${formatMoney(detail.costComparison.opponent.costPerWin, t)} ${t.perWin}`}
        />
      </section>

      <section className="section-grid">
        <div className="panel">
          <div className="section-heading compact">
            <div>
              <span>{t.byGame}</span>
              <h2>{t.gameBreakdown}</h2>
            </div>
          </div>
          <ul className="breakdown-list">
            {detail.gameBreakdown.map((row) => (
              <li key={row.game.id}>
                <span>{row.game.name}</span>
                <strong>{recordText(row.record, t)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel wide">
          <div className="section-heading compact">
            <div>
              <span>{t.recentMeetings}</span>
              <h2>{t.matchHistory}</h2>
            </div>
          </div>
          <MatchTable data={data} matches={detail.meetings} language={language} t={t} />
        </div>
      </section>
    </div>
  );
}

function MatchDetailPage({
  data,
  language,
  t,
}: {
  data: LeagueData;
  language: Language;
  t: Copy;
}) {
  const { matchId } = useParams();
  const detail = matchId ? getMatchDetail(data, matchId) : null;

  if (!detail) {
    return <EmptyState title={t.notFound} t={t} />;
  }

  return (
    <div className="page-stack">
      <section className="model-header">
        <div>
          <Link className="back-link" to="/">
            {t.leaderboard}
          </Link>
          <h1>{detail.match.id}</h1>
          <p>{detail.match.summary}</p>
        </div>
      </section>

      <section className="stats-strip">
        <StatTile
          icon={<Swords aria-hidden="true" />}
          label={t.result}
          value={detail.winner?.name ?? t.draw}
          detail={`${detail.modelA.name} vs ${detail.modelB.name}`}
        />
        <StatTile
          icon={<BarChart3 aria-hidden="true" />}
          label={t.game}
          value={detail.game.name}
          detail={`${detail.match.turns} ${t.turns}`}
        />
        <StatTile
          icon={<Clock aria-hidden="true" />}
          label={t.duration}
          value={formatDuration(detail.match.durationSeconds, language)}
          detail={formatDate(detail.match.playedAt, language)}
        />
      </section>

      <section className="section-grid">
        <div className="panel">
          <div className="section-heading compact">
            <div>
              <span>{t.participants}</span>
              <h2>{t.matchSummary}</h2>
            </div>
          </div>
          <dl className="metric-list">
            <div>
              <dt>{t.modelA}</dt>
              <dd>
                <Link to={`/models/${detail.modelA.id}`}>{detail.modelA.name}</Link>
              </dd>
            </div>
            <div>
              <dt>{t.modelB}</dt>
              <dd>
                <Link to={`/models/${detail.modelB.id}`}>{detail.modelB.name}</Link>
              </dd>
            </div>
            <div>
              <dt>{t.outcome}</dt>
              <dd>{matchOutcomeText(data, detail.match, t)}</dd>
            </div>
          </dl>
        </div>

        <div className="panel wide">
          <div className="section-heading compact">
            <div>
              <span>{t.spend}</span>
              <h2>{t.costAndTokens}</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table aria-label={t.costAndTokens}>
              <thead>
                <tr>
                  <th>{t.model}</th>
                  <th>{t.input}</th>
                  <th>{t.output}</th>
                  <th>{t.cached}</th>
                  <th>{t.requests}</th>
                  <th>{t.elapsed}</th>
                  <th>{t.cost}</th>
                </tr>
              </thead>
              <tbody>
                {detail.costs.map((cost) => (
                  <tr key={`${cost.matchId}-${cost.modelId}`}>
                    <td>{modelName(data, cost.modelId)}</td>
                    <td>{cost.inputTokens.toLocaleString()}</td>
                    <td>{cost.outputTokens.toLocaleString()}</td>
                    <td>{cost.cachedTokens.toLocaleString()}</td>
                    <td>{cost.requestCount}</td>
                    <td>{formatDuration(cost.elapsedSeconds, language)}</td>
                    <td>{formatMoney(cost.estimatedCostUsd, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <div>
            <span>{t.elo}</span>
            <h2>{t.ratingChanges}</h2>
          </div>
        </div>
        <div className="table-scroll">
          <table className="compact-table" aria-label={t.ratingChanges}>
            <thead>
              <tr>
                <th>{t.model}</th>
                <th>{t.rating}</th>
                <th>{t.delta}</th>
              </tr>
            </thead>
            <tbody>
              {detail.ratingChanges.map((point) => (
                <tr key={`${point.modelId}-${point.recordedAt}`}>
                  <td>{modelName(data, point.modelId)}</td>
                  <td>{point.rating}</td>
                  <td>
                    <DeltaBadge value={point.deltaFromPrevious} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "dark") {
    return <Moon aria-hidden="true" />;
  }

  if (mode === "light") {
    return <Sun aria-hidden="true" />;
  }

  return <Monitor aria-hidden="true" />;
}

function SettingsControls({
  theme,
  setTheme,
  language,
  setLanguage,
  t,
}: {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  t: Copy;
}) {
  const themeLabels = {
    system: { text: t.themeSystem, aria: t.themeSystemLabel },
    light: { text: t.themeLight, aria: t.themeLightLabel },
    dark: { text: t.themeDark, aria: t.themeDarkLabel },
  };

  return (
    <div className="topbar-actions">
      <div className="icon-control-group" aria-label="Theme">
        {themeModes.map((mode) => (
          <button
            aria-label={themeLabels[mode].aria}
            className={theme === mode ? "active" : ""}
            key={mode}
            type="button"
            onClick={() => setTheme(mode)}
            title={themeLabels[mode].text}
          >
            <ThemeIcon mode={mode} />
            <span>{themeLabels[mode].text}</span>
          </button>
        ))}
      </div>
      <div className="language-switcher" aria-label={t.languageControl}>
        <Languages aria-hidden="true" />
        <button
          aria-label={t.viewInEnglish}
          className={language === "en" ? "active" : ""}
          type="button"
          onClick={() => setLanguage("en")}
        >
          EN
        </button>
        <button
          aria-label={t.viewInKorean}
          className={language === "ko" ? "active" : ""}
          type="button"
          onClick={() => setLanguage("ko")}
        >
          KO
        </button>
      </div>
    </div>
  );
}

function AppShell({
  data,
  language,
  setLanguage,
  theme,
  setTheme,
  t,
}: {
  data: LeagueData;
  language: Language;
  setLanguage: (language: Language) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  t: Copy;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <Swords aria-hidden="true" />
          <span>FightAll</span>
        </Link>
        <nav aria-label={t.appNav}>
          <Link to="/">{t.leaderboard}</Link>
          <Link to="/players">{t.aiPlayers}</Link>
        </nav>
        <SettingsControls
          theme={theme}
          setTheme={setTheme}
          language={language}
          setLanguage={setLanguage}
          t={t}
        />
      </header>
      <main>
        <Routes>
          <Route
            path="/"
            element={<Dashboard data={data} language={language} t={t} />}
          />
          <Route
            path="/models/:modelId"
            element={<ModelDetailPage data={data} language={language} t={t} />}
          />
          <Route
            path="/players"
            element={<PlayersPage data={data} language={language} t={t} />}
          />
          <Route
            path="/models/:modelId/vs/:opponentId"
            element={<HeadToHeadPage data={data} language={language} t={t} />}
          />
          <Route
            path="/matches/:matchId"
            element={<MatchDetailPage data={data} language={language} t={t} />}
          />
          <Route path="*" element={<EmptyState title={t.notFound} t={t} />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App({ initialData }: AppProps) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [data, setData] = useState<LeagueData | null>(initialData ?? null);
  const [error, setError] = useState<string | null>(() => {
    if (!initialData) {
      return null;
    }

    const errors = validateLeagueData(initialData);
    return errors.length > 0 ? errors.join(", ") : null;
  });
  const t = translations[language];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  useEffect(() => {
    if (initialData) {
      return;
    }

    loadLeagueData()
      .then(setData)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Failed to load data.");
      });
  }, [initialData]);

  if (error) {
    return <EmptyState title={t.dataError} t={t} />;
  }

  if (!data) {
    return (
      <div className="app-shell loading-shell">
        <p>{t.loading}</p>
      </div>
    );
  }

  return (
    <AppShell
      data={data}
      language={language}
      setLanguage={setLanguage}
      theme={theme}
      setTheme={setTheme}
      t={t}
    />
  );
}
