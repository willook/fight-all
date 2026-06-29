import tempfile
import unittest
from pathlib import Path

from tools.fightall_runner.real_poc import (
    GeminiProvider,
    ModelCallResult,
    RealPocProvider,
    export_real_poc,
)


class ScriptedProvider(RealPocProvider):
    def __init__(self, model_id, responses):
        self.model_id = model_id
        self._responses = list(responses)

    def generate(self, prompt, max_output_tokens=512):
        if not self._responses:
            raise AssertionError(f"No scripted response left for {self.model_id}")
        return self._responses.pop(0)


def call(text, input_tokens=100, output_tokens=50, cost=0.00005):
    return ModelCallResult(
        text=text,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cached_tokens=0,
        elapsed_seconds=0.2,
        estimated_cost_usd=cost,
        raw={"text": text},
    )


class RealPocRunnerTest(unittest.TestCase):
    def test_gemini_provider_retries_transient_high_demand_errors(self):
        class FlakyHttpClient:
            def __init__(self):
                self.calls = 0

            def post_json(self, url, payload, headers, timeout_seconds=60):
                self.calls += 1
                if self.calls < 5:
                    return (
                        503,
                        {"error": {"message": "This model is currently experiencing high demand."}},
                        0.1,
                    )
                return (
                    200,
                    {
                        "candidates": [{"content": {"parts": [{"text": "ok"}]}}],
                        "usageMetadata": {
                            "promptTokenCount": 5,
                            "candidatesTokenCount": 1,
                        },
                    },
                    0.1,
                )

        http_client = FlakyHttpClient()
        provider = GeminiProvider("fake-key", http_client=http_client, retry_delay_seconds=0)

        result = provider.generate("ping", max_output_tokens=8)

        self.assertEqual(result.text, "ok")
        self.assertEqual(http_client.calls, 5)

    def test_export_real_poc_creates_four_matches_with_allocated_judge_costs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "fightall.generated.json"
            logs_path = Path(temp_dir) / "real_poc_turn_logs.json"
            openai = ScriptedProvider(
                "gpt-4.1-nano",
                [
                    call('{"claim":"OpenAI English A"}'),
                    call('{"claim":"OpenAI English B"}'),
                    call('{"claim":"OpenAI Korean A"}'),
                    call('{"claim":"OpenAI Korean B"}'),
                ],
            )
            gemini = ScriptedProvider(
                "gemini-2.5-flash-lite",
                [
                    call('{"claim":"Gemini English A"}', cost=0.00004),
                    call('{"claim":"Gemini English B"}', cost=0.00004),
                    call('{"claim":"Gemini Korean A"}', cost=0.00004),
                    call('{"claim":"Gemini Korean B"}', cost=0.00004),
                ],
            )
            judge = ScriptedProvider(
                "gemini-2.5-flash-lite",
                [
                    call('{"winner":"A","confidence":0.8,"reason":"Clearer vote pressure."}', cost=0.00002),
                    call('{"winner":"B","confidence":0.8,"reason":"Better rebuttal."}', cost=0.00002),
                    call('{"winner":"draw","confidence":0.4,"reason":"Too close."}', cost=0.00002),
                    call('{"winner":"A","confidence":0.9,"reason":"Sharper Korean read."}', cost=0.00002),
                ],
            )

            data = export_real_poc(
                output_path=output_path,
                logs_path=logs_path,
                openai_provider=openai,
                gemini_provider=gemini,
                judge_provider=judge,
                budget_cap_usd=2,
            )

            self.assertTrue(output_path.exists())
            self.assertTrue(logs_path.exists())
            self.assertEqual(len(data["models"]), 2)
            self.assertEqual(len(data["matches"]), 4)
            self.assertEqual(len(data["costSnapshots"]), 8)
            self.assertTrue(any(snapshot["rating"] != 1500 for snapshot in data["ratingSnapshots"]))
            self.assertEqual({game["id"] for game in data["games"]}, {"werewolf-en", "werewolf-ko"})

            first_match_costs = [
                cost
                for cost in data["costSnapshots"]
                if cost["matchId"] == data["matches"][0]["id"]
            ]
            self.assertEqual(len(first_match_costs), 2)
            self.assertAlmostEqual(
                sum(cost["estimatedCostUsd"] for cost in first_match_costs),
                0.00005 + 0.00004 + 0.00002,
                places=8,
            )
            self.assertEqual(first_match_costs[0]["requestCount"], 1.5)
            self.assertEqual(first_match_costs[1]["requestCount"], 1.5)

    def test_budget_cap_stops_expensive_runs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            provider = ScriptedProvider(
                "expensive",
                [call('{"claim":"expensive"}', cost=1.0) for _ in range(4)],
            )
            judge = ScriptedProvider(
                "judge",
                [call('{"winner":"A","confidence":0.8,"reason":"ok"}', cost=1.0) for _ in range(4)],
            )

            with self.assertRaisesRegex(RuntimeError, "exceeds budget cap"):
                export_real_poc(
                    output_path=Path(temp_dir) / "out.json",
                    logs_path=Path(temp_dir) / "logs.json",
                    openai_provider=provider,
                    gemini_provider=provider,
                    judge_provider=judge,
                    budget_cap_usd=0.01,
                )


if __name__ == "__main__":
    unittest.main()
