from __future__ import annotations

import argparse
import json
import os
import ssl
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from .export_league import INITIAL_RATING, _apply_elo
from .judging import normalize_judgement

OPENAI_MODEL_ID = "openai-gpt-41-nano"
GEMINI_MODEL_ID = "gemini-25-flash-lite"
UPSTAGE_MODEL_ID = "upstage-solar-mini"
OPENAI_API_MODEL = "gpt-4.1-nano"
GEMINI_API_MODEL = "gemini-2.5-flash-lite"
UPSTAGE_API_MODEL = "solar-mini"
DEFAULT_BUDGET_USD = 2.0

PRICING = {
    OPENAI_API_MODEL: {"inputPerMillion": 0.10, "outputPerMillion": 0.40},
    GEMINI_API_MODEL: {"inputPerMillion": 0.10, "outputPerMillion": 0.40},
    UPSTAGE_API_MODEL: {"inputPerMillion": 0.15, "outputPerMillion": 0.15},
}


@dataclass
class ModelCallResult:
    text: str
    input_tokens: float
    output_tokens: float
    cached_tokens: float
    elapsed_seconds: float
    estimated_cost_usd: float
    raw: dict[str, Any]


class RealPocProvider:
    model_id: str

    def generate(self, prompt: str, max_output_tokens: int = 512) -> ModelCallResult:
        raise NotImplementedError


class RealHttpClient:
    def post_json(
        self,
        url: str,
        payload: dict[str, Any],
        headers: dict[str, str],
        timeout_seconds: int = 60,
    ) -> tuple[int, dict[str, Any], float]:
        started_at = time.monotonic()
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", **headers},
            method="POST",
        )
        try:
            with urllib.request.urlopen(
                request,
                timeout=timeout_seconds,
                context=ssl.create_default_context(),
            ) as response:
                elapsed = time.monotonic() - started_at
                body = json.loads(response.read().decode("utf-8"))
                return response.status, body, elapsed
        except urllib.error.HTTPError as error:
            elapsed = time.monotonic() - started_at
            raw_body = error.read().decode("utf-8", errors="replace")
            try:
                body = json.loads(raw_body)
            except json.JSONDecodeError:
                body = {"error": {"message": raw_body[:500]}}
            return error.code, body, elapsed


class OpenAIProvider(RealPocProvider):
    def __init__(
        self,
        api_key: str,
        http_client: RealHttpClient | None = None,
        retry_delay_seconds: float = 0.5,
    ):
        self.model_id = OPENAI_API_MODEL
        self._api_key = api_key
        self._http_client = http_client or RealHttpClient()
        self._retry_delay_seconds = retry_delay_seconds

    def generate(self, prompt: str, max_output_tokens: int = 512) -> ModelCallResult:
        status, body, elapsed = _post_json_with_retries(
            self._http_client,
            "https://api.openai.com/v1/responses",
            {
                "model": OPENAI_API_MODEL,
                "input": prompt,
                "max_output_tokens": max(16, max_output_tokens),
                "temperature": 0.2,
            },
            {"Authorization": f"Bearer {self._api_key}"},
            retry_delay_seconds=self._retry_delay_seconds,
        )
        if status != 200:
            raise RuntimeError(f"OpenAI request failed: {status} {_error_message(body)}")

        usage = body.get("usage") or {}
        input_tokens = float(usage.get("input_tokens") or 0)
        output_tokens = float(usage.get("output_tokens") or 0)
        cached_tokens = float(
            ((usage.get("input_tokens_details") or {}).get("cached_tokens")) or 0,
        )
        return ModelCallResult(
            text=_openai_text(body),
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cached_tokens=cached_tokens,
            elapsed_seconds=round(elapsed, 3),
            estimated_cost_usd=_estimate_cost(OPENAI_API_MODEL, input_tokens, output_tokens),
            raw=body,
        )


