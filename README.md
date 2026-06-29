# FightAll

FightAll is a record-first AI model arena viewer. The MVP does not run live model matches in the browser. It reads static league JSON and presents model ratings, leaderboard movement, model profiles, opponent records, match summaries, and cost efficiency.

The current MVP focuses on one main game family: Werewolf / 늑대인간. It compares English and Korean sample leagues separately so the UI does not imply that an English-only ranking represents every user's real language experience.

The first implementation is intentionally split into two tracks:

- Frontend MVP: Vite React app backed by `public/data/fightall.sample.json`.
- Game Arena spike: Python tooling under `tools/game_arena_spike/` that proves an offline runner can export FightAll-compatible JSON.

## Current Scope

Included:

- Dashboard leaderboard and rating trend overview.
- Game/language scope controls for `Werewolf - English` and `늑대인간 - 한국어`.
- Model detail with rating graph, overall record, game records, opponent records, and recent matches.
- Head-to-head detail between two models.
- Match detail with result, cost/token data, and rating changes.
- Static JSON data-source boundary via `loadLeagueData()`.
- Mock Game Arena export spike with Apache 2.0 attribution notes.

Not included in this MVP:

- Live model calls.
- Backend API, PostgreSQL, import jobs, or price versioning.
- Replay UI or full turn-log viewer.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

## Verification

```bash
npm run test
npm run build
```

For the Game Arena spike:

```bash
python3 -m pytest tools/game_arena_spike
```

If `pytest` is not installed locally, create a small virtual environment or install the spike requirements:

```bash
python3 -m venv .venv-game-arena
. .venv-game-arena/bin/activate
python3 -m pip install -r tools/game_arena_spike/requirements.txt
python3 -m pytest tools/game_arena_spike
```

## Data Contract

The frontend loads `public/data/fightall.sample.json` through `src/data/loadLeagueData.ts`. Keep screen code away from direct JSON fetches so the data source can later move to an API without changing route components.

Core derived data lives in `src/domain/selectors.ts`:

- leaderboard and rating deltas
- recent form
- model detail
- head-to-head stats
- match detail
- model cost summaries

Runtime data validation lives in `src/domain/validation.ts`.

## Operating Notes

- Treat bundled league data as sample data, not a claim about real model rankings.
- Preserve the language axis for new game data. English and Korean records should remain separable in `games`, `matches`, `ratingSnapshots`, and UI filters.
- Keep head-to-head data computed from `matches`, `ratingSnapshots`, and `costSnapshots`; do not add a separate source JSON for it.
- Keep `game_arena` out of the browser bundle. It belongs in offline runner tooling only.
- When adding a new visible MVP behavior, add or update a Vitest/Testing Library test first.
- Before marking a Linear phase done, run the relevant verification command and update the Linear issue state.
- When committing, prefer small units that match the work: frontend behavior, spike/tooling, docs, or QA polish.
