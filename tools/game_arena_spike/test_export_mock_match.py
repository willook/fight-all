import json
from pathlib import Path

from export_mock_match import build_mock_league_data


def test_mock_export_produces_league_data_without_api_keys(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    data = build_mock_league_data()

    assert {model["id"] for model in data["models"]} == {
        "mock-tactician",
        "mock-counterpuncher",
    }
    assert data["matches"][0]["winnerModelId"] in {
        "mock-tactician",
        "mock-counterpuncher",
        None,
    }
    assert data["ratingSnapshots"]
    assert data["costSnapshots"]


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
    ]
