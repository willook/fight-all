import { describe, expect, it } from "vitest";
import { validateLeagueData } from "./validation";
import sampleData from "../../public/data/fightall.sample.json";

describe("sample league data", () => {
  it("loads and validates the bundled sample JSON", () => {
    expect(validateLeagueData(sampleData)).toEqual([]);
  });
});
