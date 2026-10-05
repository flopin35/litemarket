"""Each feature: try the language model, validate its JSON, fall back to the offline engine."""
from __future__ import annotations

import logging
import re

from pydantic import ValidationError

from . import offline, prompts
from .analytics import analyse, display_stats
from .llm import LLM, Image, LLMError, extract_json
from .schemas import (BroadcastIn, BroadcastOut, CoachIn, CoachOut, ProductWriterIn, ProductWriterOut,
                      ReplyDraftsIn, ReplyDraftsOut, ShopChatIn, ShopChatOut)

log = logging.getLogger("ai.features")


class Features:
    def __init__(self, llm: LLM):
        self.llm = llm

    def _ask(self, system: str, user: str, **kw) -> dict | None:
        if not self.llm.available:
            return None
        try:
            return extract_json(self.llm.complete(system, user, **kw))
        except LLMError as e:
            log.warning("AI provider failed, using offline engine: %s", e)
            return None

    # ── Product writer ─────────────────────────────────────────────────────────

    def product_writer(self, inp: ProductWriterIn) -> ProductWriterOut:
        image = Image(inp.image.media_type, inp.image.data) if inp.image else None
        user = prompts.as_json({
            "store": prompts.store_brief(inp.store),
            "product": inp.product.model_dump(),
            "photo_attached": image is not None,
        })
        data = self._ask(prompts.product_writer(inp.language, inp.tone), user, image=image, max_tokens=900)
        if data is not None:
            try:
                out = ProductWriterOut(**{**data, "engine": self.llm.engine})
                if out.category not in offline.CATEGORIES:
                    out.category = offline.normalise_category(out.category, inp.product.name, inp.product.notes)
                out.hashtags = [h if h.startswith("#") else "#" + h for h in out.hashtags][:8]
                return out
            except (ValidationError, TypeError) as e:
                log.warning("Product writer answer rejected: %s", e)
        return offline.write_product(inp)

    # ── Reply drafts ───────────────────────────────────────────────────────────

    def reply_drafts(self, inp: ReplyDraftsIn) -> ReplyDraftsOut:
        user = prompts.as_json({
            "store": prompts.store_brief(inp.store),
            "customer_message": inp.message,
            "order": inp.order.model_dump() if inp.order else None,
        })
        data = self._ask(prompts.reply_drafts(inp.language, inp.tone), user, max_tokens=900)
        if data is not None:
            try:
                return ReplyDraftsOut(**{**data, "engine": self.llm.engine})
            except (ValidationError, TypeError) as e:
                log.warning("Reply drafts answer rejected: %s", e)
        return offline.draft_replies(inp)

    # ── Shop chat ──────────────────────────────────────────────────────────────

    def shop_chat(self, inp: ShopChatIn) -> ShopChatOut:
        valid_ids = {p.id for p in inp.products if p.id is not None and p.available}
        transcript = "\n".join(
            f"{'Customer' if m.role == 'user' else 'Assistant'}: {m.content}" for m in inp.messages[-12:])
        cart = [p.name for p in inp.products if p.id in set(inp.cart)]
        user = (f"CATALOG ({inp.store.currency}):\n{prompts.catalog_lines(inp.products[:80], inp.store.currency)}\n\n"
                f"CART: {', '.join(cart) if cart else 'empty'}\n\n"
                f"CONVERSATION:\n{transcript}\n\nReply to the customer's last message.")
        data = self._ask(prompts.shop_chat(inp.store), user, fast=True, max_tokens=500)
        if data is not None:
            try:
                ids: list[int] = []
                for raw in data.get("suggestions") or []:
                    try:
                        value = int(re.sub(r"[^0-9]", "", str(raw)) or -1)
                    except ValueError:
                        continue
                    if value in valid_ids and value not in ids:
                        ids.append(value)
                return ShopChatOut(reply=str(data.get("reply", "")).strip(), suggestions=ids[:3],
                                   engine=self.llm.engine)
            except (ValidationError, TypeError) as e:
                log.warning("Shop chat answer rejected: %s", e)
        return offline.shop_chat(inp)

    # ── Sales coach ────────────────────────────────────────────────────────────

    def coach(self, inp: CoachIn) -> CoachOut:
        analysis = analyse(inp)
        rules = offline.coach(inp, analysis)
        user = prompts.as_json({
            "store": inp.store.name,
            "numbers": analysis.as_dict(),
            "findings": [i.model_dump() for i in rules.insights],
        })
        data = self._ask(prompts.coach(), user, max_tokens=1200)
        if data is not None:
            try:
                out = CoachOut(**{**data, "stats": display_stats(analysis), "engine": self.llm.engine})
                return out
            except (ValidationError, TypeError) as e:
                log.warning("Coach answer rejected: %s", e)
        return rules

    # ── Broadcast ──────────────────────────────────────────────────────────────

    def broadcast(self, inp: BroadcastIn) -> BroadcastOut:
        user = prompts.as_json({
            "store": prompts.store_brief(inp.store),
            "goal": inp.goal,
            "products": [{"name": p.name, "price": p.price, "category": p.category,
                          "description": (p.description or "")[:200]} for p in inp.products],
        })
        data = self._ask(prompts.broadcast(inp.language, inp.tone), user, max_tokens=700)
        if data is not None:
            try:
                return BroadcastOut(**{**data, "engine": self.llm.engine})
            except (ValidationError, TypeError) as e:
                log.warning("Broadcast answer rejected: %s", e)
        return offline.broadcast(inp)
