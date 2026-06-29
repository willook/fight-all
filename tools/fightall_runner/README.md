# FightAll Runner

This runner creates deterministic MVP league data without live provider API calls.

It exports:

- `public/data/fightall.generated.json`: frontend `LeagueData`
- `tools/fightall_runner/out/turn_logs.json`: raw match logs keyed by `matchId`

## Scope

Included:

- 5 candidate models: OpenAI, Anthropic, Google, xAI, and Upstage Solar
- Werewolf English and 늑대인간 한국어 scenario schedule
- 1:1 mirror matches
- Elo snapshots for overall and per-language ratings
- Mock token, duration, and estimated cost snapshots
- Budget guard for the generated run

Excluded:

- Real API calls
- Provider billing or key setup
- Browser-side live matches
- Replay UI

## Commands

Run tests:

```bash
python3 -m unittest tools.fightall_runner.test_runner
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

## MVP Defaults

- Initial Elo: `1500`
- K-factor: `32`
- Result scores: win `1`, draw `0.5`, loss `0`
- Default match count: `40`
- Budget target: under `$50` for the equivalent real-provider run
- Upstage Solar is included as the Korean-language anchor model.
