from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from .judging import normalize_judgement
from .registry import candidate_models, games, judge_models, public_models
from .schedule import build_schedule

INITIAL_RATING = 1500
K_FACTOR = 32
DEFAULT_BUDGET_USD = 50.0


def _expected_score(rating_a: float, rating_b: float) -> float:
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))


def _apply_elo(ratings: dict[str, float], model_a_id: str, model_b_id: str, score_a: float) -> None:
    rating_a = ratings[model_a_id]
    rating_b = ratings[model_b_id]
    expected_a = _expected_score(rating_a, rating_b)
    expected_b = _expected_score(rating_b, rating_a)
    ratings[model_a_id] = rating_a + K_FACTOR * (score_a - expected_a)
    ratings[model_b_id] = rating_b + K_FACTOR * ((1 - score_a) - expected_b)


def _score(schedule_item: dict, model_index: dict[str, dict]) -> dict[str, str | float | None]:
    model_a = model_index[schedule_item["modelAId"]]
    model_b = model_index[schedule_item["modelBId"]]
    language = schedule_item["languageCode"]
    role_bonus = 1.5 if schedule_item["mirrorIndex"] == 1 else -1.5
    scenario_bias = ((sum(ord(ch) for ch in schedule_item["scenarioId"]) % 7) - 3) * 0.7
    strength_a = model_a["mockStrength"][language] + role_bonus + scenario_bias
    strength_b = model_b["mockStrength"][language] - role_bonus - scenario_bias
    diff = strength_a - strength_b

    if abs(diff) < 1.25:
        raw_judgement = {"winnerModelId": None, "confidence": 0.52}
    elif diff > 0:
        raw_judgement = {"winnerModelId": model_a["id"], "confidence": 0.74}
    else:
        raw_judgement = {"winnerModelId": model_b["id"], "confidence": 0.74}

    return normalize_judgement(
        raw_judgement,
        model_a_id=model_a["id"],
        model_b_id=model_b["id"],
    )


