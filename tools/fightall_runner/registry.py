from __future__ import annotations


def candidate_models() -> list[dict]:
    return [
        {
            "id": "gpt-41",
            "name": "GPT-4.1",
            "provider": "OpenAI",
            "apiModelId": "gpt-4.1",
            "version": "mock-2026-06",
            "pricing": {"inputPerMillion": 2.0, "outputPerMillion": 8.0},
            "leagueLanguages": ["en", "ko"],
            "mockStrength": {"en": 72, "ko": 67},
            "profile": {
                "mbti": "ENTP",
                "tagline": "Inventive attacker that pushes initiative early.",
                "quote": "If a line has three traps, I would like to examine all three.",
                "styleTags": ["Creative", "Aggressive", "Tempo"],
                "strengths": ["Opening pressure", "Tactical pivots", "Fast adaptation"],
                "weaknesses": ["Overextension", "Occasional draw conversion errors"],
            },
        },
        {
            "id": "claude-sonnet-45",
            "name": "Claude Sonnet 4.5",
            "provider": "Anthropic",
            "apiModelId": "claude-sonnet-4-5",
            "version": "mock-2026-06",
            "pricing": {"inputPerMillion": 3.0, "outputPerMillion": 15.0},
            "leagueLanguages": ["en", "ko"],
            "mockStrength": {"en": 74, "ko": 70},
            "profile": {
                "mbti": "INFJ",
                "tagline": "Patient strategist with late-game discipline.",
                "quote": "The room usually tells you where the pressure belongs.",
                "styleTags": ["Positional", "Careful", "Endgame"],
                "strengths": ["Long-horizon planning", "Defensive conversions", "Low-blunder play"],
                "weaknesses": ["Early tempo races", "High-variance openings"],
            },
        },
        {
            "id": "gemini-25-flash",
            "name": "Gemini 2.5 Flash",
            "provider": "Google",
            "apiModelId": "gemini-2.5-flash",
            "version": "mock-2026-06",
            "pricing": {"inputPerMillion": 0.3, "outputPerMillion": 2.5},
            "leagueLanguages": ["en", "ko"],
            "mockStrength": {"en": 70, "ko": 69},
            "profile": {
                "mbti": "INTJ",
                "tagline": "Structured planner with strong board control.",
                "quote": "A quiet vote can still decide the match.",
                "styleTags": ["Analytical", "Balanced", "Efficient"],
                "strengths": ["Pattern recognition", "Resource-efficient wins", "Stable midgame play"],
                "weaknesses": ["Slow starts", "Rare tactical tunnel vision"],
            },
        },
        {
            "id": "grok-4",
            "name": "Grok 4",
            "provider": "xAI",
            "apiModelId": "grok-4",
            "version": "mock-2026-06",
            "pricing": {"inputPerMillion": 3.0, "outputPerMillion": 15.0},
            "leagueLanguages": ["en", "ko"],
            "mockStrength": {"en": 68, "ko": 64},
            "profile": {
                "mbti": "ESTP",
                "tagline": "Volatile pressure player with upset potential.",
                "quote": "Chaos is only bad if you are surprised by it.",
                "styleTags": ["Volatile", "Fast", "Pressure"],
                "strengths": ["Forcing lines", "Comeback attempts", "Short-game tactics"],
                "weaknesses": ["Consistency", "Cost control under pressure"],
            },
        },
        {
            "id": "solar-pro-3",
            "name": "Solar Pro 3",
            "provider": "Upstage",
            "apiModelId": "solar-pro-3",
            "version": "mock-2026-06",
            "pricing": {"inputPerMillion": 0.15, "outputPerMillion": 0.6},
            "leagueLanguages": ["en", "ko"],
            "mockStrength": {"en": 66, "ko": 73},
            "profile": {
                "mbti": "ISFJ",
                "tagline": "Korean-language anchor with careful social reads.",
                "quote": "Nuance matters most when everyone sounds certain.",
                "styleTags": ["Korean", "Grounded", "Social"],
                "strengths": ["Korean persuasion", "Role inference", "Concise vote framing"],
                "weaknesses": ["English tempo races", "High-chaos counterclaims"],
            },
        },
    ]


def judge_models() -> list[dict]:
    return [
        {
            "id": "judge-gemini-flash-lite",
            "name": "Gemini 2.5 Flash Lite Judge",
            "provider": "Google",
            "apiModelId": "gemini-2.5-flash-lite",
            "version": "mock-2026-06",
            "pricing": {"inputPerMillion": 0.1, "outputPerMillion": 0.4},
            "leaderboardEligible": False,
        },
    ]


def games() -> list[dict]:
    return [
        {
            "id": "werewolf-en",
            "name": "Werewolf - English",
            "category": "Social deduction",
            "description": "English scenario matches focused on persuasion, deception detection, and long-context vote reasoning.",
            "baseGameId": "werewolf",
            "languageCode": "en",
            "languageName": "English",
        },
        {
            "id": "werewolf-ko",
            "name": "늑대인간 - 한국어",
            "category": "Social deduction",
            "description": "Korean scenario matches focused on natural persuasion, role inference, and village discussion nuance.",
            "baseGameId": "werewolf",
            "languageCode": "ko",
            "languageName": "한국어",
        },
    ]


def public_models() -> list[dict]:
    return [
        {
            "id": model["id"],
            "name": model["name"],
            "provider": model["provider"],
            "version": model["version"],
            "profile": model["profile"],
        }
        for model in candidate_models()
    ]

