# GLADI

GLADI is a record-first AI model arena viewer. The name comes from gladiator: models compete in language-aware leagues, and the product makes the results inspectable. The MVP does not run live model matches in the browser. It reads generated league JSON and presents model ratings, leaderboard movement, model profiles, opponent records, match summaries, and cost efficiency.

The current MVP focuses on one main game family: Werewolf / 늑대인간. It compares English and Korean sample leagues separately so the UI does not imply that an English-only ranking represents every user's real language experience.

The first implementation is intentionally split into two tracks:

- Frontend MVP: Vite React app backed by `public/data/fightall.generated.json`, with `public/data/fightall.sample.json` kept as a fallback fixture.
- Game Arena spike: Python tooling under `tools/game_arena_spike/` that proves an offline runner can export GLADI-compatible JSON.
- GLADI runner: Python tooling under `tools/fightall_runner/` that produces mock match logs, Elo snapshots, cost snapshots, and generated frontend data without provider API keys.

## Current Scope

Included:

- Dashboard leaderboard and rating trend overview.
- Game/language scope controls for `Werewolf - English` and `늑대인간 - 한국어`.
- AI Players roster for browsing models as league participants.
- Model detail with rating graph, overall record, game records, opponent records, and recent matches.
- Head-to-head detail between two models.
- Match detail with result, cost/token data, and rating changes.
- Static JSON data-source boundary via `loadLeagueData()`.
- Mock Game Arena export spike with Apache 2.0 attribution notes.
- Mock runner generated data with five candidate models, including Upstage Solar as the Korean model anchor.

Not included in this MVP:

- Live model calls.
- Backend API, PostgreSQL, import jobs, or price versioning.
- Replay UI or full turn-log viewer.
- Provider billing, API key setup, or model-access verification.

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

For the GLADI mock runner:

```bash
python3 -m unittest tools.fightall_runner.test_runner
python3 -m tools.fightall_runner.export_league \
  --output public/data/fightall.generated.json \
  --logs tools/fightall_runner/out/turn_logs.json \
  --preset default \
  --budget-cap-usd 50
```

The default runner preset creates 40 matches:

```txt
10 model pairs × 2 languages × 2 mirror matches = 40 matches
```

Use `--preset smoke` for a smaller language-balanced development run.

If `pytest` is not installed locally, create a small virtual environment or install the spike requirements:

```bash
python3 -m venv .venv-game-arena
. .venv-game-arena/bin/activate
python3 -m pip install -r tools/game_arena_spike/requirements.txt
python3 -m pytest tools/game_arena_spike
```

## Data Contract

The frontend loads `public/data/fightall.generated.json` through `src/data/loadLeagueData.ts`, falling back to `public/data/fightall.sample.json` if the generated file is unavailable. The file names still use the original `fightall` prefix for compatibility. Keep screen code away from direct JSON fetches so the data source can later move to an API without changing route components.

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
- Treat generated mock league data as a deterministic MVP artifact, not a claim about real model rankings.
- Regenerate `public/data/fightall.generated.json` after changing runner registry, scenarios, schedule, Elo, or cost logic.
- Preserve the language axis for new game data. English and Korean records should remain separable in `games`, `matches`, `ratingSnapshots`, and UI filters.
- Keep head-to-head data computed from `matches`, `ratingSnapshots`, and `costSnapshots`; do not add a separate source JSON for it.
- Keep `game_arena` out of the browser bundle. It belongs in offline runner tooling only.
- Keep real provider calls out of this MVP until billing, API keys, and model-access rights are explicitly handled.
- When adding a new visible MVP behavior, add or update a Vitest/Testing Library test first.
- Before marking a Linear phase done, run the relevant verification command and update the Linear issue state.
- When committing, prefer small units that match the work: frontend behavior, spike/tooling, docs, or QA polish.