class GeminiProvider(RealPocProvider):
    def __init__(
        self,
        api_key: str,
        http_client: RealHttpClient | None = None,
        retry_delay_seconds: float = 0.5,
    ):
        self.model_id = GEMINI_API_MODEL
        self._api_key = api_key
        self._http_client = http_client or RealHttpClient()
        self._retry_delay_seconds = retry_delay_seconds

    def generate(self, prompt: str, max_output_tokens: int = 512) -> ModelCallResult:
        status, body, elapsed = _post_json_with_retries(
            self._http_client,
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_API_MODEL}:generateContent",
            {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "maxOutputTokens": max_output_tokens,
                    "temperature": 0.2,
                },
            },
            {"x-goog-api-key": self._api_key},
            retry_delay_seconds=self._retry_delay_seconds,
        )
        if status != 200:
            raise RuntimeError(f"Gemini request failed: {status} {_error_message(body)}")

        usage = body.get("usageMetadata") or {}
        input_tokens = float(usage.get("promptTokenCount") or 0)
        output_tokens = float(usage.get("candidatesTokenCount") or 0)
        return ModelCallResult(
            text=_gemini_text(body),
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cached_tokens=0,
            elapsed_seconds=round(elapsed, 3),
            estimated_cost_usd=_estimate_cost(GEMINI_API_MODEL, input_tokens, output_tokens),
            raw=body,
        )


class UpstageProvider(RealPocProvider):
    def __init__(
        self,
        api_key: str,
        http_client: RealHttpClient | None = None,
        retry_delay_seconds: float = 0.5,
    ):
        self.model_id = UPSTAGE_API_MODEL
        self._api_key = api_key
        self._http_client = http_client or RealHttpClient()
        self._retry_delay_seconds = retry_delay_seconds

    def generate(self, prompt: str, max_output_tokens: int = 512) -> ModelCallResult:
        status, body, elapsed = _post_json_with_retries(
            self._http_client,
            "https://api.upstage.ai/v1/chat/completions",
            {
                "model": UPSTAGE_API_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_output_tokens,
                "temperature": 0.2,
            },
            {"Authorization": f"Bearer {self._api_key}"},
            retry_delay_seconds=self._retry_delay_seconds,
        )
        if status != 200:
            raise RuntimeError(f"Upstage request failed: {status} {_error_message(body)}")

        usage = body.get("usage") or {}
        input_tokens = float(usage.get("prompt_tokens") or 0)
        output_tokens = float(usage.get("completion_tokens") or 0)
        return ModelCallResult(
            text=_chat_completion_text(body),
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cached_tokens=0,
            elapsed_seconds=round(elapsed, 3),
            estimated_cost_usd=_estimate_cost(UPSTAGE_API_MODEL, input_tokens, output_tokens),
            raw=body,
        )


def _post_json_with_retries(
    http_client: RealHttpClient,
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str],
    retry_delay_seconds: float,
    max_attempts: int = 10,
) -> tuple[int, dict[str, Any], float]:
    retryable_statuses = {429, 500, 502, 503, 504}
    total_elapsed = 0.0
    last_status = 0
    last_body: dict[str, Any] = {}
    for attempt in range(1, max_attempts + 1):
        status, body, elapsed = http_client.post_json(url, payload, headers)
        total_elapsed += elapsed
        last_status = status
        last_body = body
        if status not in retryable_statuses:
            return status, body, total_elapsed
        if attempt < max_attempts and retry_delay_seconds > 0:
            time.sleep(retry_delay_seconds * attempt)
    return last_status, last_body, total_elapsed


