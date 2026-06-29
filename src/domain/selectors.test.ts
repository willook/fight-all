import { describe, expect, it } from "vitest";
import {
  getHeadToHead,
  getLeaderboard,
  getMatchDetail,
  getModelCostSummary,
  getModelDetail,
  getRatingSeries,
  getRecentForm,
} from "./selectors";
import type { LeagueData } from "./types";

const data: LeagueData = {
  models: [
    {
      id: "alpha",
      name: "Alpha",
      provider: "OpenAI",
      version: "1",
      profile: {
        mbti: "ENTJ",
        tagline: "Fast climber",
        quote: "I convert pressure into rating.",
        styleTags: ["Aggressive"],
        strengths: ["Tactics"],
        weaknesses: ["Long games"],
      },
    },
    {
      id: "beta",
      name: "Beta",
      provider: "Anthropic",
      version: "1",
      profile: {
        mbti: "INTP",
        tagline: "Careful closer",
        quote: "I wait until the board admits it.",
        styleTags: ["Careful"],
        strengths: ["Defense"],
        weaknesses: ["Speed"],
      },
    },
    {
      id: "gamma",
      name: "Gamma",
      provider: "Google",
      version: "1",
      profile: {
        mbti: "ISTP",
        tagline: "Quiet spoiler",
        quote: "Upsets are just forecasts arriving early.",
        styleTags: ["Tactical"],
        strengths: ["Endgames"],
        weaknesses: ["Opening traps"],
      },
    },
  ],
  games: [
    {
      id: "ttt",
      name: "Tic Tac Toe",
      category: "board",
      description: "Tiny deterministic board game.",
    },
    {
      id: "connect-four",
      name: "Connect Four",
      category: "board",
      description: "Column-drop board game.",
    },
  ],
  matches: [
    {
      id: "m1",
      playedAt: "2026-06-01T00:00:00.000Z",
      gameId: "ttt",
      modelAId: "alpha",
      modelBId: "beta",
      winnerModelId: "alpha",
      result: "model_a",
      turns: 7,
      durationSeconds: 80,
      summary: "Alpha converted a fork.",
    },
    {
      id: "m2",
      playedAt: "2026-06-02T00:00:00.000Z",
      gameId: "connect-four",
      modelAId: "beta",
      modelBId: "alpha",
      winnerModelId: "alpha",
      result: "model_b",
      turns: 18,
      durationSeconds: 180,
      summary: "Alpha won from second seat.",
    },
    {
      id: "m3",
      playedAt: "2026-06-03T00:00:00.000Z",
      gameId: "ttt",
      modelAId: "gamma",
      modelBId: "beta",
      winnerModelId: null,
      result: "draw",
      turns: 9,
      durationSeconds: 90,
      summary: "A clean draw.",
    },
  ],
  ratingSnapshots: [
    {
      modelId: "alpha",
      gameId: null,
      rating: 1500,
      recordedAt: "2026-06-01T00:00:00.000Z",
      matchId: null,
    },
    {
      modelId: "alpha",
      gameId: null,
      rating: 1532,
      recordedAt: "2026-06-02T00:00:00.000Z",
      matchId: "m1",
    },
    {
      modelId: "alpha",
      gameId: null,
      rating: 1560,
      recordedAt: "2026-06-03T00:00:00.000Z",
      matchId: "m2",
    },
    {
      modelId: "beta",
      gameId: null,
      rating: 1510,
      recordedAt: "2026-06-01T00:00:00.000Z",
      matchId: null,
    },
    {
      modelId: "beta",
      gameId: null,
      rating: 1488,
      recordedAt: "2026-06-03T00:00:00.000Z",
      matchId: "m2",
    },
    {
      modelId: "gamma",
      gameId: null,
      rating: 1490,
      recordedAt: "2026-06-03T00:00:00.000Z",
      matchId: "m3",
    },
  ],
  costSnapshots: [
    {
      matchId: "m1",
      modelId: "alpha",
      provider: "OpenAI",
      inputTokens: 100,
      outputTokens: 40,
      cachedTokens: 10,
      requestCount: 3,
      elapsedSeconds: 30,
      estimatedCostUsd: 0.04,
    },
    {
      matchId: "m2",
      modelId: "alpha",
      provider: "OpenAI",
      inputTokens: 120,
      outputTokens: 50,
      cachedTokens: 0,
      requestCount: 4,
      elapsedSeconds: 45,
      estimatedCostUsd: 0.05,
    },
    {
      matchId: "m1",
      modelId: "beta",
      provider: "Anthropic",
      inputTokens: 100,
      outputTokens: 70,
      cachedTokens: 0,
      requestCount: 3,
      elapsedSeconds: 40,
      estimatedCostUsd: 0.08,
    },
    {
      matchId: "m3",
      modelId: "gamma",
      provider: "Google",
      inputTokens: 90,
      outputTokens: 20,
      cachedTokens: 0,
      requestCount: 2,
      elapsedSeconds: 25,
      estimatedCostUsd: 0.01,
    },
  ],
};

describe("league selectors", () => {
  it("sorts the leaderboard by current rating", () => {
    const rows = getLeaderboard(data);
    expect(rows.map((row) => row.model.id)).toEqual(["alpha", "gamma", "beta"]);
    expect(rows[0].ratingDelta).toBe(28);
  });

  it("can scope the leaderboard to a game or language", () => {
    const rows = getLeaderboard(data, "ttt");
    expect(rows.map((row) => row.model.id)).toEqual(["alpha", "gamma", "beta"]);
    expect(rows[0].overallRecord).toMatchObject({ wins: 1, losses: 0, draws: 0 });
  });

  it("calculates recent form from latest matches", () => {
    expect(getRecentForm(data, "alpha", 10)).toMatchObject({
      wins: 2,
      losses: 0,
      draws: 0,
      total: 2,
    });
  });

  it("computes head-to-head records regardless of model order", () => {
    const first = getHeadToHead(data, "alpha", "beta");
    const reversed = getHeadToHead(data, "beta", "alpha");

    expect(first?.record).toMatchObject({ wins: 2, losses: 0, draws: 0 });
    expect(reversed?.record).toMatchObject({ wins: 0, losses: 2, draws: 0 });
    expect(first?.meetings.map((match) => match.id)).toEqual(["m2", "m1"]);
  });

  it("handles zero-win cost efficiency without crashing", () => {
    const summary = getModelCostSummary(data, "gamma");
    expect(summary.costPerWin).toBeNull();
    expect(summary.totalCostUsd).toBe(0.01);
  });

  it("returns rich detail objects or null for missing records", () => {
    expect(getModelDetail(data, "alpha")?.overallRecord.wins).toBe(2);
    expect(getRatingSeries(data, "alpha")).toHaveLength(3);
    expect(getMatchDetail(data, "m1")?.winner?.id).toBe("alpha");
    expect(getModelDetail(data, "missing")).toBeNull();
    expect(getMatchDetail(data, "missing")).toBeNull();
  });
});
