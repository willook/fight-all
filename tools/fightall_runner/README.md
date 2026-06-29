# GLADI Runner

This runner creates GLADI MVP league data. It supports both deterministic mock data and a small real OpenAI/Gemini/Upstage API PoC.

It exports:

- `public/data/fightall.generated.json`: frontend `LeagueData`
- `tools/fightall_runner/out/turn_logs.json`: raw match logs keyed by `matchId`
- `tools/fightall_runner/out/real_poc_turn_logs.json`: raw real PoC logs keyed by `matchId`

## Scope

Included:

- 5 candidate models: OpenAI, Anthropic, Google, xAI, and Upstage Solar
- Werewolf Debate English and 늑대인간 토론 한국어 schedule
- 1:1 mirror matches
- Elo snapshots for overall and per-language ratings
- Mock token, duration, and estimated cost snapshots
- Real OpenAI/Gemini/Upstage 12-match PoC with usage-based cost snapshots
- Budget guard for the generated run

Excluded:

- Production-scale API runs
- Provider billing administration or key management
- Browser-side live matches
- Replay UI

## Commands

Run tests:

```bash
python3 -m unittest tools.fightall_runner.test_runner tools.fightall_runner.test_real_poc
```

Generate the default 40-match league:

```bash
python3 -m tools.fightall_runner.export_league \
  --output public/data/fightall.generated.json \
  --logs tools/fightall_runner/out/turn_logs.json \
  --preset default \
  --budget-cap-usd 50
```

Generate a smaller smoke run:

```bash
python3 -m tools.fightall_runner.export_league \
  --output /tmp/fightall.generated.smoke.json \
  --logs /tmp/fightall.turn_logs.smoke.json \
  --preset smoke
```

Check real API access:

```bash
cp .env.example .env.local
# Add OPENAI_API_KEY, GEMINI_API_KEY, and UPSTAGE_API_KEY to .env.local.
python3 -m tools.fightall_runner.real_poc --doctor
```

Generate the base real 4-match OpenAI vs Gemini PoC league:

```bash
python3 -m tools.fightall_runner.real_poc \
  --output public/data/fightall.generated.json \
  --logs tools/fightall_runner/out/real_poc_turn_logs.json \
  --budget-cap-usd 2
```

Append Upstage Solar Mini as 8 additional matches:

```bash
python3 -m tools.fightall_runner.real_poc \
  --append-upstage \
  --output public/data/fightall.generated.json \
  --logs tools/fightall_runner/out/real_poc_turn_logs.json \
  --budget-cap-usd 2
```

## MVP Defaults

- Initial Elo: `1500`
- K-factor: `32`
- Result scores: win `1`, draw `0.5`, loss `0`
- Default match count: `40`
- Budget target: under `$50` for the equivalent real-provider run
- Upstage Solar is included as the Korean-language anchor model in mock data and as Solar Mini in the real PoC append step.
- Real PoC match count: `4` base matches, `12` after Upstage append
- Real PoC budget cap: `$2`
- Real PoC cost snapshots allocate each player's own call cost plus 50% of the judge call cost.
