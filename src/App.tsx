import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CircleDollarSign,
  Clock,
  Swords,
  Trophy,
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
  CostSummary,
  LeagueData,
  MatchSummary,
  RatingPoint,
  RecordSummary,
} from "./domain/types";
import { validateLeagueData } from "./domain/validation";

type AppProps = {
  initialData?: LeagueData;
};

const chartColors = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#d97706"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDelta(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function formatMoney(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `$${value.toFixed(3)}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function recordText(record: RecordSummary) {
  return `${record.wins}W ${record.losses}L ${record.draws}D`;
}

function matchOutcomeText(data: LeagueData, match: MatchSummary) {
  if (!match.winnerModelId) {
    return "Draw";
  }

  return `${modelName(data, match.winnerModelId)} won`;
}

function modelName(data: LeagueData, modelId: string) {
  return data.models.find((model) => model.id === modelId)?.name ?? modelId;
}

function gameName(data: LeagueData, gameId: string) {
  return data.games.find((game) => game.id === gameId)?.name ?? gameId;
}

function gameFilterLabel(gameId: string) {
  if (gameId === "werewolf-en") {
    return "Werewolf English";
  }

  if (gameId === "werewolf-ko") {
    return "늑대인간 한국어";
  }

  return gameId;
}

function EmptyState({ title }: { title: string }) {
  return (
    <section className="empty-state">
      <h1>{title}</h1>
      <p>This record is not available in the bundled sample league data.</p>
      <Link className="button-link" to="/">
        Back to leaderboard
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
}: {
  data: LeagueData;
  gameId: string | null;
}) {
  const rows = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number>>();
    const snapshots = data.ratingSnapshots.filter(
      (snapshot) => snapshot.gameId === gameId,
    );

    for (const snapshot of snapshots) {
      const label = formatShortDate(snapshot.recordedAt);
      const row = byDate.get(snapshot.recordedAt) ?? { date: label };
      row[snapshot.modelId] = snapshot.rating;
      byDate.set(snapshot.recordedAt, row);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => row);
  }, [data, gameId]);

  return (
    <div className="chart-frame" data-testid="rating-overview-chart">
      <LineChart width={760} height={300} data={rows} margin={{ left: 8, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d7dde8" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={44} domain={["dataMin - 20", "dataMax + 20"]} />
        <Tooltip />
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

function ModelRatingChart({ series }: { series: RatingPoint[] }) {
  return (
    <div className="chart-frame" data-testid="model-rating-chart">
      <LineChart
        width={760}
        height={300}
        data={series.map((point) => ({
          date: formatShortDate(point.recordedAt),
          rating: point.rating,
        }))}
        margin={{ left: 8, right: 24 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#d7dde8" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={44} domain={["dataMin - 20", "dataMax + 20"]} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="rating"
          name="Rating"
          stroke="#2563eb"
          strokeWidth={3}
          dot={{ r: 4 }}
        />
      </LineChart>
    </div>
  );
}

function CostBlock({ summary }: { summary: CostSummary }) {
  return (
    <dl className="metric-list">
      <div>
        <dt>Total cost</dt>
        <dd>{formatMoney(summary.totalCostUsd)}</dd>
      </div>
      <div>
        <dt>Cost per win</dt>
        <dd>{formatMoney(summary.costPerWin)}</dd>
      </div>
      <div>
        <dt>Requests</dt>
        <dd>{summary.totalRequests.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Avg time</dt>
        <dd>{formatDuration(Math.round(summary.averageElapsedSeconds))}</dd>
      </div>
    </dl>
  );
}

function Dashboard({ data }: { data: LeagueData }) {
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
          <p className="eyebrow">Sample league data</p>
          <h1>FightAll</h1>
          <p>
            A record-first AI model arena MVP for comparing Werewolf ratings,
            opponent records, and cost efficiency across English and Korean sample
            leagues.
          </p>
        </div>
        <div className="hero-stats">
          <StatTile
            icon={<Trophy aria-hidden="true" />}
            label="Leader"
            value={topModel.model.name}
            detail={`${topModel.currentRating} rating`}
          />
          <StatTile
            icon={<Activity aria-hidden="true" />}
            label="Best recent move"
            value={rising.model.name}
            detail={`${formatDelta(rising.ratingDelta)} latest delta`}
          />
          <StatTile
            icon={<CircleDollarSign aria-hidden="true" />}
            label="Cost-efficient"
            value={efficient.model.name}
            detail={`${formatMoney(efficient.costSummary.costPerWin)} per win`}
          />
        </div>
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <div>
            <span>Game and language</span>
            <h2>League scope</h2>
          </div>
        </div>
        <div className="segmented-control" aria-label="Game language filter">
          <button
            className={selectedGameId === null ? "active" : ""}
            type="button"
            onClick={() => setSelectedGameId(null)}
          >
            All League
          </button>
          {data.games.map((game) => (
            <button
              className={selectedGameId === game.id ? "active" : ""}
              key={game.id}
              type="button"
              onClick={() => setSelectedGameId(game.id)}
            >
              {gameFilterLabel(game.id)}
            </button>
          ))}
        </div>
        <p className="language-note">
          {selectedGame
            ? selectedGame.description
            : "Overall view combines the English and Korean Werewolf sample leagues without treating one language as the universal ranking."}
        </p>
      </section>

      <section className="section-grid">
        <div className="panel wide">
          <div className="section-heading">
            <div>
              <span>Rating trend overview</span>
              <h2>League rating movement</h2>
            </div>
            <BarChart3 aria-hidden="true" />
          </div>
          <RatingOverviewChart data={data} gameId={selectedGameId} />
        </div>
        <div className="panel">
          <div className="section-heading compact">
            <div>
              <span>Momentum</span>
              <h2>Rising and falling</h2>
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
            <span>Current standings</span>
            <h2>{selectedGame ? selectedGame.name : "Leaderboard"}</h2>
          </div>
          <Swords aria-hidden="true" />
        </div>
        <div className="table-scroll">
          <table aria-label="Leaderboard">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Model</th>
                <th>Provider</th>
                <th>Version</th>
                <th>Rating</th>
                <th>Delta</th>
                <th>Record</th>
                <th>Recent form</th>
                <th>Cost / win</th>
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
                  <td>{recordText(row.overallRecord)}</td>
                  <td>{recordText(row.recentForm)}</td>
                  <td>{formatMoney(row.costSummary.costPerWin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ModelProfile({
  model,
  currentRating,
}: {
  model: ArenaModel;
  currentRating: number;
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
          <dt>Current rating</dt>
          <dd>{currentRating}</dd>
        </div>
        <div>
          <dt>Version</dt>
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
}: {
  data: LeagueData;
  gameId: string;
  modelId: string;
  name: string;
  record: RecordSummary;
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
          {formatDelta(ratingDelta)} rating ·{" "}
          {formatMoney(costSummary.costPerWin)} / win ·{" "}
          {formatDuration(Math.round(costSummary.averageElapsedSeconds))} avg
        </small>
      </span>
      <strong>{recordText(record)}</strong>
    </li>
  );
}

function ModelDetailPage({ data }: { data: LeagueData }) {
  const { modelId } = useParams();
  const detail = modelId ? getModelDetail(data, modelId) : null;

  if (!detail) {
    return <EmptyState title="Not found" />;
  }

  return (
    <div className="page-stack">
      <section className="model-header">
        <div>
          <Link className="back-link" to="/">
            Leaderboard
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
              <span>Rating history</span>
              <h2>Graph-first model detail</h2>
            </div>
          </div>
          <ModelRatingChart series={detail.ratingSeries} />
        </div>
        <ModelProfile model={detail.model} currentRating={detail.currentRating} />
      </section>

      <section className="stats-strip">
        <StatTile
          icon={<Trophy aria-hidden="true" />}
          label="Overall record"
          value={recordText(detail.overallRecord)}
          detail={`${formatPercent(detail.overallRecord.winRate)} win rate`}
        />
        <StatTile
          icon={<Activity aria-hidden="true" />}
          label="Recent form"
          value={recordText(detail.recentForm)}
          detail="Latest five matches"
        />
        <StatTile
          icon={<Clock aria-hidden="true" />}
          label="Average time"
          value={formatDuration(Math.round(detail.costSummary.averageElapsedSeconds))}
          detail={`${detail.costSummary.totalRequests} total requests`}
        />
        <StatTile
          icon={<CircleDollarSign aria-hidden="true" />}
          label="Cost per win"
          value={formatMoney(detail.costSummary.costPerWin)}
          detail={`${formatMoney(detail.costSummary.totalCostUsd)} total`}
        />
      </section>

      <section className="section-grid">
        <div className="panel">
          <div className="section-heading compact">
            <div>
              <span>By game</span>
              <h2>Game records</h2>
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
              />
            ))}
          </ul>
        </div>

        <div className="panel wide">
          <div className="section-heading compact">
            <div>
              <span>Opponents</span>
              <h2>Opponent records</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table aria-label="Opponent records">
              <thead>
                <tr>
                  <th>Opponent</th>
                  <th>Record</th>
                  <th>Win rate</th>
                  <th>Latest meeting</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {detail.opponentRecords.map((row) => (
                  <tr key={row.opponent.id}>
                    <td>{row.opponent.name}</td>
                    <td>{recordText(row.record)}</td>
                    <td>{formatPercent(row.record.winRate)}</td>
                    <td>
                      {row.latestMatch ? formatDate(row.latestMatch.playedAt) : "n/a"}
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
            <span>Latest results</span>
            <h2>Recent matches</h2>
          </div>
        </div>
        <MatchTable data={data} matches={detail.recentMatches} />
      </section>
    </div>
  );
}

function MatchTable({
  data,
  matches,
}: {
  data: LeagueData;
  matches: MatchSummary[];
}) {
  return (
    <div className="table-scroll">
      <table aria-label="Recent matches">
        <thead>
          <tr>
            <th>Match</th>
            <th>Game</th>
            <th>Models</th>
            <th>Result</th>
            <th>Turns</th>
            <th>Played</th>
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
                  : "Draw"}
              </td>
              <td>{match.turns}</td>
              <td>{formatDate(match.playedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeadToHeadPage({ data }: { data: LeagueData }) {
  const { modelId, opponentId } = useParams();
  const detail =
    modelId && opponentId ? getHeadToHead(data, modelId, opponentId) : null;

  if (!detail) {
    return <EmptyState title="Not found" />;
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
          <p>
            Head-to-head results, per-game splits, recent meetings, and cost/time
            comparison computed from match history.
          </p>
        </div>
      </section>

      <section className="stats-strip">
        <StatTile
          icon={<Swords aria-hidden="true" />}
          label="Direct record"
          value={recordText(detail.record)}
          detail={`${formatPercent(detail.record.winRate)} win rate`}
        />
        <StatTile
          icon={<CircleDollarSign aria-hidden="true" />}
          label={`${detail.model.name} cost`}
          value={formatMoney(detail.costComparison.model.totalCostUsd)}
          detail={`${formatMoney(detail.costComparison.model.costPerWin)} per win`}
        />
        <StatTile
          icon={<CircleDollarSign aria-hidden="true" />}
          label={`${detail.opponent.name} cost`}
          value={formatMoney(detail.costComparison.opponent.totalCostUsd)}
          detail={`${formatMoney(detail.costComparison.opponent.costPerWin)} per win`}
        />
      </section>

      <section className="section-grid">
        <div className="panel">
          <div className="section-heading compact">
            <div>
              <span>By game</span>
              <h2>Game breakdown</h2>
            </div>
          </div>
          <ul className="breakdown-list">
            {detail.gameBreakdown.map((row) => (
              <li key={row.game.id}>
                <span>{row.game.name}</span>
                <strong>{recordText(row.record)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel wide">
          <div className="section-heading compact">
            <div>
              <span>Recent meetings</span>
              <h2>Match history</h2>
            </div>
          </div>
          <MatchTable data={data} matches={detail.meetings} />
        </div>
      </section>
    </div>
  );
}

function MatchDetailPage({ data }: { data: LeagueData }) {
  const { matchId } = useParams();
  const detail = matchId ? getMatchDetail(data, matchId) : null;

  if (!detail) {
    return <EmptyState title="Not found" />;
  }

  return (
    <div className="page-stack">
      <section className="model-header">
        <div>
          <Link className="back-link" to="/">
            Leaderboard
          </Link>
          <h1>{detail.match.id}</h1>
          <p>{detail.match.summary}</p>
        </div>
      </section>

      <section className="stats-strip">
        <StatTile
          icon={<Swords aria-hidden="true" />}
          label="Result"
          value={detail.winner?.name ?? "Draw"}
          detail={`${detail.modelA.name} vs ${detail.modelB.name}`}
        />
        <StatTile
          icon={<BarChart3 aria-hidden="true" />}
          label="Game"
          value={detail.game.name}
          detail={`${detail.match.turns} turns`}
        />
        <StatTile
          icon={<Clock aria-hidden="true" />}
          label="Duration"
          value={formatDuration(detail.match.durationSeconds)}
          detail={formatDate(detail.match.playedAt)}
        />
      </section>

      <section className="section-grid">
        <div className="panel">
          <div className="section-heading compact">
            <div>
              <span>Participants</span>
              <h2>Match summary</h2>
            </div>
          </div>
          <dl className="metric-list">
            <div>
              <dt>Model A</dt>
              <dd>
                <Link to={`/models/${detail.modelA.id}`}>{detail.modelA.name}</Link>
              </dd>
            </div>
            <div>
              <dt>Model B</dt>
              <dd>
                <Link to={`/models/${detail.modelB.id}`}>{detail.modelB.name}</Link>
              </dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>{matchOutcomeText(data, detail.match)}</dd>
            </div>
          </dl>
        </div>

        <div className="panel wide">
          <div className="section-heading compact">
            <div>
              <span>Spend</span>
              <h2>Cost and tokens</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table aria-label="Cost and tokens">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Input</th>
                  <th>Output</th>
                  <th>Cached</th>
                  <th>Requests</th>
                  <th>Elapsed</th>
                  <th>Cost</th>
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
                    <td>{formatDuration(cost.elapsedSeconds)}</td>
                    <td>{formatMoney(cost.estimatedCostUsd)}</td>
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
            <span>Elo</span>
            <h2>Rating changes</h2>
          </div>
        </div>
        <div className="table-scroll">
          <table className="compact-table" aria-label="Rating changes">
            <thead>
              <tr>
                <th>Model</th>
                <th>Rating</th>
                <th>Delta</th>
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

function AppShell({ data }: { data: LeagueData }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <Swords aria-hidden="true" />
          <span>FightAll</span>
        </Link>
        <nav aria-label="Main">
          <Link to="/">Leaderboard</Link>
          <a href="https://github.com/google-deepmind/game_arena">Game Arena</a>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard data={data} />} />
          <Route path="/models/:modelId" element={<ModelDetailPage data={data} />} />
          <Route
            path="/models/:modelId/vs/:opponentId"
            element={<HeadToHeadPage data={data} />}
          />
          <Route path="/matches/:matchId" element={<MatchDetailPage data={data} />} />
          <Route path="*" element={<EmptyState title="Not found" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App({ initialData }: AppProps) {
  const [data, setData] = useState<LeagueData | null>(initialData ?? null);
  const [error, setError] = useState<string | null>(() => {
    if (!initialData) {
      return null;
    }

    const errors = validateLeagueData(initialData);
    return errors.length > 0 ? errors.join(", ") : null;
  });

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
    return <EmptyState title="Data error" />;
  }

  if (!data) {
    return (
      <div className="app-shell loading-shell">
        <p>Loading FightAll league data...</p>
      </div>
    );
  }

  return <AppShell data={data} />;
}
