import json
from pathlib import Path

from export_mock_match import build_mock_league_data


def test_mock_export_produces_league_data_without_api_keys(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    data = build_mock_league_data()

    assert {model["id"] for model in data["models"]} == {
        "mock-pressure-tester",
        "mock-context-keeper",
    }
    assert {game["id"] for game in data["games"]} == {"werewolf-en", "werewolf-ko"}
    assert {match["gameId"] for match in data["matches"]} == {
        "werewolf-en",
        "werewolf-ko",
    }
    assert {match["winnerModelId"] for match in data["matches"]}.issubset({
        "mock-pressure-tester",
        "mock-context-keeper",
        None,
    })
    assert data["ratingSnapshots"]
    assert data["costSnapshots"]
    assert {preview["modelId"] for preview in data["sponsorshipPreviews"]} == {
        "mock-pressure-tester",
        "mock-context-keeper",
    }


def test_mock_export_writes_json(tmp_path):
    from export_mock_match import write_mock_export

    output_path = tmp_path / "export.json"
    write_mock_export(output_path)

    parsed = json.loads(Path(output_path).read_text())
    assert sorted(parsed.keys()) == [
        "costSnapshots",
        "games",
        "matches",
        "models",
        "ratingSnapshots",
        "sponsorshipPreviews",
    ]
