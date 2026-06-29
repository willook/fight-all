import type { LeagueData } from "../domain/types";
import { validateLeagueData } from "../domain/validation";

const dataSources = [
  "/data/fightall.generated.json",
  "/data/fightall.sample.json",
] as const;

async function fetchLeagueData(path: string): Promise<LeagueData> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load league data: ${response.status}`);
  }

  const data = await response.json();
  const errors = validateLeagueData(data);

  if (errors.length > 0) {
    throw new Error(`Invalid league data: ${errors.join(", ")}`);
  }

  return data as LeagueData;
}

export async function loadLeagueData(): Promise<LeagueData> {
  const errors: string[] = [];

  for (const source of dataSources) {
    try {
      return await fetchLeagueData(source);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`Failed to load league data: ${errors.join(" | ")}`);
}
