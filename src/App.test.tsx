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

describe("GLADI app", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders dashboard rows, rating chart, and navigates to model detail", async () => {
    renderApp("/");

    expect(
      screen.getByRole("heading", { name: /gladi/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/GLADI League/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^GLADI$/i })).toBeInTheDocument();
    expect(screen.queryByText(/MVP|sample|generated/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all league/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Werewolf Debate - English/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Werewolf Debate - Korean/i })).toBeInTheDocument();
    expect(screen.getByTestId("rating-overview-chart")).toBeInTheDocument();

    const leaderboard = screen.getByRole("table", { name: /leaderboard/i });
    expect(within(leaderboard).getAllByText(/claude/i).length).toBeGreaterThan(0);
    expect(within(leaderboard).queryByText(/mock|sample/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Werewolf Debate - Korean/i }));
    expect(screen.getByText(/Korean 1:1 Werewolf debate/i)).toBeInTheDocument();

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

  it("renders the original A1 logo asset and aligned settings controls", () => {
    renderApp("/");

    const brand = screen.getByRole("link", { name: /^GLADI$/i });
    const logo = brand.querySelector(".gladi-logo-image");
    expect(logo).toHaveAttribute("data-mark", "a1-source");
    expect(logo).toHaveAttribute("src", expect.stringContaining("gladi-a1-logo"));
    expect(brand.querySelector(".gladi-logo")).not.toBeInTheDocument();

    const themeButton = screen.getByRole("button", { name: /Theme: System/i });
    expect(within(themeButton).getByText("Theme")).toHaveClass(
      "settings-menu-label",
    );
    expect(within(themeButton).getByText("System")).toHaveClass(
      "settings-menu-value",
    );
    expect(themeButton.querySelector(".settings-menu-chevron")).toBeInTheDocument();
  });

  it("renders AI Players as a compact expandable roster", async () => {
    const data = loadGeneratedData();
    const player = data.models[0];
    renderAppWithData("/players", data);

    expect(screen.getByRole("link", { name: /AI Players/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /AI Players/i })).toBeInTheDocument();
    expect(screen.getAllByText(player.name).length).toBeGreaterThan(0);
    expect(screen.getByText(player.provider)).toBeInTheDocument();
    expect(screen.queryByText(/Werewolf Debate - Korean/i)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: `Expand ${player.name}` }),
    );

    expect(screen.getAllByText(/Werewolf Debate - English/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Werewolf Debate - Korean/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: `View profile for ${player.name}` })).toHaveAttribute(
      "href",
      `/models/${player.id}`,
    );
  });

  it("lets users hide and add models in the rating chart", async () => {
    const data = loadGeneratedData();
    const player = data.models[0];
    renderAppWithData("/", data);

    expect(
      screen.getByRole("button", { name: `Hide ${player.name} from rating chart` }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: `Hide ${player.name} from rating chart` }),
    );

    expect(
      screen.queryByRole("button", { name: `Hide ${player.name} from rating chart` }),
    ).not.toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Add model to rating chart/i }),
      player.id,
    );

    expect(
      screen.getByRole("button", { name: `Hide ${player.name} from rating chart` }),
    ).toBeInTheDocument();
  });

  it("persists the selected theme mode", async () => {
    renderApp("/");

    expect(document.documentElement).toHaveAttribute("data-theme", "system");

    await userEvent.click(
      screen.getByRole("button", { name: /Theme: System/i }),
    );
    await userEvent.click(screen.getByRole("menuitemradio", { name: /Dark/i }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("fightall-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: /Theme: Dark/i })).toHaveClass(
      "settings-menu-button",
    );
  });

  it("switches the UI and game display names while preserving model data names", async () => {
    renderApp("/");

    expect(screen.getByText(/GLADI League/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Werewolf Debate - English/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Werewolf Debate - Korean/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /늑대인간 토론 - 한국어/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Language: EN/i }));
    await userEvent.click(
      screen.getByRole("menuitemradio", { name: /한국어/i }),
    );

    expect(screen.getByText(/GLADI 리그/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /리그 범위/i })).toBeInTheDocument();
    expect(screen.queryByText(/GLADI League/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /늑대인간 토론 - 영어/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /늑대인간 토론 - 한국어/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Werewolf Debate - Korean/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Claude/i).length).toBeGreaterThan(0);
    expect(localStorage.getItem("fightall-language")).toBe("ko");
    expect(screen.getByRole("button", { name: /언어: KO/i })).toHaveClass(
      "settings-menu-button",
    );
  });

  it("renders graph-first model detail and links to head-to-head", () => {
    renderApp("/models/claude-opus");

    expect(screen.getByTestId("model-rating-chart")).toBeInTheDocument();
    expect(screen.getByText(/overall record/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Werewolf Debate - English/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Werewolf Debate - Korean/i).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/Werewolf Debate - English/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Werewolf Debate - Korean/i).length).toBeGreaterThan(0);
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
