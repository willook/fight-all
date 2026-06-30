export type LeagueData = {
  models: ArenaModel[];
  games: GameDefinition[];
  matches: MatchSummary[];
  ratingSnapshots: RatingSnapshot[];
  costSnapshots: CostSnapshot[];
  sponsorshipPreviews: SponsorshipPreview[];
};

export type ArenaModel = {
  id: string;
  name: string;
  provider: string;
  version: string;
  profile: {
    mbti: string;
    tagline: string;
    quote: string;
    styleTags: string[];
    strengths: string[];
    weaknesses: string[];
  };
};

export type GameDefinition = {
  id: string;
  name: string;
  category: string;
  description: string;
  baseGameId?: string;
  languageCode?: string;
  languageName?: string;
};

export type MatchSummary = {
  id: string;
  playedAt: string;
  gameId: string;
  modelAId: string;
  modelBId: string;
  winnerModelId: string | null;
  result: "model_a" | "model_b" | "draw";
  turns: number;
  durationSeconds: number;
  summary: string;
};

export type RatingSnapshot = {
  modelId: string;
  gameId: string | null;
  rating: number;
  recordedAt: string;
  matchId: string | null;
};

export type CostSnapshot = {
  matchId: string;
  modelId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  requestCount: number;
  elapsedSeconds: number;
  estimatedCostUsd: number;
};

export type SponsorshipPreview = {
  modelId: string;
  totalFundedUsd: number;
  availableBudgetUsd: number;
  supporterCount: number;
  platformFeeRate: number;
  lastFundedAt: string;
  status: "preview";
};

export type RecordSummary = {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number;
};

export type RatingPoint = RatingSnapshot & {
  deltaFromPrevious: number;
};

export type CostSummary = {
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  totalRequests: number;
  totalElapsedSeconds: number;
  averageElapsedSeconds: number;
  costPerMatch: number | null;
  costPerWin: number | null;
};

export type ModelSponsorshipSummary = {
  status: "preview" | "pending";
  totalFundedUsd: number | null;
  availableBudgetUsd: number | null;
  supporterCount: number | null;
  platformFeeRate: number | null;
  lastFundedAt: string | null;
  averageMatchCostUsd: number | null;
  estimatedRemainingMatches: number | null;
};

export type LeaderboardRow = {
  model: ArenaModel;
  currentRating: number;
  ratingDelta: number;
  overallRecord: RecordSummary;
  recentForm: RecordSummary;
  costSummary: CostSummary;
};

export type GameRecord = {
  game: GameDefinition;
  record: RecordSummary;
};

export type OpponentRecord = {
  opponent: ArenaModel;
  record: RecordSummary;
  latestMatch: MatchSummary | null;
};

export type ModelDetail = {
  model: ArenaModel;
  currentRating: number;
  ratingDelta: number;
  ratingSeries: RatingPoint[];
  overallRecord: RecordSummary;
  recentForm: RecordSummary;
  gameRecords: GameRecord[];
  opponentRecords: OpponentRecord[];
  recentMatches: MatchSummary[];
  costSummary: CostSummary;
};

export type HeadToHeadDetail = {
  model: ArenaModel;
  opponent: ArenaModel;
  record: RecordSummary;
  meetings: MatchSummary[];
  gameBreakdown: GameRecord[];
  costComparison: {
    model: CostSummary;
    opponent: CostSummary;
  };
};

export type MatchDetail = {
  match: MatchSummary;
  game: GameDefinition;
  modelA: ArenaModel;
  modelB: ArenaModel;
  winner: ArenaModel | null;
  costs: CostSnapshot[];
  ratingChanges: RatingPoint[];
};
