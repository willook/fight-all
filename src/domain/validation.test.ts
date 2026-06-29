import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateLeagueData } from "./validation";
import sampleData from "../../public/data/fightall.sample.json";

describe("sample league data", () => {
  it("loads and validates the bundled sample JSON", () => {
    expect(validateLeagueData(sampleData)).toEqual([]);
  });

  it("loads and validates generated runner JSON with Solar and forty matches", () => {
    const generatedPath = resolve(
      process.cwd(),
      "public/data/fightall.generated.json",
    );
    const generated = JSON.parse(readFileSync(generatedPath, "utf8"));

    expect(validateLeagueData(generated)).toEqual([]);
    expect(generated.models).toHaveLength(5);
    expect(generated.models.some((model: { id: string }) => model.id === "solar-pro-3")).toBe(true);
    expect(generated.matches).toHaveLength(40);
    expect(generated.costSnapshots).toHaveLength(80);
    expect(
      generated.ratingSnapshots.some(
        (snapshot: { rating: number }) => snapshot.rating !== 1500,
      ),
    ).toBe(true);
  });
});
