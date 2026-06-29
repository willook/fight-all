import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import sampleData from "../public/data/fightall.sample.json";

function renderApp(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App initialData={sampleData} />
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
    expect(screen.getByText(/sample league data/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all league/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Werewolf - English/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /늑대인간 - 한국어/i })).toBeInTheDocument();
    expect(screen.getByTestId("rating-overview-chart")).toBeInTheDocument();

    const leaderboard = screen.getByRole("table", { name: /leaderboard/i });
    expect(within(leaderboard).getByText(/claude opus/i)).toBeInTheDocument();
    expect(within(leaderboard).getAllByText(/2026-sample/i)[0]).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /늑대인간 - 한국어/i }));
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

  it("persists the selected theme mode", async () => {
    renderApp("/");

    expect(document.documentElement).toHaveAttribute("data-theme", "system");

    await userEvent.click(screen.getByRole("button", { name: /theme: dark/i }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("fightall-theme")).toBe("dark");
  });

  it("switches the UI between English and Korean while preserving data names", async () => {
    renderApp("/");

    expect(screen.getByText(/Sample league data/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /한국어로 보기/i }));

    expect(screen.getByText(/샘플 리그 데이터/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /리그 범위/i })).toBeInTheDocument();
    expect(screen.queryByText(/Sample league data/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Werewolf - English/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /늑대인간 - 한국어/i })).toBeInTheDocument();
    expect(localStorage.getItem("fightall-language")).toBe("ko");
  });

  it("renders graph-first model detail and links to head-to-head", () => {
    renderApp("/models/claude-opus");

    expect(screen.getByTestId("model-rating-chart")).toBeInTheDocument();
    expect(screen.getByText(/overall record/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Werewolf - English/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/늑대인간 - 한국어/i).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/늑대인간 - 한국어/i).length).toBeGreaterThan(0);
  });

  it("renders match detail without replay UI", () => {
    renderApp("/matches/match-001");

    expect(screen.getByRole("heading", { name: /match-001/i })).toBeInTheDocument();
    expect(screen.getByText(/claude opus won/i)).toBeInTheDocument();
    expect(screen.getAllByText(/English/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/cost and tokens/i)).toBeInTheDocument();
    expect(screen.getByText(/rating changes/i)).toBeInTheDocument();
    expect(screen.getByText(/\+28/)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /replay/i })).not.toBeInTheDocument();
  });

  it("renders a clean not-found state for unknown records", () => {
    renderApp("/models/not-real");

    expect(screen.getByRole("heading", { name: /not found/i })).toBeInTheDocument();
  });
});
