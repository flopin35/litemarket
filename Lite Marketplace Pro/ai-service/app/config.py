"""Settings, all from environment variables (see .env.example at the project root)."""
from __future__ import annotations

import os
from dataclasses import dataclass


def _env(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    return value.strip() if value and value.strip() else default


@dataclass(frozen=True)
class Settings:
    # "auto" picks Claude if ANTHROPIC_API_KEY is set, then OpenAI, else the built-in offline engine.
    provider: str
    anthropic_key: str
    anthropic_model: str
    anthropic_fast_model: str
    openai_key: str
    openai_model: str
    openai_base_url: str
    internal_key: str
    timeout: int

    @staticmethod
    def from_env() -> "Settings":
        return Settings(
            provider=_env("AI_PROVIDER", "auto").lower(),
            anthropic_key=_env("ANTHROPIC_API_KEY"),
            anthropic_model=_env("ANTHROPIC_MODEL", "claude-sonnet-5-5"),
            anthropic_fast_model=_env("ANTHROPIC_FAST_MODEL", "claude-haiku-4-5-20251001"),
            openai_key=_env("OPENAI_API_KEY"),
            openai_model=_env("OPENAI_MODEL", "gpt-5-mini"),
            openai_base_url=_env("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/"),
            internal_key=_env("AI_INTERNAL_KEY", "dev-internal-key"),
            timeout=int(_env("AI_TIMEOUT", "40")),
        )
