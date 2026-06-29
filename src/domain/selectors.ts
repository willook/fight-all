import type {
  ArenaModel,
  CostSnapshot,
  CostSummary,
  GameDefinition,
  GameRecord,
  HeadToHeadDetail,
  LeagueData,
  LeaderboardRow,
  MatchDetail,
  MatchSummary,
  ModelDetail,
  OpponentRecord,
  RatingPoint,
  RecordSummary,
} from "./types";

const emptyRecord = (): RecordSummary => ({
  wins: 0,
  losses: 0,
  draws: 0,
  total: 0,
  winRate: 0,
});

const sortByDateAsc = <T extends { recordedAt?: string; playedAt?: string }>(
  items: T[],
) =>
  [...items].sort((a, b) =>
    String(a.recordedAt ?? a.playedAt).localeCompare(
      String(b.recordedAt ?? b.playedAt),
    ),
  );

const sortMatchesDesc = (matches: MatchSummary[]) =>
  [...matches].sort((a, b) => b.playedAt.localeCompare(a.playedAt));

const roundMoney = (value: number) => Number(value.toFixed(4));

function finalizeRecord(record: RecordSummary): RecordSummary {
  return {
    ...record,
    total: record.wins + record.losses + record.draws,
    winRate:
      record.wins + record.losses + record.draws === 0
        ? 0
        : record.wins / (record.wins + record.losses + record.draws),
  };
}

function getModel(data: LeagueData, modelId: string): ArenaModel | undefined {
  return data.models.find((model) => model.id === modelId);
}

function getGame(data: LeagueData, gameId: string): GameDefinition | undefined {
  return data.games.find((game) => game.id === gameId);
}

function getModelMatches(data: LeagueData, modelId: string, gameId?: string | null) {
  return data.matches.filter(
    (match) =>
      (match.modelAId === modelId || match.modelBId === modelId) &&
      (gameId === undefined || gameId === null || match.gameId === gameId),
  );
}

function getMatchRecord(
  matches: MatchSummary[],
  modelId: string,
): RecordSummary {
  const record = emptyRecord();

  for (const match of matches) {
    if (match.result === "draw" || match.winnerModelId === null) {
      record.draws += 1;
    } else if (match.winnerModelId === modelId) {
      record.wins += 1;
    } else {
      record.losses += 1;
    }
  }

  return finalizeRecord(record);
}

function getRatingDelta(series: RatingPoint[]) {
  if (series.length < 2) {
    return 0;
  }

  return series[series.length - 1].rating - series[series.length - 2].rating;
}

export function getRatingSeries(
  data: LeagueData,
  modelId: string,
  gameId?: string | null,
): RatingPoint[] {
  const targetGameId = gameId === undefined ? null : gameId;
  const snapshots = sortByDateAsc(
    data.ratingSnapshots.filter((snapshot) => {
      if (snapshot.modelId !== modelId) {
        return false;
      }

      return snapshot.gameId === targetGameId;
    }),
  );

  return snapshots.map((snapshot, index) => ({
    ...snapshot,
    deltaFromPrevious:
      index === 0 ? 0 : snapshot.rating - snapshots[index - 1].rating,
  }));
}

export function getCurrentRating(data: LeagueData, modelId: string) {
  const series = getRatingSeries(data, modelId);
  return series.at(-1)?.rating ?? 0;
}

export function getRecentForm(
  data: LeagueData,
  modelId: string,
  limit = 5,
  gameId?: string | null,
): RecordSummary {
  return getMatchRecord(
    sortMatchesDesc(getModelMatches(data, modelId, gameId)).slice(0, limit),
    modelId,
  );
}