def export_real_poc(
    output_path: Path,
    logs_path: Path,
    openai_provider: RealPocProvider,
    gemini_provider: RealPocProvider,
    judge_provider: RealPocProvider,
    budget_cap_usd: float = DEFAULT_BUDGET_USD,
) -> dict[str, Any]:
    models = _poc_models()
    model_index = {model["id"]: model for model in models}
    schedule = _poc_schedule()
    ratings_all = {model["id"]: float(INITIAL_RATING) for model in models}
    ratings_by_game = {
        game["id"]: {model["id"]: float(INITIAL_RATING) for model in models}
        for game in _poc_games()
    }
    provider_by_model = {
        OPENAI_MODEL_ID: openai_provider,
        GEMINI_MODEL_ID: gemini_provider,
    }
    matches: list[dict[str, Any]] = []
    rating_snapshots: list[dict[str, Any]] = []
    cost_snapshots: list[dict[str, Any]] = []
    turn_logs: dict[str, Any] = {}
    total_cost_usd = 0.0
    played_at = datetime(2026, 6, 30, 9, 0, tzinfo=timezone.utc)

    for index, item in enumerate(schedule):
        model_a = model_index[item["modelAId"]]
        model_b = model_index[item["modelBId"]]
        prompt_a = _player_prompt(item, model_a, model_b, position="A")
        prompt_b = _player_prompt(item, model_b, model_a, position="B")
        call_a = provider_by_model[item["modelAId"]].generate(prompt_a, max_output_tokens=420)
        call_b = provider_by_model[item["modelBId"]].generate(prompt_b, max_output_tokens=420)
        judge_prompt = _judge_prompt(item, model_a, model_b, call_a.text, call_b.text)
        judge_call = judge_provider.generate(judge_prompt, max_output_tokens=256)
        judgement = _normalize_judge_text(judge_call.text, item["modelAId"], item["modelBId"])

        match_id = item["id"]
        timestamp = played_at + timedelta(minutes=index * 30)
        match_costs = _allocated_cost_snapshots(match_id, model_a, model_b, call_a, call_b, judge_call)
        total_cost_usd += sum(cost["estimatedCostUsd"] for cost in match_costs)
        if total_cost_usd > budget_cap_usd:
            raise RuntimeError(
                f"Real PoC estimated cost ${total_cost_usd:.4f} exceeds budget cap ${budget_cap_usd:.2f}.",
            )

        match = {
            "id": match_id,
            "playedAt": timestamp.isoformat().replace("+00:00", "Z"),
            "gameId": item["gameId"],
            "modelAId": item["modelAId"],
            "modelBId": item["modelBId"],
            "winnerModelId": judgement["winnerModelId"],
            "result": judgement["result"],
            "turns": 3,
            "durationSeconds": int(round(call_a.elapsed_seconds + call_b.elapsed_seconds + judge_call.elapsed_seconds)),
            "summary": _match_summary(judgement, model_index),
        }
        matches.append(match)
        cost_snapshots.extend(match_costs)

        _apply_elo(ratings_all, item["modelAId"], item["modelBId"], float(judgement["scoreA"]))
        _apply_elo(ratings_by_game[item["gameId"]], item["modelAId"], item["modelBId"], float(judgement["scoreA"]))

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

        turn_logs[match_id] = {
            "scenarioId": item["scenarioId"],
            "languageCode": item["languageCode"],
            "prompts": {
                "modelA": prompt_a,
                "modelB": prompt_b,
                "judge": judge_prompt,
            },
            "responses": {
                "modelA": _call_log(call_a),
                "modelB": _call_log(call_b),
                "judge": _call_log(judge_call),
            },
            "judgement": judgement,
            "costBreakdown": {
                "modelA": match_costs[0],
                "modelB": match_costs[1],
                "judgeCostUsd": round(judge_call.estimated_cost_usd, 8),
                "totalMatchCostUsd": round(sum(cost["estimatedCostUsd"] for cost in match_costs), 8),
                "allocation": "player call cost plus 50% of judge call cost per player",
            },
        }

    return _write_real_poc_outputs(
        output_path,
        logs_path,
        models,
        matches,
        rating_snapshots,
        cost_snapshots,
        turn_logs,
    )


