from __future__ import annotations

from typing import Any


def normalize_judgement(
    raw: dict[str, Any],
    model_a_id: str,
    model_b_id: str,
    min_confidence: float = 0.55,
) -> dict[str, str | float | None]:
    confidence = float(raw.get("confidence", 0))
    winner_id = raw.get("winnerModelId")

    if confidence < min_confidence:
        return {
            "winnerModelId": None,
            "result": "draw",
            "scoreA": 0.5,
            "reason": "low_confidence",
        }

    if winner_id is None:
        return {
            "winnerModelId": None,
            "result": "draw",
            "scoreA": 0.5,
            "reason": "judge_draw",
        }

    if winner_id == model_a_id:
        return {
            "winnerModelId": model_a_id,
            "result": "model_a",
            "scoreA": 1.0,
            "reason": "judge_win",
        }

    if winner_id == model_b_id:
        return {
            "winnerModelId": model_b_id,
            "result": "model_b",
            "scoreA": 0.0,
            "reason": "judge_win",
        }

    return {
        "winnerModelId": model_b_id,
        "result": "model_b",
        "scoreA": 0.0,
        "reason": "format_loss",
    }
