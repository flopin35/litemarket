"""Run with:  python -m unittest discover -s tests -v   (from the ai-service folder)"""
from __future__ import annotations

import json
import os
import sys
import unittest
from datetime import date, timedelta
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from app.config import Settings  # noqa: E402
from app.llm import extract_json, LLMError  # noqa: E402

KEY = "test-key"


def settings(**over) -> Settings:
    base = dict(provider="offline", anthropic_key="", anthropic_model="claude-sonnet-5-5",
                anthropic_fast_model="claude-haiku-4-5-20251001", openai_key="", openai_model="gpt-5-mini",
                openai_base_url="https://api.openai.com/v1", internal_key=KEY, timeout=5)
    base.update(over)
    return Settings(**base)


STORE = {"name": "Ama's Kitchen", "currency": "GHS", "about": "Home-cooked meals",
         "shop_url": "https://shop.test/s/amas-kitchen", "whatsapp_orders": True, "online_payments": True}

CATALOG = [
    {"id": 1, "name": "Jollof Rice & Grilled Chicken", "price": 45, "category": "Food",
     "description": "Smoky party jollof", "available": True, "featured": True},
    {"id": 2, "name": "Waakye Special", "price": 35, "category": "Food", "description": "With gari and shito",
     "available": True},
    {"id": 3, "name": "Sobolo (500ml)", "price": 12, "category": "Drinks", "description": "Hibiscus and ginger",
     "available": True},
    {"id": 4, "name": "Fresh Pineapple Juice", "price": 15, "category": "Drinks", "description": "Pressed",
     "available": False},
    {"id": 5, "name": "Kelewele", "price": 15, "category": "Snacks", "description": "Spicy plantain",
     "available": True},
]


def daily(values: list[tuple[float, int]]) -> list[dict]:
    today = date(2026, 10, 5)
    n = len(values)
    return [{"date": (today - timedelta(days=n - 1 - i)).isoformat(), "revenue": v, "orders": o}
            for i, (v, o) in enumerate(values)]


class Base(unittest.TestCase):
    provider_settings: dict = {}

    def setUp(self):
        self.app = create_app(settings(**self.provider_settings))
        self.client = self.app.test_client()

    def post(self, path: str, body: dict, key: str | None = KEY):
        headers = {"X-Internal-Key": key} if key is not None else {}
        return self.client.post(path, data=json.dumps(body), headers=headers, content_type="application/json")


