import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
  it("renders dashboard rows, rating chart, and navigates to model detail", async () => {
    renderApp("/");

    expect(
      screen.getByRole("heading", { name: /fightall/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/sample league data/i)).toBeInTheDocument();
    expect(screen.getByTestId("rating-overview-chart")).toBeInTheDocument();

    const leaderboard = screen.getByRole("table", { name: /leaderboard/i });
    expect(within(leaderboard).getByText(/claude opus/i)).toBeInTheDocument();

    await userEvent.click(
      within(leaderboard).getByRole("link", { name: /claude opus/i }),
    );
    expect(
      await screen.findByRole("heading", { name: /claude opus/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("model-rating-chart")).toBeInTheDocument();
  });

  it("renders graph-first model detail and links to head-to-head", () => {
    renderApp("/models/claude-opus");

    expect(screen.getByTestId("model-rating-chart")).toBeInTheDocument();
    expect(screen.getByText(/overall record/i)).toBeInTheDocument();
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
  });

  it("renders match detail without replay UI", () => {
    renderApp("/matches/match-001");

    expect(screen.getByRole("heading", { name: /match-001/i })).toBeInTheDocument();
    expect(screen.getByText(/cost and tokens/i)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /replay/i })).not.toBeInTheDocument();
  });

  it("renders a clean not-found state for unknown records", () => {
    renderApp("/models/not-real");

    expect(screen.getByRole("heading", { name: /not found/i })).toBeInTheDocument();
  });
});
