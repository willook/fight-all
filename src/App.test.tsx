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
    expect(
      screen.getByText(/We rate AI models through a growing set of games/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/GLADI League/i)).not.toBeInTheDocument();
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

  it("renders the original A1 logo asset without topbar settings controls", () => {
    renderApp("/");

    const brand = screen.getByRole("link", { name: /^GLADI$/i });
    const logo = brand.querySelector(".gladi-logo-image");
    expect(logo).toHaveAttribute("data-mark", "a1-source");
    expect(logo).toHaveAttribute("src", expect.stringContaining("gladi-a1-logo"));
    expect(brand.querySelector(".gladi-logo")).not.toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /Theme:/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Language:/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /테마:/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /언어:/i })).not.toBeInTheDocument();
  });

  it("renders Sponsor Models with runway preview and disabled sponsorship actions", async () => {
    const data = loadGeneratedData();
    const player = data.models[0];
    renderAppWithData("/players", data);

    expect(screen.getByRole("link", { name: /Sponsor Models/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Sponsor Models/i })).toBeInTheDocument();
    expect(screen.queryByText(/AI Players/i)).not.toBeInTheDocument();
    expect(document.querySelector(".model-header .eyebrow")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Sponsor .* coming soon/i })[0]).toBeDisabled();
    expect(screen.getAllByText(/remaining budget/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/estimated matches left/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(player.name).length).toBeGreaterThan(0);
    expect(screen.getByText(player.provider)).toBeInTheDocument();
    expect(screen.queryByText(/Werewolf Debate - Korean/i)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: `Expand ${player.name}` }),
    );

    expect(screen.getAllByText(/Sponsorship runway/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Payment coming soon/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /View profile/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("article", { name: new RegExp(player.name, "i") }));

    expect(
      await screen.findByRole("heading", { name: player.name }),
    ).toBeInTheDocument();
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

  it("uses the system theme without a visible theme control", () => {
    localStorage.setItem("fightall-theme", "dark");

    renderApp("/");

    expect(document.documentElement).toHaveAttribute("data-theme", "system");
    expect(localStorage.getItem("fightall-theme")).toBeNull();
    expect(screen.queryByRole("button", { name: /Theme:/i })).not.toBeInTheDocument();
  });

  it("uses the lang query to switch UI and game display names", () => {
    localStorage.setItem("fightall-language", "en");

    renderApp("/?lang=ko");

    expect(document.documentElement.lang).toBe("ko");
    expect(
      screen.getByText(/AI 모델의 공정한 성능 평가를 위해 다양한 게임/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /모델 후원/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /리그 범위/i })).toBeInTheDocument();
    expect(screen.queryByText(/GLADI League|GLADI 리그/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /늑대인간 토론 - 영어/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /늑대인간 토론 - 한국어/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Werewolf Debate - Korean/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Claude/i).length).toBeGreaterThan(0);
    expect(localStorage.getItem("fightall-language")).toBe("ko");
    expect(screen.queryByRole("button", { name: /언어:/i })).not.toBeInTheDocument();
  });

  it("keeps the selected language when opening a sponsored model detail", async () => {
    const data = loadGeneratedData();
    const player = data.models[0];
    renderAppWithData("/players?lang=ko", data);

    expect(document.querySelector(".model-header .eyebrow")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("article", { name: player.name }));

    expect(await screen.findByRole("heading", { name: player.name })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("ko");
    expect(screen.getByText(/후원 런웨이/i)).toBeInTheDocument();
  });

  it("renders graph-first model detail and links to head-to-head", () => {
    renderApp("/models/claude-opus");

    expect(screen.getByTestId("model-rating-chart")).toBeInTheDocument();
    expect(screen.getByText(/overall record/i)).toBeInTheDocument();
    expect(screen.getByText(/Sponsorship runway/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sponsor Claude Opus coming soon/i })).toBeDisabled();
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
