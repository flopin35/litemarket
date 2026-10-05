"""Language-model providers, called over plain HTTPS (no vendor SDKs needed).

- Claude (Anthropic)            ANTHROPIC_API_KEY
- OpenAI or any compatible API  OPENAI_API_KEY (+ OPENAI_BASE_URL for Groq, Together, Ollama...)
- Offline                       no key: the rule-based engine in offline.py answers instead
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Optional

import requests

from .config import Settings

log = logging.getLogger("ai.llm")

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"


class LLMError(RuntimeError):
    pass


@dataclass
class Image:
    media_type: str
    data: str  # base64


class LLM:
    """Picks a provider from settings and sends one prompt, returning the text answer."""

    def __init__(self, settings: Settings):
        self.s = settings
        choice = settings.provider
        if choice == "auto":
            if settings.anthropic_key:
                choice = "anthropic"
            elif settings.openai_key:
                choice = "openai"
            else:
                choice = "offline"
        if choice == "anthropic" and not settings.anthropic_key:
            log.warning("AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is empty; using offline engine")
            choice = "offline"
        if choice == "openai" and not settings.openai_key:
            log.warning("AI_PROVIDER=openai but OPENAI_API_KEY is empty; using offline engine")
            choice = "offline"
        self.provider = choice

    @property
    def available(self) -> bool:
        return self.provider in ("anthropic", "openai")

    @property
    def engine(self) -> str:
        return {"anthropic": "claude", "openai": "openai"}.get(self.provider, "offline")

    def model(self, fast: bool = False) -> str:
        if self.provider == "anthropic":
            return self.s.anthropic_fast_model if fast else self.s.anthropic_model
        if self.provider == "openai":
            return self.s.openai_model
        return "rules"

    def complete(self, system: str, user: str, *, image: Optional[Image] = None,
                 fast: bool = False, max_tokens: int = 1200) -> str:
        if self.provider == "anthropic":
            return self._anthropic(system, user, image, fast, max_tokens)
        if self.provider == "openai":
            return self._openai(system, user, image, max_tokens)
        raise LLMError("No AI provider configured")

    # ── Providers ──────────────────────────────────────────────────────────────

    def _anthropic(self, system: str, user: str, image: Optional[Image], fast: bool, max_tokens: int) -> str:
        content: list[dict] = []
        if image is not None:
            content.append({"type": "image",
                            "source": {"type": "base64", "media_type": image.media_type, "data": image.data}})
        content.append({"type": "text", "text": user})
        body = {
            "model": self.model(fast),
            "max_tokens": max_tokens,
            "system": system,
            "messages": [{"role": "user", "content": content}],
        }
        headers = {
            "x-api-key": self.s.anthropic_key,
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
        }
        try:
            r = requests.post(ANTHROPIC_URL, headers=headers, json=body, timeout=self.s.timeout)
        except requests.RequestException as e:
            raise LLMError(f"Claude unreachable: {e}") from e
        if r.status_code >= 400:
            raise LLMError(f"Claude error {r.status_code}: {r.text[:300]}")
        data = r.json()
        text = "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")
        if not text:
            raise LLMError("Claude returned no text")
        return text

    def _openai(self, system: str, user: str, image: Optional[Image], max_tokens: int) -> str:
        official = "api.openai.com" in self.s.openai_base_url
        if image is not None:
            user_content: object = [
                {"type": "text", "text": user},
                {"type": "image_url", "image_url": {"url": f"data:{image.media_type};base64,{image.data}"}},
            ]
        else:
            user_content = user
        body: dict = {
            "model": self.s.openai_model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_content}],
        }
        if official:
            body["max_completion_tokens"] = max_tokens
            body["response_format"] = {"type": "json_object"}
        else:
            body["max_tokens"] = max_tokens  # most OpenAI-compatible servers still use this name
        try:
            r = requests.post(f"{self.s.openai_base_url}/chat/completions",
                              headers={"Authorization": f"Bearer {self.s.openai_key}"},
                              json=body, timeout=self.s.timeout)
        except requests.RequestException as e:
            raise LLMError(f"OpenAI unreachable: {e}") from e
        if r.status_code >= 400:
            raise LLMError(f"OpenAI error {r.status_code}: {r.text[:300]}")
        try:
            return r.json()["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as e:
            raise LLMError("OpenAI returned an unexpected response") from e


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def extract_json(text: str) -> dict:
    """Pulls the first JSON object out of a model answer (tolerates ``` fences and chatter)."""
    cleaned = _FENCE.sub("", text.strip())
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end <= start:
        raise LLMError("No JSON object in the answer")
    try:
        value = json.loads(cleaned[start:end + 1])
    except json.JSONDecodeError as e:
        raise LLMError(f"Invalid JSON: {e}") from e
    if not isinstance(value, dict):
        raise LLMError("JSON answer is not an object")
    return value
