import json
import tempfile
import unittest
from pathlib import Path

from tools.fightall_runner.export_league import export_league
from tools.fightall_runner.judging import normalize_judgement
from tools.fightall_runner.registry import candidate_models, judge_models
from tools.fightall_runner.schedule import build_schedule


class FightAllRunnerTest(unittest.TestCase):
    def test_registry_includes_solar_and_excludes_judges_from_candidates(self):
        candidates = candidate_models()
        judges = judge_models()

        self.assertEqual(len(candidates), 5)
        self.assertTrue(any(model["id"] == "solar-pro-3" for model in candidates))
        self.assertTrue(
            all(model["id"] != judge["id"] for model in candidates for judge in judges),
        )
        self.assertTrue(
            all({"en", "ko"}.issubset(set(model["leagueLanguages"])) for model in candidates),
        )

    def test_default_schedule_creates_forty_mirror_matches(self):
        schedule = build_schedule(candidate_models(), preset="default")

        self.assertEqual(len(schedule), 40)
        self.assertEqual({item["languageCode"] for item in schedule}, {"en", "ko"})
        self.assertTrue(all(item["modelAId"] != item["modelBId"] for item in schedule))

    def test_smoke_schedule_is_small_but_language_balanced(self):
        schedule = build_schedule(candidate_models(), preset="smoke")

        self.assertGreaterEqual(len(schedule), 8)
        self.assertLessEqual(len(schedule), 12)
        self.assertEqual({item["languageCode"] for item in schedule}, {"en", "ko"})

    def test_export_league_writes_valid_generated_data_and_turn_logs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "fightall.generated.json"
            logs_path = Path(temp_dir) / "turn_logs.json"

            data = export_league(output_path=output_path, logs_path=logs_path, preset="default")

            self.assertTrue(output_path.exists())
            self.assertTrue(logs_path.exists())
            self.assertEqual(len(data["models"]), 5)
            self.assertEqual(len(data["matches"]), 40)
            self.assertEqual(len(data["costSnapshots"]), 80)
            self.assertGreater(
                len([snapshot for snapshot in data["ratingSnapshots"] if snapshot["gameId"] is None]),
                5,
            )
            self.assertTrue(any(model["id"] == "solar-pro-3" for model in data["models"]))
            self.assertTrue(
                any(snapshot["rating"] != 1500 for snapshot in data["ratingSnapshots"]),
            )
            self.assertEqual(len(data["sponsorshipPreviews"]), len(data["models"]))
            self.assertEqual(
                {preview["modelId"] for preview in data["sponsorshipPreviews"]},
                {model["id"] for model in data["models"]},
            )

            persisted = json.loads(output_path.read_text())
            logs = json.loads(logs_path.read_text())
            self.assertEqual(persisted, data)
            self.assertEqual(set(logs.keys()), {match["id"] for match in data["matches"]})

    def test_judgement_normalization_handles_low_confidence_and_invalid_responses(self):
        self.assertEqual(
            normalize_judgement(
                {"winnerModelId": "gpt-41", "confidence": 0.4},
                model_a_id="gpt-41",
                model_b_id="solar-pro-3",
            ),
            {"winnerModelId": None, "result": "draw", "scoreA": 0.5, "reason": "low_confidence"},
        )
        self.assertEqual(
            normalize_judgement(
                {"winnerModelId": "not-a-player", "confidence": 0.9},
                model_a_id="gpt-41",
                model_b_id="solar-pro-3",
            ),
            {"winnerModelId": "solar-pro-3", "result": "model_b", "scoreA": 0.0, "reason": "format_loss"},
        )


if __name__ == "__main__":
    unittest.main()
