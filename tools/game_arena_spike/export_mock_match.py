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


def run_mock_werewolf(language_code: str) -> dict[str, Any]:
    if language_code == "ko":
        return {
            "winnerModelId": "mock-context-keeper",
            "turns": [
                "사회자가 한국어로 밤 행동 결과를 요약한다.",
                "Mock Context Keeper가 앞선 발언의 모순을 짚고 투표 흐름을 정리한다.",
                "Mock Pressure Tester가 강한 의심을 만들지만 역할 단서가 흔들린다.",
                "마을 투표가 Mock Context Keeper의 추론을 따라간다.",
            ],
            "summary": (
                "Mock Context Keeper wins the Korean Werewolf transcript by "
                "tracking overlapping suspicion threads and stabilizing the vote."
            ),
        }

    return {
        "winnerModelId": "mock-pressure-tester",
        "turns": [
            "The host summarizes a quiet night phase in English.",
            "Mock Pressure Tester pushes an early contradiction around role timing.",
            "Mock Context Keeper defends with a cautious village-read.",
            "The final vote follows Mock Pressure Tester's accusation line.",
        ],
        "summary": (
            "Mock Pressure Tester wins the English Werewolf transcript by forcing "
            "a concise contradiction into the final village vote."
        ),
    }


def build_mock_league_data() -> dict[str, Any]:
    played_at = _utc_now()
    run_mock_tic_tac_toe()
    english_result = run_mock_werewolf("en")
    korean_result = run_mock_werewolf("ko")

    return {
        "models": [
            {
                "id": "mock-pressure-tester",
                "name": "Mock Pressure Tester",
                "provider": "Local mock",
                "version": "game-arena-spike",
                "profile": {
                    "mbti": "ENTP",
                    "tagline": "Applies accusation pressure early.",
                    "quote": "A vague alibi is still a useful opening.",
                    "styleTags": ["Mock", "Pressure"],
                    "strengths": ["Repeatable transcripts", "Accusation timing"],
                    "weaknesses": ["No real model reasoning"],
                },
            },
            {
                "id": "mock-context-keeper",
                "name": "Mock Context Keeper",
                "provider": "Local mock",
                "version": "game-arena-spike",
                "profile": {
                    "mbti": "INFJ",
                    "tagline": "Tracks suspicion threads across rounds.",
                    "quote": "The vote remembers what the room forgets.",
                    "styleTags": ["Mock", "Context"],
                    "strengths": ["Cheap execution", "Language-specific summaries"],
                    "weaknesses": ["No live persuasion"],
                },
            },
        ],
        "games": [
            {
                "id": "werewolf-en",
                "name": "Werewolf - English",
                "category": "Social deduction",
                "description": "English mock transcript for offline runner export.",
                "baseGameId": "werewolf",
                "languageCode": "en",
                "languageName": "English",
            },
            {
                "id": "werewolf-ko",
                "name": "늑대인간 - 한국어",
                "category": "Social deduction",
                "description": "Korean mock transcript for offline runner export.",
                "baseGameId": "werewolf",
                "languageCode": "ko",
                "languageName": "한국어",
            }
        ],
        "matches": [
            {
                "id": "spike-match-001",
                "playedAt": played_at,
                "gameId": "werewolf-en",
                "modelAId": "mock-pressure-tester",
                "modelBId": "mock-context-keeper",
                "winnerModelId": english_result["winnerModelId"],
                "result": "model_a",
                "turns": len(english_result["turns"]),
                "durationSeconds": 24,
                "summary": english_result["summary"],
            },
            {
                "id": "spike-match-002",
                "playedAt": played_at,
                "gameId": "werewolf-ko",
                "modelAId": "mock-pressure-tester",
                "modelBId": "mock-context-keeper",
                "winnerModelId": korean_result["winnerModelId"],
                "result": "model_b",
                "turns": len(korean_result["turns"]),
                "durationSeconds": 31,
                "summary": korean_result["summary"],
            },
        ],
        "ratingSnapshots": [
            {
                "modelId": "mock-pressure-tester",
                "gameId": None,
                "rating": 1500,
                "recordedAt": "2026-06-29T00:00:00Z",
                "matchId": None,
            },
            {
                "modelId": "mock-context-keeper",
                "gameId": None,
                "rating": 1500,
                "recordedAt": "2026-06-29T00:00:00Z",
                "matchId": None,
            },
            {
                "modelId": "mock-pressure-tester",
                "gameId": "werewolf-en",
                "rating": 1516,
                "recordedAt": played_at,
                "matchId": "spike-match-001",
            },
            {
                "modelId": "mock-context-keeper",
                "gameId": "werewolf-en",
                "rating": 1484,
                "recordedAt": played_at,
                "matchId": "spike-match-001",
            },
            {
                "modelId": "mock-pressure-tester",
                "gameId": "werewolf-ko",
                "rating": 1488,
                "recordedAt": played_at,
                "matchId": "spike-match-002",
            },
            {
                "modelId": "mock-context-keeper",
                "gameId": "werewolf-ko",
                "rating": 1512,
                "recordedAt": played_at,
                "matchId": "spike-match-002",
            },
        ],
        "costSnapshots": [
            {
                "matchId": "spike-match-001",
                "modelId": "mock-pressure-tester",
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
                "modelId": "mock-context-keeper",
                "provider": "Local mock",
                "inputTokens": 0,
                "outputTokens": 0,
                "cachedTokens": 0,
                "requestCount": 0,
                "elapsedSeconds": 2,
                "estimatedCostUsd": 0.0,
            },
            {
                "matchId": "spike-match-002",
                "modelId": "mock-pressure-tester",
                "provider": "Local mock",
                "inputTokens": 0,
                "outputTokens": 0,
                "cachedTokens": 0,
                "requestCount": 0,
                "elapsedSeconds": 2,
                "estimatedCostUsd": 0.0,
            },
            {
                "matchId": "spike-match-002",
                "modelId": "mock-context-keeper",
                "provider": "Local mock",
                "inputTokens": 0,
                "outputTokens": 0,
                "cachedTokens": 0,
                "requestCount": 0,
                "elapsedSeconds": 3,
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
