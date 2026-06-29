from __future__ import annotations

from itertools import combinations


def build_schedule(models: list[dict], preset: str = "default") -> list[dict]:
    pairs = list(combinations([model["id"] for model in models], 2))
    if preset == "smoke":
        pairs = pairs[:3]
    elif preset != "default":
        raise ValueError(f"Unknown preset: {preset}")

    schedule: list[dict] = []
    sequence = 1
    for left, right in pairs:
        for language_code, game_id in [("en", "werewolf-en"), ("ko", "werewolf-ko")]:
            for mirror_index, (model_a, model_b) in enumerate([(left, right), (right, left)], start=1):
                schedule.append(
                    {
                        "id": f"match-{sequence:03d}",
                        "modelAId": model_a,
                        "modelBId": model_b,
                        "gameId": game_id,
                        "languageCode": language_code,
                        "mirrorIndex": mirror_index,
                        "scenarioId": f"{language_code}-scenario-{((sequence - 1) % 4) + 1}",
                    },
                )
                sequence += 1

    return schedule