export function getModelCostSummary(
  data: LeagueData,
  modelId: string,
  gameId?: string | null,
): CostSummary {
  const matchIds =
    gameId === undefined || gameId === null
      ? null
      : new Set(
          data.matches
            .filter((match) => match.gameId === gameId)
            .map((match) => match.id),
        );
  const costs = data.costSnapshots.filter(
    (cost) =>
      cost.modelId === modelId && (matchIds === null || matchIds.has(cost.matchId)),
  );
  const record = getMatchRecord(getModelMatches(data, modelId, gameId), modelId);
  const totalCostUsd = costs.reduce(
    (sum, cost) => sum + cost.estimatedCostUsd,
    0,
  );
  const totalElapsedSeconds = costs.reduce(
    (sum, cost) => sum + cost.elapsedSeconds,
    0,
  );

  return {
    totalCostUsd: roundMoney(totalCostUsd),
    totalInputTokens: costs.reduce((sum, cost) => sum + cost.inputTokens, 0),
    totalOutputTokens: costs.reduce((sum, cost) => sum + cost.outputTokens, 0),
    totalCachedTokens: costs.reduce((sum, cost) => sum + cost.cachedTokens, 0),
    totalRequests: costs.reduce((sum, cost) => sum + cost.requestCount, 0),
    totalElapsedSeconds,
    averageElapsedSeconds:
      costs.length === 0 ? 0 : Number((totalElapsedSeconds / costs.length).toFixed(1)),
    costPerMatch:
      costs.length === 0 ? null : roundMoney(totalCostUsd / costs.length),
    costPerWin:
      record.wins === 0 ? null : roundMoney(totalCostUsd / record.wins),
  };
}

export function getLeaderboard(
  data: LeagueData,
  gameId?: string | null,
): LeaderboardRow[] {
  return data.models
    .map((model) => {
      const scopedSeries =
        gameId === undefined || gameId === null
          ? []
          : getRatingSeries(data, model.id, gameId);
      const series =
        scopedSeries.length > 0 ? scopedSeries : getRatingSeries(data, model.id);

      return {
        model,
        currentRating: series.at(-1)?.rating ?? 0,
        ratingDelta: getRatingDelta(series),
        overallRecord: getMatchRecord(
          getModelMatches(data, model.id, gameId),
          model.id,
        ),
        recentForm: getRecentForm(data, model.id, 5, gameId),
        costSummary: getModelCostSummary(data, model.id, gameId),
      };
    })
    .sort((a, b) => b.currentRating - a.currentRating);
}

export function getGameRecords(data: LeagueData, modelId: string): GameRecord[] {
  return data.games.map((game) => ({
    game,
    record: getMatchRecord(
      getModelMatches(data, modelId).filter((match) => match.gameId === game.id),
      modelId,
    ),
  }));
}

export function getOpponentRecords(
  data: LeagueData,
  modelId: string,
): OpponentRecord[] {
  return data.models
    .filter((opponent) => opponent.id !== modelId)
    .map((opponent) => {
      const meetings = sortMatchesDesc(
        data.matches.filter(
          (match) =>
            (match.modelAId === modelId && match.modelBId === opponent.id) ||
            (match.modelAId === opponent.id && match.modelBId === modelId),
        ),
      );

      return {
        opponent,
        record: getMatchRecord(meetings, modelId),
        latestMatch: meetings[0] ?? null,
      };
    })
    .filter((row) => row.record.total > 0)
    .sort((a, b) => b.record.total - a.record.total || a.opponent.name.localeCompare(b.opponent.name));
}

export function getModelDetail(
  data: LeagueData,
  modelId: string,
): ModelDetail | null {
  const model = getModel(data, modelId);

  if (!model) {
    return null;
  }

  const ratingSeries = getRatingSeries(data, modelId);

  return {
    model,
    currentRating: ratingSeries.at(-1)?.rating ?? 0,
    ratingDelta: getRatingDelta(ratingSeries),
    ratingSeries,
    overallRecord: getMatchRecord(getModelMatches(data, modelId), modelId),
    recentForm: getRecentForm(data, modelId),
    gameRecords: getGameRecords(data, modelId),
    opponentRecords: getOpponentRecords(data, modelId),
    recentMatches: sortMatchesDesc(getModelMatches(data, modelId)).slice(0, 8),
    costSummary: getModelCostSummary(data, modelId),
  };
}

