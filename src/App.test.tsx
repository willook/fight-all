import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import type { LeagueData } from "./domain/types";
import sampleData from "../public/data/fightall.sample.json";

function renderApp(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App initialData={sampleData} />
    </MemoryRouter>,
  );
}

function loadGeneratedData(): LeagueData {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), "public/data/fightall.generated.json"),
      "utf8",
    ),
  ) as LeagueData;
}

function renderAppWithData(route: string, data: LeagueData) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App initialData={data} />
    </MemoryRouter>,
  );
}

describe("FightAll app", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders dashboard rows, rating chart, and navigates to model detail", async () => {
    renderApp("/");

    expect(
      screen.getByRole("heading", { name: /fightall/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/FightAll League/i)).toBeInTheDocument();
    expect(screen.queryByText(/MVP|sample|generated/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all league/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Werewolf - English/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Werewolf - Korean/i })).toBeInTheDocument();
    expect(screen.getByTestId("rating-overview-chart")).toBeInTheDocument();

    const leaderboard = screen.getByRole("table", { name: /leaderboard/i });
    expect(within(leaderboard).getAllByText(/claude/i).length).toBeGreaterThan(0);
    expect(within(leaderboard).queryByText(/mock|sample/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Werewolf - Korean/i }));
    expect(screen.getByText(/korean social deduction/i)).toBeInTheDocument();

    await userEvent.click(
      within(leaderboard).getByRole("link", { name: /claude opus/i }),
    );
    expect(
      await screen.findByRole("heading", { name: /claude opus/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("model-rating-chart")).toBeInTheDocument();
  });

  it("keeps the topbar product-focused without the Game Arena link", () => {
    renderApp("/");

    expect(screen.getByRole("link", { name: /leaderboard/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /game arena/i })).not.toBeInTheDocument();
  });

  it("renders AI Players as a compact expandable roster", async () => {
    renderAppWithData("/players", loadGeneratedData());

    expect(screen.getByRole("link", { name: /AI Players/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /AI Players/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Solar Pro 3/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Upstage/i)).toBeInTheDocument();
    expect(screen.queryByText(/Werewolf - Korean/i)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Expand Solar Pro 3/i }),
    );

    expect(screen.getAllByText(/Werewolf - English/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Werewolf - Korean/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /View profile for Solar Pro 3/i })).toHaveAttribute(
      "href",
      "/models/solar-pro-3",
    );
  });

  it("lets users hide and add models in the rating chart", async () => {
    renderAppWithData("/", loadGeneratedData());

    expect(
      screen.getByRole("button", { name: /Hide Solar Pro 3 from rating chart/i }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Hide Solar Pro 3 from rating chart/i }),
    );

    expect(
      screen.queryByRole("button", { name: /Hide Solar Pro 3 from rating chart/i }),
    ).not.toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Add model to rating chart/i }),
      "solar-pro-3",
    );

    expect(
      screen.getByRole("button", { name: /Hide Solar Pro 3 from rating chart/i }),
    ).toBeInTheDocument();
  });

  it("persists the selected theme mode", async () => {
    renderApp("/");

    expect(document.documentElement).toHaveAttribute("data-theme", "system");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: /Theme/i }), "dark");

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("fightall-theme")).toBe("dark");
  });

  it("switches the UI and game display names while preserving model data names", async () => {
    renderApp("/");

    expect(screen.getByText(/FightAll League/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Werewolf - English/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Werewolf - Korean/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /늑대인간 - 한국어/i })).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: /Language/i }), "ko");

    expect(screen.getByText(/FightAll 리그/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /리그 범위/i })).toBeInTheDocument();
    expect(screen.queryByText(/FightAll League/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /늑대인간 - 영어/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /늑대인간 - 한국어/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Werewolf - Korean/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Claude/i).length).toBeGreaterThan(0);
    expect(localStorage.getItem("fightall-language")).toBe("ko");
  });

  it("renders graph-first model detail and links to head-to-head", () => {
    renderApp("/models/claude-opus");

    expect(screen.getByTestId("model-rating-chart")).toBeInTheDocument();
    expect(screen.getByText(/overall record/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Werewolf - English/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Werewolf - Korean/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("table", { name: /opponent records/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /vs gpt-4.1/i }),
    ).toHaveAttribute("href", "/models/claude-opus/vs/gpt-41");
  });

  it("renders head-to-head detail", () => {
    renderApp("/models/claude-opus/vs/gpt-41");

    expect(
      screen.getByRole("heading", { name: /claude opus.*vs.*gpt-4.1/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/direct record/i)).toBeInTheDocument();
    expect(screen.getByText(/game breakdown/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Werewolf - English/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Werewolf - Korean/i).length).toBeGreaterThan(0);
  });

  it("renders match detail without replay UI", () => {
    renderApp("/matches/match-001");

    expect(screen.getByRole("heading", { name: /match-001/i })).toBeInTheDocument();
    expect(screen.getByText(/claude opus won/i)).toBeInTheDocument();
    expect(screen.getAllByText(/English/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/usage/i)).toBeInTheDocument();
    expect(screen.getByText(/rating changes/i)).toBeInTheDocument();
    expect(screen.getByText(/\+28/)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /replay/i })).not.toBeInTheDocument();
  });

  it("renders a clean not-found state for unknown records", () => {
    renderApp("/models/not-real");

    expect(screen.getByRole("heading", { name: /not found/i })).toBeInTheDocument();
  });
});