class OfflineEngineTest(Base):

    def test_health_is_public(self):
        r = self.client.get("/health")
        self.assertEqual(200, r.status_code)
        self.assertEqual("offline", r.get_json()["engine"])

    def test_internal_key_is_required(self):
        self.assertEqual(401, self.post("/v1/broadcast", {"store": STORE}, key=None).status_code)
        self.assertEqual(401, self.post("/v1/broadcast", {"store": STORE}, key="wrong").status_code)

    def test_validation_errors_are_readable(self):
        r = self.post("/v1/product-writer", {"store": STORE, "product": {"name": ""}})
        self.assertEqual(422, r.status_code)
        self.assertIn("product.name", r.get_json()["message"])
        self.assertEqual(400, self.client.post("/v1/coach", data="nope", headers={"X-Internal-Key": KEY}).status_code)

    def test_product_writer(self):
        r = self.post("/v1/product-writer", {"store": STORE, "product": {
            "name": "jollof rice with grilled chicken", "price": 45, "notes": "Spicy, comes with salad\nServes one"},
            "tone": "friendly"})
        self.assertEqual(200, r.status_code)
        out = r.get_json()
        self.assertEqual("Jollof Rice with Grilled Chicken", out["title"])
        self.assertEqual("Food", out["category"])
        self.assertIn("GHS 45.00", out["caption"])
        self.assertIn("https://shop.test/s/amas-kitchen", out["caption"])
        self.assertEqual(["Spicy", "Comes with salad", "Serves one"], out["bullets"])
        self.assertIn("#AmasKitchen", out["hashtags"])
        self.assertEqual("offline", out["engine"])

    def test_product_writer_guesses_categories(self):
        for name, cat in [("Nike Air sneakers", "Shoes"), ("Shea body butter", "Beauty"),
                          ("iPhone 13 charger", "Phones & gadgets"), ("Kente dress", "Clothes"),
                          ("Mystery box", "Other")]:
            out = self.post("/v1/product-writer", {"store": STORE, "product": {"name": name}}).get_json()
            self.assertEqual(cat, out["category"], name)

    def test_professional_tone_has_no_emoji(self):
        out = self.post("/v1/product-writer", {"store": STORE, "product": {"name": "Leather bag", "price": 300},
                                               "tone": "professional"}).get_json()
        self.assertFalse(any(ord(ch) > 0x2000 for ch in out["caption"]), out["caption"])

    def test_reply_drafts_detect_intent(self):
        cases = {
            "How much is the jollof?": "price",
            "Do you deliver to Tema?": "delivery",
            "My food came cold and late!!": "complaint",
            "Thank you, it was delicious": "thanks",
            "Can I pay with momo?": "payment",
            "Hello": "greeting",
        }
        for message, intent in cases.items():
            out = self.post("/v1/reply-drafts", {"store": STORE, "message": message}).get_json()
            self.assertEqual(intent, out["intent"], message)
            self.assertEqual(["Quick", "Friendly", "Detailed"], [d["label"] for d in out["drafts"]])

    def test_reply_drafts_use_order_context(self):
        out = self.post("/v1/reply-drafts", {"store": STORE, "message": "Where is my order?", "order": {
            "number": "LM-7KQ2XA", "status": "PAID", "total": 90, "customer_name": "Kofi Boateng",
            "address": "Osu"}}).get_json()
        friendly = out["drafts"][1]["text"]
        self.assertIn("Hi Kofi", friendly)
        self.assertIn("LM-7KQ2XA", friendly)
        self.assertIn("paid and being prepared", friendly)
        self.assertIn("Osu", friendly)

    def chat(self, text: str) -> dict:
        r = self.post("/v1/shop-chat", {"store": STORE, "products": CATALOG,
                                        "messages": [{"role": "user", "content": text}]})
        self.assertEqual(200, r.status_code)
        return r.get_json()

    def test_shop_chat_finds_products(self):
        out = self.chat("Do you have jollof?")
        self.assertEqual(1, out["suggestions"][0])
        out = self.chat("how much is waakye")
        self.assertIn("Waakye Special is GHS 35.00", out["reply"])
        self.assertEqual(2, out["suggestions"][0])

    def test_shop_chat_budget_and_cheapest(self):
        out = self.chat("something under 20 cedis")
        self.assertTrue(set(out["suggestions"]) <= {3, 5})
        self.assertNotIn(4, out["suggestions"])  # sold out
        out = self.chat("cheapest drink")
        self.assertEqual([3], out["suggestions"])

    def test_shop_chat_pairs_within_budget(self):
        out = self.chat("I have 60 cedis, what goes well with jollof?")
        self.assertEqual(1, out["suggestions"][0])
        self.assertIn("within GHS 60.00", out["reply"])
        self.assertTrue(set(out["suggestions"][1:]) <= {3, 5})

    def test_shop_chat_sold_out_and_info(self):
        out = self.chat("I want pineapple juice")
        self.assertIn("sold out", out["reply"])
        self.assertNotIn(4, out["suggestions"])
        self.assertIn("delivery", self.chat("Do you deliver to Madina?")["reply"].lower())
        self.assertIn("Mobile Money", self.chat("can I pay with momo")["reply"])
        greet = self.chat("hello")
        self.assertIn("Welcome", greet["reply"])
        self.assertEqual(1, greet["suggestions"][0])

    def test_coach_with_sales(self):
        prev = [(0, 0)] * 46 + [(50, 1)] * 7          # 7 days, 350 total
        last = [(80, 2), (60, 1), (90, 2), (50, 1), (70, 2), (100, 2), (40, 1)]   # 490 total
        products = [dict(p) for p in CATALOG]
        products[0].update(units_30=20, units_7=6, revenue_30=900, created_days_ago=40)
        products[1].update(units_30=8, units_7=2, revenue_30=280, created_days_ago=40)
        products[3].update(units_30=5, units_7=1, revenue_30=75, created_days_ago=40)   # sold out but selling
        products[4].update(units_30=0, created_days_ago=30)                               # slow mover
        r = self.post("/v1/coach", {"store": {**STORE, "premium": False, "product_limit": 5, "product_count": 5},
                                    "products": products, "daily": daily(prev + last),
                                    "status_counts": {"NEW": 2, "PAID": 10, "DELIVERED": 20, "PENDING_PAYMENT": 1},
                                    "channel_counts": {"WHATSAPP": 28, "ONLINE": 5}, "stale_new_orders": 2})
        self.assertEqual(200, r.status_code)
        out = r.get_json()
        self.assertIn("up 40%", out["headline"])
        titles = " | ".join(i["title"] for i in out["insights"])
        self.assertIn("Restock Fresh Pineapple Juice", titles)
        self.assertIn("2 orders waiting", titles)
        self.assertEqual("high", out["insights"][0]["impact"])
        self.assertEqual("GHS 490.00", out["stats"][0]["value"])
        self.assertEqual("+40%", out["stats"][0]["trend"])
        self.assertTrue(1 <= len(out["actions"]) <= 3)

    def test_coach_empty_shop(self):
        out = self.post("/v1/coach", {"store": {**STORE, "product_count": 0}, "products": [],
                                      "daily": daily([(0, 0)] * 60)}).get_json()
        self.assertIn("first sale", out["headline"])
        self.assertEqual("Add your first products", out["insights"][0]["title"])

    def test_broadcast(self):
        out = self.post("/v1/broadcast", {"store": STORE, "products": CATALOG[:3],
                                          "goal": "Weekend special on jollof"}).get_json()
        self.assertIn("Jollof Rice & Grilled Chicken: GHS 45.00", out["message"])
        self.assertIn("https://shop.test/s/amas-kitchen", out["message"])
        self.assertLessEqual(len(out["short"]), 280)


