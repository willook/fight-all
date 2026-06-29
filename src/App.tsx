import { useEffect, useMemo, useState } from "react";
import { ActionList, ActionMenu, BaseStyles, ThemeProvider } from "@primer/react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock,
  Plus,
  Swords,
  Trophy,
  Users,
  X,
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
  GameDefinition,
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
    playersEyebrow: "Roster",
    playersCopy:
      "Scan the lineup, expand a player, and jump into the full profile when a matchup looks interesting.",
    languageRecords: "Language records",
    viewPlayer: "View profile",
    expandPlayer: "Expand",
    collapsePlayer: "Collapse",
    sampleLeagueData: "FightAll League",
    heroCopy:
      "Compare AI models by Werewolf ratings, head-to-head records, and language-specific results.",
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
      "View every Werewolf result together, or switch leagues to compare English and Korean play.",
    ratingTrendOverview: "Rating trend overview",
    leagueRatingMovement: "League rating movement",
    ratingChartModels: "Chart models",
    addModel: "Add model",
    addModelToChart: "Add model to rating chart",
    hideModelPrefix: "Hide",
    hideModelSuffix: "from rating chart",
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
    graphFirstModelDetail: "Model profile",
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
      "See who wins this matchup, where they win, and how expensive each run is.",
    duration: "Duration",
    participants: "Participants",
    matchSummary: "Match summary",
    modelA: "Model A",
    modelB: "Model B",
    outcome: "Outcome",
    spend: "Spend",
    costAndTokens: "Usage",
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
    notFoundCopy: "We could not find that FightAll record.",
    backToLeaderboard: "Back to leaderboard",
    loading: "Loading FightAll league data...",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystemLabel: "Theme: System",
    themeLightLabel: "Theme: Light",
    themeDarkLabel: "Theme: Dark",
    languageControl: "Language",
    themeControl: "Theme",
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
    playersEyebrow: "선수단",
    playersCopy:
      "순위표에서 선수를 펼쳐보고, 궁금한 모델은 상세 프로필에서 전적을 더 확인하세요.",
    languageRecords: "언어별 전적",
    viewPlayer: "프로필 보기",
    expandPlayer: "펼치기",
    collapsePlayer: "접기",
    sampleLeagueData: "FightAll 리그",
    heroCopy:
      "AI 모델들이 늑대인간으로 겨룬 결과를 레이팅과 전적으로 비교하세요.",
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
      "전체 결과를 한 번에 보거나, 영어와 한국어 리그를 나눠 비교할 수 있습니다.",
    ratingTrendOverview: "레이팅 추이",
    leagueRatingMovement: "리그 레이팅 변화",
    ratingChartModels: "차트 모델",
    addModel: "모델 추가",
    addModelToChart: "레이팅 차트에 모델 추가",
    hideModelPrefix: "레이팅 차트에서",
    hideModelSuffix: "숨기기",
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
    graphFirstModelDetail: "모델 프로필",
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
      "두 모델의 맞대결 승부, 강한 리그, 사용량 차이를 확인하세요.",
    duration: "소요 시간",
    participants: "참가 모델",
    matchSummary: "경기 요약",
    modelA: "모델 A",
    modelB: "모델 B",
    outcome: "판정",
    spend: "사용량",
    costAndTokens: "사용량",
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
    notFoundCopy: "해당 FightAll 기록을 찾을 수 없습니다.",
    backToLeaderboard: "리더보드로 돌아가기",
    loading: "FightAll 리그 데이터를 불러오는 중...",
    themeSystem: "시스템",
    themeLight: "라이트",
    themeDark: "다크",
    themeSystemLabel: "테마: 시스템",
    themeLightLabel: "테마: 라이트",
    themeDarkLabel: "테마: 다크",
    languageControl: "언어",
    themeControl: "테마",
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

function localizedGameName(game: GameDefinition, language: Language) {
  if (game.baseGameId === "werewolf" || game.id.startsWith("werewolf-")) {
    const languageName =
      game.languageCode === "ko"
        ? language === "ko"
          ? "한국어"
          : "Korean"
        : language === "ko"
          ? "영어"
          : "English";

    return language === "ko"
      ? `늑대인간 - ${languageName}`
      : `Werewolf - ${languageName}`;
  }

  return game.name;
}

