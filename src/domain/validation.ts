import type { LeagueData } from "./types";

const requiredTopLevelKeys = [
  "models",
  "games",
  "matches",
  "ratingSnapshots",
  "costSnapshots",
  "sponsorshipPreviews",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" && value[key].length > 0;
}

function hasNumber(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "number" && Number.isFinite(value[key]);
}

export function validateLeagueData(value: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return ["League data must be an object."];
  }

  for (const key of requiredTopLevelKeys) {
    if (!Array.isArray(value[key])) {
      errors.push(`${key} must be an array.`);
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  const data = value as LeagueData;
  const modelIds = new Set<string>();
  const gameIds = new Set<string>();
  const matchIds = new Set<string>();

  data.models.forEach((model, index) => {
    if (!isRecord(model)) {
      errors.push(`models[${index}] must be an object.`);
      return;
    }

    if (!hasString(model, "id")) {
      errors.push(`models[${index}].id is required.`);
    } else if (modelIds.has(model.id)) {
      errors.push(`Duplicate model id: ${model.id}.`);
    } else {
      modelIds.add(model.id);
    }

    if (!hasString(model, "name")) {
      errors.push(`models[${index}].name is required.`);
    }
  });

  data.games.forEach((game, index) => {
    if (!isRecord(game)) {
      errors.push(`games[${index}] must be an object.`);
      return;
    }

    if (!hasString(game, "id")) {
      errors.push(`games[${index}].id is required.`);
    } else if (gameIds.has(game.id)) {
      errors.push(`Duplicate game id: ${game.id}.`);
    } else {
      gameIds.add(game.id);
    }

    if (!hasString(game, "name")) {
      errors.push(`games[${index}].name is required.`);
    }
  });

  data.matches.forEach((match, index) => {
    if (!isRecord(match)) {
      errors.push(`matches[${index}] must be an object.`);
      return;
    }

    if (!hasString(match, "id")) {
      errors.push(`matches[${index}].id is required.`);
    } else if (matchIds.has(match.id)) {
      errors.push(`Duplicate match id: ${match.id}.`);
    } else {
      matchIds.add(match.id);
    }

    if (!hasString(match, "gameId") || !gameIds.has(match.gameId)) {
      errors.push(`matches[${index}].gameId references an unknown game.`);
    }

    if (!hasString(match, "modelAId") || !modelIds.has(match.modelAId)) {
      errors.push(`matches[${index}].modelAId references an unknown model.`);
    }

    if (!hasString(match, "modelBId") || !modelIds.has(match.modelBId)) {
      errors.push(`matches[${index}].modelBId references an unknown model.`);
    }

    if (
      match.winnerModelId !== null &&
      (typeof match.winnerModelId !== "string" || !modelIds.has(match.winnerModelId))
    ) {
      errors.push(`matches[${index}].winnerModelId references an unknown model.`);
    }

    if (!["model_a", "model_b", "draw"].includes(String(match.result))) {
      errors.push(`matches[${index}].result is invalid.`);
    }

    if (!hasNumber(match, "turns") || !hasNumber(match, "durationSeconds")) {
      errors.push(`matches[${index}] needs numeric turns and durationSeconds.`);
    }
  });

  data.ratingSnapshots.forEach((snapshot, index) => {
    if (!isRecord(snapshot)) {
      errors.push(`ratingSnapshots[${index}] must be an object.`);
      return;
    }

    if (!hasString(snapshot, "modelId") || !modelIds.has(snapshot.modelId)) {
      errors.push(`ratingSnapshots[${index}].modelId references an unknown model.`);
    }

    if (
      snapshot.gameId !== null &&
      (typeof snapshot.gameId !== "string" || !gameIds.has(snapshot.gameId))
    ) {
      errors.push(`ratingSnapshots[${index}].gameId references an unknown game.`);
    }

    if (
      snapshot.matchId !== null &&
      (typeof snapshot.matchId !== "string" || !matchIds.has(snapshot.matchId))
    ) {
      errors.push(`ratingSnapshots[${index}].matchId references an unknown match.`);
    }

    if (!hasNumber(snapshot, "rating") || !hasString(snapshot, "recordedAt")) {
      errors.push(`ratingSnapshots[${index}] needs rating and recordedAt.`);
    }
  });

  data.costSnapshots.forEach((snapshot, index) => {
    if (!isRecord(snapshot)) {
      errors.push(`costSnapshots[${index}] must be an object.`);
      return;
    }

    if (!hasString(snapshot, "modelId") || !modelIds.has(snapshot.modelId)) {
      errors.push(`costSnapshots[${index}].modelId references an unknown model.`);
    }

    if (!hasString(snapshot, "matchId") || !matchIds.has(snapshot.matchId)) {
      errors.push(`costSnapshots[${index}].matchId references an unknown match.`);
    }

    for (const key of [
      "inputTokens",
      "outputTokens",
      "cachedTokens",
      "requestCount",
      "elapsedSeconds",
      "estimatedCostUsd",
    ]) {
      if (!hasNumber(snapshot, key)) {
        errors.push(`costSnapshots[${index}].${key} must be numeric.`);
      }
    }
  });

  data.sponsorshipPreviews.forEach((preview, index) => {
    if (!isRecord(preview)) {
      errors.push(`sponsorshipPreviews[${index}] must be an object.`);
      return;
    }

    if (!hasString(preview, "modelId") || !modelIds.has(preview.modelId)) {
      errors.push(
        `sponsorshipPreviews[${index}].modelId references an unknown model.`,
      );
    }

    for (const key of [
      "totalFundedUsd",
      "availableBudgetUsd",
      "supporterCount",
      "platformFeeRate",
    ]) {
      if (!hasNumber(preview, key)) {
        errors.push(`sponsorshipPreviews[${index}].${key} must be numeric.`);
      }
    }

    if (!hasString(preview, "lastFundedAt")) {
      errors.push(`sponsorshipPreviews[${index}].lastFundedAt is required.`);
    }

    if (preview.status !== "preview") {
      errors.push(`sponsorshipPreviews[${index}].status is invalid.`);
    }
  });

  return errors;
}