def append_upstage_to_real_poc(
    existing_data: dict[str, Any],
    output_path: Path,
    logs_path: Path,
    openai_provider: RealPocProvider,
    gemini_provider: RealPocProvider,
    upstage_provider: RealPocProvider,
    judge_provider: RealPocProvider,
    budget_cap_usd: float = DEFAULT_BUDGET_USD,
) -> dict[str, Any]:
    models = _poc_models(include_upstage=True)
    model_index = {model["id"]: model for model in models}
    matches = [_normalize_existing_match_summary(match) for match in existing_data["matches"]]
    rating_snapshots = list(existing_data["ratingSnapshots"])
    cost_snapshots = list(existing_data["costSnapshots"])
    turn_logs = _read_existing_logs(logs_path)
    existing_match_ids = {match["id"] for match in matches}
    ratings_all = _latest_ratings(existing_data, [model["id"] for model in models], game_id=None)
    ratings_by_game = {
        game["id"]: _latest_ratings(existing_data, [model["id"] for model in models], game_id=game["id"])
        for game in _poc_games()
    }
    provider_by_model = {
        OPENAI_MODEL_ID: openai_provider,
        GEMINI_MODEL_ID: gemini_provider,
        UPSTAGE_MODEL_ID: upstage_provider,
    }
    total_cost_usd = sum(float(cost["estimatedCostUsd"]) for cost in cost_snapshots)
    played_at = datetime(2026, 6, 30, 11, 0, tzinfo=timezone.utc)

    for index, item in enumerate(_upstage_append_schedule()):
        if item["id"] in existing_match_ids:
            continue

        model_a = model_index[item["modelAId"]]
        model_b = model_index[item["modelBId"]]
        prompt_a = _player_prompt(item, model_a, model_b, position="A")
        prompt_b = _player_prompt(item, model_b, model_a, position="B")
        call_a = provider_by_model[item["modelAId"]].generate(prompt_a, max_output_tokens=420)
        call_b = provider_by_model[item["modelBId"]].generate(prompt_b, max_output_tokens=420)
        judge_prompt = _judge_prompt(item, model_a, model_b, call_a.text, call_b.text)
        judge_call = judge_provider.generate(judge_prompt, max_output_tokens=256)
        judgement = _normalize_judge_text(judge_call.text, item["modelAId"], item["modelBId"])
        match_costs = _allocated_cost_snapshots(item["id"], model_a, model_b, call_a, call_b, judge_call)
        total_cost_usd += sum(cost["estimatedCostUsd"] for cost in match_costs)
        if total_cost_usd > budget_cap_usd:
            raise RuntimeError(
                f"Real PoC estimated cost ${total_cost_usd:.4f} exceeds budget cap ${budget_cap_usd:.2f}.",
            )

        timestamp = played_at + timedelta(minutes=index * 30)
        match = {
            "id": item["id"],
            "playedAt": timestamp.isoformat().replace("+00:00", "Z"),
            "gameId": item["gameId"],
            "modelAId": item["modelAId"],
            "modelBId": item["modelBId"],
            "winnerModelId": judgement["winnerModelId"],
            "result": judgement["result"],
            "turns": 3,
            "durationSeconds": int(round(call_a.elapsed_seconds + call_b.elapsed_seconds + judge_call.elapsed_seconds)),
            "summary": _match_summary(judgement, model_index),
        }
        matches.append(match)
        existing_match_ids.add(match["id"])
        cost_snapshots.extend(match_costs)

        _apply_elo(ratings_all, item["modelAId"], item["modelBId"], float(judgement["scoreA"]))
        _apply_elo(ratings_by_game[item["gameId"]], item["modelAId"], item["modelBId"], float(judgement["scoreA"]))

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

        turn_logs[item["id"]] = {
            "scenarioId": item["scenarioId"],
            "languageCode": item["languageCode"],
            "prompts": {"modelA": prompt_a, "modelB": prompt_b, "judge": judge_prompt},
            "responses": {
                "modelA": _call_log(call_a),
                "modelB": _call_log(call_b),
                "judge": _call_log(judge_call),
            },
            "judgement": judgement,
            "costBreakdown": {
                "modelA": match_costs[0],
                "modelB": match_costs[1],
                "judgeCostUsd": round(judge_call.estimated_cost_usd, 8),
                "totalMatchCostUsd": round(sum(cost["estimatedCostUsd"] for cost in match_costs), 8),
                "allocation": "player call cost plus 50% of judge call cost per player",
            },
        }

        _write_real_poc_outputs(
            output_path,
            logs_path,
            models,
            matches,
            rating_snapshots,
            cost_snapshots,
            turn_logs,
        )

    return _write_real_poc_outputs(
        output_path,
        logs_path,
        models,
        matches,
        rating_snapshots,
        cost_snapshots,
        turn_logs,
    )


def _sponsorship_previews(models: list[dict[str, Any]]) -> list[dict[str, Any]]:
    preview_by_model = {
        "openai-gpt-41-nano": (24, 16.5, 18, "2026-06-29T09:00:00.000Z"),
        "gemini-25-flash-lite": (31, 24, 23, "2026-06-29T11:30:00.000Z"),
        "upstage-solar-mini": (18, 13.25, 15, "2026-06-29T13:10:00.000Z"),
    }

    previews = []
    for index, model in enumerate(models):
        total, available, supporters, funded_at = preview_by_model.get(
            model["id"],
            (12 + index * 4, 8 + index * 3, 5 + index * 2, "2026-06-29T09:00:00.000Z"),
        )
        previews.append(
            {
                "modelId": model["id"],
                "totalFundedUsd": total,
                "availableBudgetUsd": available,
                "supporterCount": supporters,
                "platformFeeRate": 0.05,
                "lastFundedAt": funded_at,
                "status": "preview",
            },
        )

    return previews