function gameName(data: LeagueData, gameId: string, language: Language) {
  const game = data.games.find((item) => item.id === gameId);
  return game ? localizedGameName(game, language) : gameId;
}

function hideModelFromChartLabel(modelName: string, language: Language, t: Copy) {
  return language === "ko"
    ? `${t.hideModelPrefix} ${modelName} ${t.hideModelSuffix}`
    : `${t.hideModelPrefix} ${modelName} ${t.hideModelSuffix}`;
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
  t,
}: {
  data: LeagueData;
  gameId: string | null;
  language: Language;
  t: Copy;
}) {
  const [visibleModelIds, setVisibleModelIds] = useState(() =>
    data.models.map((model) => model.id),
  );
  const visibleIdSet = useMemo(() => new Set(visibleModelIds), [visibleModelIds]);
  const visibleModels = data.models.filter((model) => visibleIdSet.has(model.id));
  const hiddenModels = data.models.filter((model) => !visibleIdSet.has(model.id));

  useEffect(() => {
    setVisibleModelIds((currentIds) => {
      const validIds = currentIds.filter((modelId) =>
        data.models.some((model) => model.id === modelId),
      );

      return validIds.length > 0
        ? validIds
        : data.models.map((model) => model.id);
    });
  }, [data.models]);

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
    <div className="chart-block" data-testid="rating-overview-chart">
      <div className="chart-model-controls" aria-label={t.ratingChartModels}>
        <div className="chart-model-list">
          {visibleModels.map((model) => (
            <span className="chart-model-chip" key={model.id}>
              {model.name}
              <button
                aria-label={hideModelFromChartLabel(model.name, language, t)}
                disabled={visibleModels.length === 1}
                onClick={() => {
                  setVisibleModelIds((currentIds) =>
                    currentIds.filter((modelId) => modelId !== model.id),
                  );
                }}
                title={hideModelFromChartLabel(model.name, language, t)}
                type="button"
              >
                <X aria-hidden="true" size={14} />
              </button>
            </span>
          ))}
        </div>
        <label className="chart-add-model">
          <Plus aria-hidden="true" size={16} />
          <select
            aria-label={t.addModelToChart}
            disabled={hiddenModels.length === 0}
            onChange={(event) => {
              const modelId = event.currentTarget.value;
              if (!modelId) {
                return;
              }

              setVisibleModelIds((currentIds) => [...currentIds, modelId]);
              event.currentTarget.value = "";
            }}
            value=""
          >
            <option value="">{t.addModel}</option>
            {hiddenModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="chart-frame">
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
        {visibleModels.map((model) => {
          const modelIndex = data.models.findIndex((item) => item.id === model.id);

          return (
            <Line
              key={model.id}
              type="monotone"
              dataKey={model.id}
              name={model.name}
              stroke={chartColors[modelIndex % chartColors.length]}
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
          );
        })}
      </LineChart>
      </div>
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
              {localizedGameName(game, language)}
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
            t={t}
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
            <h2>
              {selectedGame ? localizedGameName(selectedGame, language) : t.leaderboard}
            </h2>
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
  const [expandedModelIds, setExpandedModelIds] = useState<Set<string>>(
    () => new Set(),
  );
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

      <section className="player-roster" aria-label={t.aiPlayers}>
        {playerRows.map((row, index) => {
            const isExpanded = expandedModelIds.has(row.model.id);
            const toggleLabel = `${isExpanded ? t.collapsePlayer : t.expandPlayer} ${row.model.name}`;

            return (
              <article className="player-row" key={row.model.id}>
                <div className="player-row-main">
                  <span className="rank-chip">#{index + 1}</span>
                  <div className="player-row-identity">
                    <span className="profile-provider">{row.model.provider}</span>
                    <h2>{row.model.name}</h2>
                    <p>{row.model.profile.tagline}</p>
                  </div>
                  <dl className="player-row-metrics">
                    <div>
                      <dt>{t.rating}</dt>
                      <dd>{row.currentRating}</dd>
                    </div>
                    <div>
                      <dt>{t.delta}</dt>
                      <dd>
                        <DeltaBadge value={row.ratingDelta} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t.record}</dt>
                      <dd>{recordText(row.overallRecord, t)}</dd>
                    </div>
                    <div>
                      <dt>{t.costPerWin}</dt>
                      <dd>{formatMoney(row.costSummary.costPerWin, t)}</dd>
                    </div>
                  </dl>
                  <div className="player-row-actions">
                    <button
                      aria-expanded={isExpanded}
                      aria-label={toggleLabel}
                      className="ghost-button"
                      type="button"
                      onClick={() => {
                        setExpandedModelIds((currentIds) => {
                          const nextIds = new Set(currentIds);
                          if (nextIds.has(row.model.id)) {
                            nextIds.delete(row.model.id);
                          } else {
                            nextIds.add(row.model.id);
                          }

                          return nextIds;
                        });
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp aria-hidden="true" size={16} />
                      ) : (
                        <ChevronDown aria-hidden="true" size={16} />
                      )}
                      <span>{isExpanded ? t.collapsePlayer : t.expandPlayer}</span>
                    </button>
                    <Link
                      className="button-link player-link"
                      to={`/models/${row.model.id}`}
                      aria-label={`${t.viewPlayer} for ${row.model.name}`}
                    >
                      {t.viewPlayer}
                    </Link>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="player-row-detail">
                    <div>
                      <h3>{t.latestFiveMatches}</h3>
                      <p>{recordText(row.recentForm, t)}</p>
                    </div>
                    <div>
                      <h3>{t.languageRecords}</h3>
                      <ul className="breakdown-list">
                        {row.detail.gameRecords.map((gameRecord) => (
                          <GameRecordItem
                            key={gameRecord.game.id}
                            data={data}
                            gameId={gameRecord.game.id}
                            modelId={row.model.id}
                            name={localizedGameName(gameRecord.game, language)}
                            record={gameRecord.record}
                            language={language}
                            t={t}
                          />
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3>{t.recentForm}</h3>
                      <div className="tag-row compact-tags">
                        {row.model.profile.styleTags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
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
                name={localizedGameName(row.game, language)}
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
              <td>{gameName(data, match.gameId, language)}</td>
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
                <span>{localizedGameName(row.game, language)}</span>
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
          value={localizedGameName(detail.game, language)}
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
  const themeLabels: Record<ThemeMode, string> = {
    system: t.themeSystem,
    light: t.themeLight,
    dark: t.themeDark,
  };
  const languageLabel = language === "ko" ? "KO" : "EN";

  return (
    <div className="topbar-actions">
      <ActionMenu>
        <ActionMenu.Button
          aria-label={`${t.themeControl}: ${themeLabels[theme]}`}
          className="settings-menu-button"
        >
          <span className="settings-menu-label">{t.themeControl}</span>
          <span className="settings-menu-value">{themeLabels[theme]}</span>
        </ActionMenu.Button>
        <ActionMenu.Overlay width="small">
          <ActionList selectionVariant="single">
            {themeModes.map((mode) => (
              <ActionList.Item
                key={mode}
                onSelect={() => setTheme(mode)}
                selected={theme === mode}
              >
                {themeLabels[mode]}
              </ActionList.Item>
            ))}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
      <ActionMenu>
        <ActionMenu.Button
          aria-label={`${t.languageControl}: ${languageLabel}`}
          className="settings-menu-button settings-menu-button--language"
        >
          <span className="settings-menu-label">{t.languageControl}</span>
          <span className="settings-menu-value">{languageLabel}</span>
        </ActionMenu.Button>
        <ActionMenu.Overlay width="small">
          <ActionList selectionVariant="single">
            <ActionList.Item
              onSelect={() => setLanguage("en")}
              selected={language === "en"}
            >
              English
            </ActionList.Item>
            <ActionList.Item
              onSelect={() => setLanguage("ko")}
              selected={language === "ko"}
            >
              한국어
            </ActionList.Item>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
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

  const primerColorMode = theme === "system" ? "auto" : theme;

  return (
    <ThemeProvider
      colorMode={primerColorMode}
      dayScheme="light"
      nightScheme="dark"
    >
      <BaseStyles>
        <AppShell
          data={data}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          setTheme={setTheme}
          t={t}
        />
      </BaseStyles>
    </ThemeProvider>
  );
}