def _usage(model: dict, language_code: str, turns: int, mirror_index: int) -> dict[str, int | float]:
    language_multiplier = 1.18 if language_code == "ko" else 1.0
    provider_weight = (sum(ord(ch) for ch in model["provider"]) % 5) + 1
    input_tokens = int((900 + turns * 48 + provider_weight * 17) * language_multiplier)
    output_tokens = int((420 + turns * 34 + mirror_index * 21) * language_multiplier)
    cached_tokens = int(input_tokens * 0.12)
    elapsed_seconds = round(8 + turns * 1.6 + provider_weight * 0.7, 1)
    pricing = model["pricing"]
    estimated_cost = (
        input_tokens / 1_000_000 * pricing["inputPerMillion"]
        + output_tokens / 1_000_000 * pricing["outputPerMillion"]
    )

    return {
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "cachedTokens": cached_tokens,
        "requestCount": max(2, turns // 4),
        "elapsedSeconds": elapsed_seconds,
        "estimatedCostUsd": round(estimated_cost, 6),
    }


def _turn_log(schedule_item: dict, winner_id: str | None, model_index: dict[str, dict]) -> list[dict[str, Any]]:
    model_a = model_index[schedule_item["modelAId"]]
    model_b = model_index[schedule_item["modelBId"]]
    language = "Korean" if schedule_item["languageCode"] == "ko" else "English"
    return [
        {
            "speaker": model_a["id"],
            "kind": "argument",
            "text": f"{model_a['name']} opens the {language} scenario with a role-read argument.",
        },
        {
            "speaker": model_b["id"],
            "kind": "counter",
            "text": f"{model_b['name']} challenges the vote logic and reframes suspicion.",
        },
        {
            "speaker": "judge-gemini-flash-lite",
            "kind": "judgement",
            "winnerModelId": winner_id,
            "confidence": 0.74 if winner_id else 0.52,
        },
    ]


def _match_summary(schedule_item: dict, winner_id: str | None, model_index: dict[str, dict]) -> str:
    model_a = model_index[schedule_item["modelAId"]]
    model_b = model_index[schedule_item["modelBId"]]
    language = "Korean" if schedule_item["languageCode"] == "ko" else "English"
    if winner_id is None:
        return f"{model_a['name']} and {model_b['name']} split the {language} Werewolf debate evaluation after balanced suspicion reads."
    winner = model_index[winner_id]
    return f"{winner['name']} won the {language} Werewolf debate evaluation with clearer vote pressure and role inference."


def export_league(
    output_path: Path,
    logs_path: Path,
    preset: str = "default",
    budget_cap_usd: float = DEFAULT_BUDGET_USD,
) -> dict:
    models = candidate_models()
    model_index = {model["id"]: model for model in models}
    schedule = build_schedule(models, preset=preset)
    ratings_all = {model["id"]: float(INITIAL_RATING) for model in models}
    ratings_by_game = {
        game["id"]: {model["id"]: float(INITIAL_RATING) for model in models}
        for game in games()
    }
    matches: list[dict] = []
    rating_snapshots: list[dict] = []
    cost_snapshots: list[dict] = []
    turn_logs: dict[str, list[dict]] = {}
    played_at = datetime(2026, 6, 1, 9, 0, tzinfo=timezone.utc)

    for index, item in enumerate(schedule):
        judgement = _score(item, model_index)
        winner_id = judgement["winnerModelId"]
        result = judgement["result"]
        score_a = float(judgement["scoreA"])
        turns = 8 + (index % 7) * 2 + (4 if item["languageCode"] == "ko" else 0)
        duration = int(54 + turns * 8 + (index % 5) * 7)
        timestamp = played_at + timedelta(minutes=index * 45)
        match = {
            "id": item["id"],
            "playedAt": timestamp.isoformat().replace("+00:00", "Z"),
            "gameId": item["gameId"],
            "modelAId": item["modelAId"],
            "modelBId": item["modelBId"],
            "winnerModelId": winner_id,
            "result": result,
            "turns": turns,
            "durationSeconds": duration,
            "summary": _match_summary(item, winner_id, model_index),
        }
        matches.append(match)
        turn_logs[match["id"]] = _turn_log(item, winner_id, model_index)

        _apply_elo(ratings_all, item["modelAId"], item["modelBId"], score_a)
        _apply_elo(ratings_by_game[item["gameId"]], item["modelAId"], item["modelBId"], score_a)

        for rating_scope, game_id in [(ratings_all, None), (ratings_by_game[item["gameId"]], item["gameId"])]:
            for model_id in [item["modelAId"], item["modelBId"]]:
                rating_snapshots.append(
                    {
                        "modelId": model_id,
                        "gameId": game_id,
                        "rating": round(rating_scope[model_id]),
                        "recordedAt": match["playedAt"],
                        "matchId": match["id"],
                    },
                )

        for model_id in [item["modelAId"], item["modelBId"]]:
            model = model_index[model_id]
            usage = _usage(model, item["languageCode"], turns, item["mirrorIndex"])
            cost_snapshots.append(
                {
                    "matchId": match["id"],
                    "modelId": model_id,
                    "provider": model["provider"],
                    **usage,
                },
            )

    total_cost = sum(cost["estimatedCostUsd"] for cost in cost_snapshots)
    if total_cost > budget_cap_usd:
        raise RuntimeError(
            f"Estimated mock league cost ${total_cost:.2f} exceeds budget cap ${budget_cap_usd:.2f}.",
        )

    data = {
        "models": public_models(),
        "games": games(),
        "matches": matches,
        "ratingSnapshots": rating_snapshots,
        "costSnapshots": cost_snapshots,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    logs_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    logs_path.write_text(json.dumps(turn_logs, ensure_ascii=False, indent=2) + "\n")
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="Export generated FightAll MVP league data.")
    parser.add_argument("--output", type=Path, default=Path("public/data/fightall.generated.json"))
    parser.add_argument("--logs", type=Path, default=Path("tools/fightall_runner/out/turn_logs.json"))
    parser.add_argument("--preset", choices=["default", "smoke"], default="default")
    parser.add_argument("--budget-cap-usd", type=float, default=DEFAULT_BUDGET_USD)
    args = parser.parse_args()

    export_league(
        output_path=args.output,
        logs_path=args.logs,
        preset=args.preset,
        budget_cap_usd=args.budget_cap_usd,
    )


if __name__ == "__main__":
    main()
