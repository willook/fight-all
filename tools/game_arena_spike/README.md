# Game Arena Reuse Spike

This spike keeps `google-deepmind/game_arena` out of the browser app. FightAll should reuse it, if adopted, as an offline runner that produces match records and optional turn logs. The React MVP only consumes the smaller `LeagueData` JSON contract.

The MVP game direction is Werewolf / 늑대인간 split by language. The mock export therefore writes `werewolf-en` and `werewolf-ko` LeagueData records. The tiny tic-tac-toe script remains in this spike as a dependency smoke shape for Game Arena-style legal-move adapters, not as the product's sample league.

## Dependency Pin

`game_arena` is pinned for inspection and future runner work:

```txt
git+https://github.com/google-deepmind/game_arena.git@6ddcc7dac06321472f2f22fabdeceab97eebeb73
```

The local test path uses mock models and does not require provider API keys.

## What Can Be Reused

- Game state and legal move management through the Game Arena game adapters.
- Prompt/template, parser, and soft-matching patterns for model moves.
- Sampler/rethinking runner structure for repeated model calls.
- Request, response, token, and duration logging as the source for FightAll cost snapshots.

FightAll should wrap those pieces and export `LeagueData`. It should not expose Game Arena internals directly to the frontend.

Werewolf-style social deduction will likely need a FightAll custom runner around Game Arena patterns rather than a direct browser-side adapter. The reusable surface is orchestration, prompt/parser shape, transcript logging, and result export.

## Commands

Run the mock export test:

```bash
python3 -m pytest tools/game_arena_spike
```

Write a sample export:

```bash
python3 tools/game_arena_spike/export_mock_match.py --output tools/game_arena_spike/out/mock_league_data.json
```

Optional dependency install for a deeper local spike:

```bash
python3 -m venv .venv-game-arena
. .venv-game-arena/bin/activate
python3 -m pip install -r tools/game_arena_spike/requirements.txt
```

## Contract Notes

The MVP `LeagueData` contract stores match summaries, rating snapshots, and cost snapshots. Full turn logs are intentionally omitted from the frontend contract for now. A future replay feature can add a separate `turnLogs` export keyed by `matchId` without changing the current routes.
