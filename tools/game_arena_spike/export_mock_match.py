from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

GAME_ARENA_REPOSITORY = "https://github.com/google-deepmind/game_arena"
GAME_ARENA_COMMIT = "6ddcc7dac06321472f2f22fabdeceab97eebeb73"


def _utc_now() -> str:
    return datetime(2026, 6, 29, 0, 0, 0, tzinfo=timezone.utc).isoformat().replace(
        "+00:00",
        "Z",
    )


def _winner(board: list[str | None]) -> str | None:
    lines = (
        (0, 1, 2),
        (3, 4, 5),
        (6, 7, 8),
        (0, 3, 6),
        (1, 4, 7),
        (2, 5, 8),
        (0, 4, 8),
        (2, 4, 6),
    )

    for a, b, c in lines:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]

    return None


def run_mock_tic_tac_toe() -> dict[str, Any]:
    board: list[str | None] = [None] * 9
    scripted_moves = [
        ("mock-tactician", "X", 0),
        ("mock-counterpuncher", "O", 4),
        ("mock-tactician", "X", 1),
        ("mock-counterpuncher", "O", 3),
        ("mock-tactician", "X", 2),
    ]
    turns: list[dict[str, Any]] = []

    for turn_number, (model_id, mark, move) in enumerate(scripted_moves, start=1):
        if board[move] is not None:
            raise ValueError(f"Illegal scripted move: square {move} is occupied.")

        board[move] = mark
        turns.append(
            {
                "turn": turn_number,
                "modelId": model_id,
                "move": move,
                "mark": mark,
                "board": [cell or "" for cell in board],
            }
        )

        winner = _winner(board)
        if winner:
            return {
                "winnerMark": winner,
                "winnerModelId": model_id,
                "turns": turns,
            }

    return {
        "winnerMark": None,
        "winnerModelId": None,
        "turns": turns,
    }


def build_mock_league_data() -> dict[str, Any]:
    played_at = _utc_now()
    result = run_mock_tic_tac_toe()
    winner_model_id = result["winnerModelId"]

    if winner_model_id == "mock-tactician":
        match_result = "model_a"
    elif winner_model_id == "mock-counterpuncher":
        match_result = "model_b"
    else:
        match_result = "draw"

    return {
        "models": [
            {
                "id": "mock-tactician",
                "name": "Mock Tactician",
                "provider": "Local mock",
                "version": "game-arena-spike",
                "profile": {
                    "mbti": "INTJ",
                    "tagline": "Deterministic opening pressure.",
                    "quote": "A scripted fork is still a fork.",
                    "styleTags": ["Mock", "Tactical"],
                    "strengths": ["Legal move discipline", "Deterministic replay"],
                    "weaknesses": ["No real model reasoning"],
                },
            },
            {
                "id": "mock-counterpuncher",
                "name": "Mock Counterpuncher",
                "provider": "Local mock",
                "version": "game-arena-spike",
                "profile": {
                    "mbti": "ISTP",
                    "tagline": "Center-first defensive script.",
                    "quote": "The middle square is a reasonable hill.",
                    "styleTags": ["Mock", "Defensive"],
                    "strengths": ["Cheap execution", "Repeatability"],
                    "weaknesses": ["Falls for scripted top-row pressure"],
                },
            },
        ],
        "games": [
            {
                "id": "tic-tac-toe",
                "name": "Tic Tac Toe",
                "category": "Board",
                "description": "Tiny game used by the Game Arena reuse spike.",
            }
        ],
        "matches": [
            {
                "id": "spike-match-001",
                "playedAt": played_at,
                "gameId": "tic-tac-toe",
                "modelAId": "mock-tactician",
                "modelBId": "mock-counterpuncher",
                "winnerModelId": winner_model_id,
                "result": match_result,
                "turns": len(result["turns"]),
                "durationSeconds": 3,
                "summary": (
                    "Mock Tactician wins a deterministic tic-tac-toe script. "
                    "The turn log can be kept by the offline runner and omitted "
                    "from the MVP frontend contract."
                ),
            }
        ],
        "ratingSnapshots": [
            {
                "modelId": "mock-tactician",
                "gameId": None,
                "rating": 1500,
                "recordedAt": "2026-06-29T00:00:00Z",
                "matchId": None,
            },
            {
                "modelId": "mock-counterpuncher",
                "gameId": None,
                "rating": 1500,
                "recordedAt": "2026-06-29T00:00:00Z",
                "matchId": None,
            },
            {
                "modelId": "mock-tactician",
                "gameId": None,
                "rating": 1516,
                "recordedAt": played_at,
                "matchId": "spike-match-001",
            },
            {
                "modelId": "mock-counterpuncher",
                "gameId": None,
                "rating": 1484,
                "recordedAt": played_at,
                "matchId": "spike-match-001",
            },
        ],
        "costSnapshots": [
            {
                "matchId": "spike-match-001",
                "modelId": "mock-tactician",
                "provider": "Local mock",
                "inputTokens": 0,
                "outputTokens": 0,
                "cachedTokens": 0,
                "requestCount": 0,
                "elapsedSeconds": 1,
                "estimatedCostUsd": 0.0,
            },
            {
                "matchId": "spike-match-001",
                "modelId": "mock-counterpuncher",
                "provider": "Local mock",
                "inputTokens": 0,
                "outputTokens": 0,
                "cachedTokens": 0,
                "requestCount": 0,
                "elapsedSeconds": 2,
                "estimatedCostUsd": 0.0,
            },
        ],
    }


def write_mock_export(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(build_mock_league_data(), indent=2, sort_keys=True),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export a FightAll-compatible mock Game Arena match.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("tools/game_arena_spike/out/mock_league_data.json"),
    )
    args = parser.parse_args()
    write_mock_export(args.output)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