function getHeadToHeadCosts(
  data: LeagueData,
  modelId: string,
  meetings: MatchSummary[],
): CostSummary {
  const meetingIds = new Set(meetings.map((match) => match.id));
  const costs = data.costSnapshots.filter(
    (cost) => cost.modelId === modelId && meetingIds.has(cost.matchId),
  );
  const record = getMatchRecord(meetings, modelId);
  const totalCostUsd = costs.reduce(
    (sum, cost) => sum + cost.estimatedCostUsd,
    0,
  );
  const totalElapsedSeconds = costs.reduce(
    (sum, cost) => sum + cost.elapsedSeconds,
    0,
  );

  return {
    totalCostUsd: roundMoney(totalCostUsd),
    totalInputTokens: costs.reduce((sum, cost) => sum + cost.inputTokens, 0),
    totalOutputTokens: costs.reduce((sum, cost) => sum + cost.outputTokens, 0),
    totalCachedTokens: costs.reduce((sum, cost) => sum + cost.cachedTokens, 0),
    totalRequests: costs.reduce((sum, cost) => sum + cost.requestCount, 0),
    totalElapsedSeconds,
    averageElapsedSeconds:
      costs.length === 0 ? 0 : Number((totalElapsedSeconds / costs.length).toFixed(1)),
    costPerMatch:
      costs.length === 0 ? null : roundMoney(totalCostUsd / costs.length),
    costPerWin:
      record.wins === 0 ? null : roundMoney(totalCostUsd / record.wins),
  };
}

export function getHeadToHead(
  data: LeagueData,
  modelId: string,
  opponentId: string,
): HeadToHeadDetail | null {
  const model = getModel(data, modelId);
  const opponent = getModel(data, opponentId);

  if (!model || !opponent) {
    return null;
  }

  const meetings = sortMatchesDesc(
    data.matches.filter(
      (match) =>
        (match.modelAId === modelId && match.modelBId === opponentId) ||
        (match.modelAId === opponentId && match.modelBId === modelId),
    ),
  );

  return {
    model,
    opponent,
    record: getMatchRecord(meetings, modelId),
    meetings,
    gameBreakdown: data.games
      .map((game) => ({
        game,
        record: getMatchRecord(
          meetings.filter((match) => match.gameId === game.id),
          modelId,
        ),
      })),
    costComparison: {
      model: getHeadToHeadCosts(data, modelId, meetings),
      opponent: getHeadToHeadCosts(data, opponentId, meetings),
    },
  };
}

export function getMatchDetail(
  data: LeagueData,
  matchId: string,
): MatchDetail | null {
  const match = data.matches.find((item) => item.id === matchId);

  if (!match) {
    return null;
  }

  const game = getGame(data, match.gameId);
  const modelA = getModel(data, match.modelAId);
  const modelB = getModel(data, match.modelBId);

  if (!game || !modelA || !modelB) {
    return null;
  }

  const costs = data.costSnapshots.filter((cost) => cost.matchId === match.id);
  const ratingChanges = data.ratingSnapshots
    .filter((snapshot) => snapshot.matchId === match.id)
    .map((snapshot) => {
      const series = getRatingSeries(data, snapshot.modelId);
      return series.find(
        (point) =>
          point.matchId === snapshot.matchId &&
          point.recordedAt === snapshot.recordedAt,
      );
    })
    .filter((point): point is RatingPoint => Boolean(point));

  return {
    match,
    game,
    modelA,
    modelB,
    winner: match.winnerModelId ? getModel(data, match.winnerModelId) ?? null : null,
    costs,
    ratingChanges,
  };
}

export function getMatchCostsForModels(
  costs: CostSnapshot[],
  models: ArenaModel[],
) {
  return models.map((model) => ({
    model,
    cost: costs.find((snapshot) => snapshot.modelId === model.id) ?? null,
  }));
}