def anthropic_reply(payload: dict) -> mock.Mock:
    r = mock.Mock(status_code=200)
    r.json.return_value = {"content": [{"type": "text", "text": "```json\n" + json.dumps(payload) + "\n```"}]}
    r.text = ""
    return r


class ClaudeProviderTest(Base):
    provider_settings = {"provider": "auto", "anthropic_key": "sk-ant-test"}

    def test_health_reports_claude(self):
        self.assertEqual("claude", self.client.get("/health").get_json()["engine"])

    def test_uses_claude_and_validates(self):
        answer = {"reply": "Try our Sobolo, it's GHS 12!", "suggestions": [3, 4, 999, "5"]}
        with mock.patch("app.llm.requests.post", return_value=anthropic_reply(answer)) as post:
            out = self.post("/v1/shop-chat", {"store": STORE, "products": CATALOG,
                                              "messages": [{"role": "user", "content": "a drink?"}]}).get_json()
        self.assertEqual("claude", out["engine"])
        self.assertEqual([3, 5], out["suggestions"])   # sold-out 4 and unknown 999 removed
        sent = post.call_args.kwargs
        self.assertEqual("sk-ant-test", sent["headers"]["x-api-key"])
        self.assertEqual("2023-06-01", sent["headers"]["anthropic-version"])
        self.assertEqual("claude-haiku-4-5-20251001", sent["json"]["model"])  # fast model for chat
        self.assertIn("CATALOG", sent["json"]["messages"][0]["content"][-1]["text"])

    def test_photo_is_sent_to_claude(self):
        answer = {"title": "Kente Dress", "description": "Bold and beautiful.", "bullets": ["Handwoven"],
                  "caption": "New in!", "hashtags": ["Kente", "#Style"], "category": "clothes"}
        with mock.patch("app.llm.requests.post", return_value=anthropic_reply(answer)) as post:
            out = self.post("/v1/product-writer", {"store": STORE, "product": {"name": "Kente dress"},
                                                   "image": {"media_type": "image/png", "data": "aGVsbG8="}}).get_json()
        self.assertEqual("claude", out["engine"])
        self.assertEqual("Clothes", out["category"])
        self.assertEqual(["#Kente", "#Style"], out["hashtags"])
        content = post.call_args.kwargs["json"]["messages"][0]["content"]
        self.assertEqual("image", content[0]["type"])
        self.assertEqual("claude-sonnet-5-5", post.call_args.kwargs["json"]["model"])

    def test_bad_answers_fall_back_to_offline(self):
        bad = mock.Mock(status_code=200)
        bad.json.return_value = {"content": [{"type": "text", "text": "Sorry, I can't help with that."}]}
        with mock.patch("app.llm.requests.post", return_value=bad):
            out = self.post("/v1/broadcast", {"store": STORE, "products": CATALOG[:2]}).get_json()
        self.assertEqual("offline", out["engine"])
        down = mock.Mock(status_code=529, text="overloaded")
        with mock.patch("app.llm.requests.post", return_value=down):
            out = self.post("/v1/reply-drafts", {"store": STORE, "message": "How much?"}).get_json()
        self.assertEqual("offline", out["engine"])
        invalid = anthropic_reply({"intent": "price", "drafts": []})   # fails validation (needs 1+ drafts)
        with mock.patch("app.llm.requests.post", return_value=invalid):
            out = self.post("/v1/reply-drafts", {"store": STORE, "message": "How much?"}).get_json()
        self.assertEqual("offline", out["engine"])

    def test_coach_keeps_computed_stats(self):
        answer = {"headline": "Great week", "summary": "Sales grew.",
                  "insights": [{"title": "Jollof leads", "detail": "Keep it on top.", "impact": "high", "kind": "growth"}],
                  "actions": ["Post jollof on Status"], "stats": [{"label": "fake", "value": "999"}]}
        with mock.patch("app.llm.requests.post", return_value=anthropic_reply(answer)):
            out = self.post("/v1/coach", {"store": STORE, "products": CATALOG,
                                          "daily": daily([(10, 1)] * 30)}).get_json()
        self.assertEqual("claude", out["engine"])
        self.assertEqual("Sales, last 7 days", out["stats"][0]["label"])   # model can't override numbers


class OpenAIProviderTest(Base):
    provider_settings = {"provider": "openai", "openai_key": "sk-test"}

    def test_uses_openai_json_mode(self):
        r = mock.Mock(status_code=200)
        r.json.return_value = {"choices": [{"message": {"content": json.dumps(
            {"message": "Weekend jollof!", "short": "Jollof GHS 45"})}}]}
        with mock.patch("app.llm.requests.post", return_value=r) as post:
            out = self.post("/v1/broadcast", {"store": STORE, "products": CATALOG[:1]}).get_json()
        self.assertEqual("openai", out["engine"])
        body = post.call_args.kwargs["json"]
        self.assertEqual({"type": "json_object"}, body["response_format"])
        self.assertEqual("gpt-5-mini", body["model"])
        self.assertTrue(post.call_args.args[0].endswith("/chat/completions"))


class HelpersTest(unittest.TestCase):

    def test_extract_json(self):
        self.assertEqual({"a": 1}, extract_json('Here you go:\n```json\n{"a": 1}\n```'))
        with self.assertRaises(LLMError):
            extract_json("no json here")


if __name__ == "__main__":
    unittest.main()
