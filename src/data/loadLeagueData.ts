import type { LeagueData } from "../domain/types";
import { validateLeagueData } from "../domain/validation";

export async function loadLeagueData(): Promise<LeagueData> {
  const response = await fetch("/data/fightall.sample.json");

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