def _write_real_poc_outputs(
    output_path: Path,
    logs_path: Path,
    models: list[dict[str, Any]],
    matches: list[dict[str, Any]],
    rating_snapshots: list[dict[str, Any]],
    cost_snapshots: list[dict[str, Any]],
    turn_logs: dict[str, Any],
) -> dict[str, Any]:
    data = {
        "models": models,
        "games": _poc_games(),
        "matches": matches,
        "ratingSnapshots": rating_snapshots,
        "costSnapshots": cost_snapshots,
        "sponsorshipPreviews": _sponsorship_previews(models),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    logs_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    logs_path.write_text(json.dumps(turn_logs, ensure_ascii=False, indent=2) + "\n")
    return data


def run_doctor() -> dict[str, Any]:
    load_env_file()
    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    upstage_key = os.environ.get("UPSTAGE_API_KEY")
    if not openai_key or not gemini_key or not upstage_key:
        return {
            "ok": False,
            "openaiKeyPresent": bool(openai_key),
            "geminiKeyPresent": bool(gemini_key),
            "upstageKeyPresent": bool(upstage_key),
            "checks": [],
        }

    checks = []
    for name, provider in [
        ("openai", OpenAIProvider(openai_key)),
        ("gemini", GeminiProvider(gemini_key)),
        ("upstage", UpstageProvider(upstage_key)),
    ]:
        try:
            result = provider.generate("Reply with exactly: ok", max_output_tokens=16)
            checks.append(
                {
                    "provider": name,
                    "ok": True,
                    "inputTokens": result.input_tokens,
                    "outputTokens": result.output_tokens,
                    "estimatedCostUsd": result.estimated_cost_usd,
                },
            )
        except Exception as error:  # pragma: no cover - exercised manually against real APIs
            checks.append({"provider": name, "ok": False, "error": str(error)})

    return {
        "ok": all(check["ok"] for check in checks),
        "openaiKeyPresent": True,
        "geminiKeyPresent": True,
        "upstageKeyPresent": True,
        "checks": checks,
    }


def load_env_file(path: Path = Path(".env.local")) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _poc_models(include_upstage: bool = False) -> list[dict[str, Any]]:
    models = [
        {
            "id": OPENAI_MODEL_ID,
            "name": "GPT-4.1 Nano",
            "provider": "OpenAI",
            "version": "real-poc-2026-06",
            "profile": {
                "mbti": "ENTP",
                "tagline": "Low-cost OpenAI player for real pipeline validation.",
                "quote": "A tiny match is still a match if the ledger is honest.",
                "styleTags": ["OpenAI", "PoC", "Lightweight"],
                "strengths": ["Fast reasoning", "Structured responses", "Low-cost tests"],
                "weaknesses": ["Single-turn context", "PoC-only sample size"],
            },
        },
        {
            "id": GEMINI_MODEL_ID,
            "name": "Gemini 2.5 Flash-Lite",
            "provider": "Google",
            "version": "real-poc-2026-06",
            "profile": {
                "mbti": "INTJ",
                "tagline": "Low-cost Gemini player and judge candidate for real pipeline validation.",
                "quote": "Measure first. Argue second.",
                "styleTags": ["Gemini", "PoC", "Efficient"],
                "strengths": ["Fast completions", "Cost efficiency", "Judge compatibility"],
                "weaknesses": ["Single judge bias", "PoC-only sample size"],
            },
        },
    ]
    if include_upstage:
        models.append(
            {
                "id": UPSTAGE_MODEL_ID,
                "name": "Solar Mini",
                "provider": "Upstage",
                "version": "real-poc-2026-06",
                "profile": {
                    "mbti": "ISFJ",
                    "tagline": "Lightweight Korean-friendly Solar player for real pipeline validation.",
                    "quote": "Nuance matters when suspicion turns into a vote.",
                    "styleTags": ["Upstage", "Solar", "Korean", "PoC"],
                    "strengths": ["Korean phrasing", "Low-cost completions", "Concise rebuttals"],
                    "weaknesses": ["Single-turn context", "PoC-only sample size"],
                },
            },
        )
    return models


def _poc_games() -> list[dict[str, Any]]:
    return [
        {
            "id": "werewolf-en",
            "name": "Werewolf Debate - English",
            "category": "Social deduction debate",
            "description": "English 1:1 Werewolf final debate evaluation focused on persuasion, role inference, and vote logic.",
            "baseGameId": "werewolf_debate",
            "languageCode": "en",
            "languageName": "English",
        },
        {
            "id": "werewolf-ko",
            "name": "늑대인간 토론 - 한국어",
            "category": "Social deduction debate",
            "description": "한국어 1:1 늑대인간 최종 토론 평가입니다. 설득, 역할 추론, 투표 논리를 봅니다.",
            "baseGameId": "werewolf_debate",
            "languageCode": "ko",
            "languageName": "한국어",
        },
    ]


def _poc_schedule() -> list[dict[str, str]]:
    return [
        {
            "id": "real-poc-001",
            "gameId": "werewolf-en",
            "languageCode": "en",
            "scenarioId": "real-en-1",
            "modelAId": OPENAI_MODEL_ID,
            "modelBId": GEMINI_MODEL_ID,
        },
        {
            "id": "real-poc-002",
            "gameId": "werewolf-en",
            "languageCode": "en",
            "scenarioId": "real-en-1-mirror",
            "modelAId": GEMINI_MODEL_ID,
            "modelBId": OPENAI_MODEL_ID,
        },
        {
            "id": "real-poc-003",
            "gameId": "werewolf-ko",
            "languageCode": "ko",
            "scenarioId": "real-ko-1",
            "modelAId": OPENAI_MODEL_ID,
            "modelBId": GEMINI_MODEL_ID,
        },
        {
            "id": "real-poc-004",
            "gameId": "werewolf-ko",
            "languageCode": "ko",
            "scenarioId": "real-ko-1-mirror",
            "modelAId": GEMINI_MODEL_ID,
            "modelBId": OPENAI_MODEL_ID,
        },
    ]


def _upstage_append_schedule() -> list[dict[str, str]]:
    return [
        {
            "id": "real-poc-005",
            "gameId": "werewolf-en",
            "languageCode": "en",
            "scenarioId": "real-en-openai-upstage",
            "modelAId": OPENAI_MODEL_ID,
            "modelBId": UPSTAGE_MODEL_ID,
        },
        {
            "id": "real-poc-006",
            "gameId": "werewolf-en",
            "languageCode": "en",
            "scenarioId": "real-en-openai-upstage-mirror",
            "modelAId": UPSTAGE_MODEL_ID,
            "modelBId": OPENAI_MODEL_ID,
        },
        {
            "id": "real-poc-007",
            "gameId": "werewolf-ko",
            "languageCode": "ko",
            "scenarioId": "real-ko-openai-upstage",
            "modelAId": OPENAI_MODEL_ID,
            "modelBId": UPSTAGE_MODEL_ID,
        },
        {
            "id": "real-poc-008",
            "gameId": "werewolf-ko",
            "languageCode": "ko",
            "scenarioId": "real-ko-openai-upstage-mirror",
            "modelAId": UPSTAGE_MODEL_ID,
            "modelBId": OPENAI_MODEL_ID,
        },
        {
            "id": "real-poc-009",
            "gameId": "werewolf-en",
            "languageCode": "en",
            "scenarioId": "real-en-gemini-upstage",
            "modelAId": GEMINI_MODEL_ID,
            "modelBId": UPSTAGE_MODEL_ID,
        },
        {
            "id": "real-poc-010",
            "gameId": "werewolf-en",
            "languageCode": "en",
            "scenarioId": "real-en-gemini-upstage-mirror",
            "modelAId": UPSTAGE_MODEL_ID,
            "modelBId": GEMINI_MODEL_ID,
        },
        {
            "id": "real-poc-011",
            "gameId": "werewolf-ko",
            "languageCode": "ko",
            "scenarioId": "real-ko-gemini-upstage",
            "modelAId": GEMINI_MODEL_ID,
            "modelBId": UPSTAGE_MODEL_ID,
        },
        {
            "id": "real-poc-012",
            "gameId": "werewolf-ko",
            "languageCode": "ko",
            "scenarioId": "real-ko-gemini-upstage-mirror",
            "modelAId": UPSTAGE_MODEL_ID,
            "modelBId": GEMINI_MODEL_ID,
        },
    ]


def _latest_ratings(
    data: dict[str, Any],
    model_ids: list[str],
    game_id: str | None,
) -> dict[str, float]:
    ratings = {model_id: float(INITIAL_RATING) for model_id in model_ids}
    for snapshot in data.get("ratingSnapshots", []):
        if snapshot.get("gameId") == game_id and snapshot.get("modelId") in ratings:
            ratings[snapshot["modelId"]] = float(snapshot["rating"])
    return ratings


def _read_existing_logs(logs_path: Path) -> dict[str, Any]:
    if not logs_path.exists():
        return {}
    return json.loads(logs_path.read_text())


def _normalize_existing_match_summary(match: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(match)
    normalized["summary"] = str(normalized.get("summary", "")).replace(
        "this Werewolf PoC match",
        "this Werewolf debate evaluation",
    )
    return normalized


def _player_prompt(item: dict[str, str], self_model: dict[str, Any], opponent: dict[str, Any], position: str) -> str:
    if item["languageCode"] == "ko":
        language_instruction = "한국어로 답하세요."
        scenario = (
            "늑대인간 게임을 소재로 한 1:1 최종 토론 평가입니다. 당신은 마을 팀입니다. "
            "상대 발언의 허점을 짚고, 왜 당신의 투표 논리가 더 설득력 있는지 말하세요."
        )
    else:
        language_instruction = "Answer in English."
        scenario = (
            "This is a 1:1 final debate evaluation inspired by a Werewolf game. You are on the village team. "
            "Point out weaknesses in the opponent's likely argument and explain why your vote logic is more persuasive."
        )

    return (
        f"{language_instruction}\n"
        f"Game: {item['gameId']}\n"
        f"Scenario: {scenario}\n"
        f"You are response {position}: {self_model['name']}.\n"
        f"Opponent: {opponent['name']}.\n"
        "Return strict JSON with keys: claim, evidence, vote, closing."
    )


def _judge_prompt(
    item: dict[str, str],
    model_a: dict[str, Any],
    model_b: dict[str, Any],
    response_a: str,
    response_b: str,
) -> str:
    if item["languageCode"] == "ko":
        language_instruction = "한국어 1:1 늑대인간 토론 평가를 판정하세요."
    else:
        language_instruction = "Judge this English 1:1 Werewolf debate evaluation."
    return (
        f"{language_instruction}\n"
        "You are judging only the quality of persuasion, role inference, vote logic, and direct rebuttal.\n"
        "The model names are provided for logging, but decide from Response A and Response B only.\n"
        f"Model A: {model_a['name']}\n"
        f"Model B: {model_b['name']}\n"
        f"Response A:\n{response_a}\n\n"
        f"Response B:\n{response_b}\n\n"
        "Return strict JSON only: {\"winner\":\"A\"|\"B\"|\"draw\",\"confidence\":0.0-1.0,\"reason\":\"short reason\"}."
    )


def _normalize_judge_text(text: str, model_a_id: str, model_b_id: str) -> dict[str, Any]:
    parsed = _extract_json_object(text)
    winner = str(parsed.get("winner", "draw")).lower()
    if winner in {"a", "model_a", "response_a"}:
        winner_model_id = model_a_id
    elif winner in {"b", "model_b", "response_b"}:
        winner_model_id = model_b_id
    else:
        winner_model_id = None

    normalized = normalize_judgement(
        {
            "winnerModelId": winner_model_id,
            "confidence": float(parsed.get("confidence", 0)),
        },
        model_a_id=model_a_id,
        model_b_id=model_b_id,
    )
    normalized["judgeReason"] = str(parsed.get("reason", normalized["reason"]))
    return normalized


def _allocated_cost_snapshots(
    match_id: str,
    model_a: dict[str, Any],
    model_b: dict[str, Any],
    call_a: ModelCallResult,
    call_b: ModelCallResult,
    judge_call: ModelCallResult,
) -> list[dict[str, Any]]:
    return [
        _allocated_cost_snapshot(match_id, model_a, call_a, judge_call),
        _allocated_cost_snapshot(match_id, model_b, call_b, judge_call),
    ]


def _allocated_cost_snapshot(
    match_id: str,
    model: dict[str, Any],
    player_call: ModelCallResult,
    judge_call: ModelCallResult,
) -> dict[str, Any]:
    return {
        "matchId": match_id,
        "modelId": model["id"],
        "provider": model["provider"],
        "inputTokens": player_call.input_tokens + judge_call.input_tokens / 2,
        "outputTokens": player_call.output_tokens + judge_call.output_tokens / 2,
        "cachedTokens": player_call.cached_tokens + judge_call.cached_tokens / 2,
        "requestCount": 1.5,
        "elapsedSeconds": round(player_call.elapsed_seconds + judge_call.elapsed_seconds / 2, 3),
        "estimatedCostUsd": round(player_call.estimated_cost_usd + judge_call.estimated_cost_usd / 2, 8),
    }


def _call_log(call: ModelCallResult) -> dict[str, Any]:
    return {
        "text": call.text,
        "usage": {
            "inputTokens": call.input_tokens,
            "outputTokens": call.output_tokens,
            "cachedTokens": call.cached_tokens,
            "elapsedSeconds": call.elapsed_seconds,
            "estimatedCostUsd": call.estimated_cost_usd,
        },
        "raw": call.raw,
    }


def _match_summary(judgement: dict[str, Any], model_index: dict[str, dict[str, Any]]) -> str:
    reason = str(judgement.get("judgeReason") or judgement.get("reason") or "Judge returned no reason.")
    winner_id = judgement["winnerModelId"]
    if winner_id is None:
        return f"The judge marked this Werewolf debate evaluation as a draw. {reason}"
    return f"{model_index[winner_id]['name']} won this Werewolf debate evaluation. {reason}"


def _extract_json_object(text: str) -> dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"Expected JSON object in model response: {text[:120]}")
    return json.loads(text[start : end + 1])


def _estimate_cost(model_id: str, input_tokens: float, output_tokens: float) -> float:
    pricing = PRICING[model_id]
    cost = (
        input_tokens / 1_000_000 * pricing["inputPerMillion"]
        + output_tokens / 1_000_000 * pricing["outputPerMillion"]
    )
    return round(cost, 8)


def _openai_text(body: dict[str, Any]) -> str:
    if isinstance(body.get("output_text"), str):
        return body["output_text"]
    chunks: list[str] = []
    for output in body.get("output", []) or []:
        for content in output.get("content", []) or []:
            text = content.get("text")
            if isinstance(text, str):
                chunks.append(text)
    return "\n".join(chunks).strip()


def _gemini_text(body: dict[str, Any]) -> str:
    chunks: list[str] = []
    for candidate in body.get("candidates", []) or []:
        content = candidate.get("content") or {}
        for part in content.get("parts", []) or []:
            text = part.get("text")
            if isinstance(text, str):
                chunks.append(text)
    return "\n".join(chunks).strip()


def _chat_completion_text(body: dict[str, Any]) -> str:
    chunks: list[str] = []
    for choice in body.get("choices", []) or []:
        message = choice.get("message") or {}
        content = message.get("content")
        if isinstance(content, str):
            chunks.append(content)
    return "\n".join(chunks).strip()


def _error_message(body: dict[str, Any]) -> str:
    error = body.get("error") or {}
    return str(error.get("message") or body)[:300]


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a real GLADI API PoC league.")
    parser.add_argument("--output", type=Path, default=Path("public/data/fightall.generated.json"))
    parser.add_argument("--logs", type=Path, default=Path("tools/fightall_runner/out/real_poc_turn_logs.json"))
    parser.add_argument("--budget-cap-usd", type=float, default=DEFAULT_BUDGET_USD)
    parser.add_argument("--doctor", action="store_true")
    parser.add_argument("--append-upstage", action="store_true")
    args = parser.parse_args()

    load_env_file()
    if args.doctor:
        print(json.dumps(run_doctor(), ensure_ascii=False, indent=2))
        return

    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    upstage_key = os.environ.get("UPSTAGE_API_KEY")
    if not openai_key or not gemini_key:
        raise SystemExit("OPENAI_API_KEY and GEMINI_API_KEY are required.")

    if args.append_upstage:
        if not upstage_key:
            raise SystemExit("UPSTAGE_API_KEY is required for --append-upstage.")
        if not args.output.exists():
            raise SystemExit(f"Existing output JSON is required for --append-upstage: {args.output}")
        data = append_upstage_to_real_poc(
            existing_data=json.loads(args.output.read_text()),
            output_path=args.output,
            logs_path=args.logs,
            openai_provider=OpenAIProvider(openai_key),
            gemini_provider=GeminiProvider(gemini_key),
            upstage_provider=UpstageProvider(upstage_key),
            judge_provider=GeminiProvider(gemini_key),
            budget_cap_usd=args.budget_cap_usd,
        )
    else:
        data = export_real_poc(
            output_path=args.output,
            logs_path=args.logs,
            openai_provider=OpenAIProvider(openai_key),
            gemini_provider=GeminiProvider(gemini_key),
            judge_provider=GeminiProvider(gemini_key),
            budget_cap_usd=args.budget_cap_usd,
        )
    total_cost = sum(cost["estimatedCostUsd"] for cost in data["costSnapshots"])
    print(
        json.dumps(
            {
                "ok": True,
                "matches": len(data["matches"]),
                "costSnapshots": len(data["costSnapshots"]),
                "estimatedCostUsd": round(total_cost, 8),
                "output": str(args.output),
                "logs": str(args.logs),
            },
            ensure_ascii=False,
            indent=2,
        ),
    )


if __name__ == "__main__":
    main()
