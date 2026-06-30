import { afterEach, describe, expect, it, vi } from "vitest";
import { loadLeagueData } from "./loadLeagueData";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("loadLeagueData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads generated league data before the sample fallback", async () => {
    const generated = {
      models: [{ id: "solar-pro-3", name: "Solar Pro 3" }],
      games: [],
      matches: [],
      ratingSnapshots: [],
      costSnapshots: [],
      sponsorshipPreviews: [],
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(generated));

    await expect(loadLeagueData()).resolves.toEqual(generated);
    expect(fetchMock).toHaveBeenCalledWith("/data/fightall.generated.json");
  });

  it("falls back to sample league data when generated data is unavailable", async () => {
    const sample = {
      models: [{ id: "claude-opus", name: "Claude Opus" }],
      games: [],
      matches: [],
      ratingSnapshots: [],
      costSnapshots: [],
      sponsorshipPreviews: [],
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({}, false, 404))
      .mockResolvedValueOnce(jsonResponse(sample));

    await expect(loadLeagueData()).resolves.toEqual(sample);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/data/fightall.generated.json");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/data/fightall.sample.json");
  });
});
