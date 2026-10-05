# The AI assistant

The AI lives in its own small Python service (`ai-service/`). Only the Java API talks to it, using the shared `AI_INTERNAL_KEY`. Provider keys stay on the server and never reach a browser.

## Features and where they're used

| Endpoint | Used by | What it does |
|---|---|---|
| `POST /v1/product-writer` | Products → "Write it with AI" | Title, description, bullets, caption, hashtags and category. Reads the product photo with vision models. |
| `POST /v1/shop-chat` | The "Ask us" bubble on every shop | Answers shoppers using only the shop's real catalog, suggests products (with Add buttons). |
| `POST /v1/reply-drafts` | Orders → AI reply helper, AI assistant → Replies | Three replies to a customer message, using the order's details. |
| `POST /v1/coach` | AI assistant → Sales coach | Headline, summary, insights and a to-do list from the last 60 days. |
| `POST /v1/broadcast` | AI assistant → Broadcast | WhatsApp broadcast + Status text for chosen products. |

## Choosing a provider

```env
AI_PROVIDER=auto          # auto | anthropic | openai | offline
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5-5               # product writer, coach, replies, broadcast
ANTHROPIC_FAST_MODEL=claude-haiku-4-5-20251001  # shopper chat (fast and cheap)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_BASE_URL=https://api.openai.com/v1       # or any OpenAI-compatible server
```

`auto` uses Claude when `ANTHROPIC_API_KEY` is set, otherwise OpenAI when `OPENAI_API_KEY` is set, otherwise the built-in engine. Model names change over time: check your provider's model list and update the variables. `GET /health` on the AI service shows which engine and model are active.

## The built-in engine

`app/offline.py` answers every feature with rules and templates: category detection, intent detection for customer messages, budget and keyword search for the shop chat, and analytics-based coaching. It means:

- the template works the moment it's installed, with no account or bill;
- if the AI provider is slow, down or returns something invalid, users still get a good answer.

Each response includes `engine` (`claude`, `openai` or `offline`), shown as a small badge in the UI.

## Keeping answers trustworthy

- Every prompt asks for **strict JSON**, which is validated with Pydantic. Anything invalid falls back to the built-in engine.
- The shop chat only recommends products from the catalog it was given; suggested product IDs are checked against the real, in-stock catalog.
- Prompts tell the model to use only the facts provided (no invented prices, fees or policies) and to treat customer text as information, not instructions.
- The sales coach's numbers are calculated in `analytics.py`; the model only explains them, and its own numbers are never shown.

## AI credits and cost control

Each AI call uses one credit from the seller's monthly allowance: `FREE_AI_CREDITS` (default 50) on Free and `PAID_AI_CREDITS` (default 2000) on paid plans. Credits reset on the 1st of each month and are refunded if the AI call fails. The shopper chat uses the shop's credits and is also rate-limited per visitor. When a shop runs out, shoppers get a polite message pointing them to WhatsApp ordering.

## Changing the prompts

All prompts are in `ai-service/app/prompts.py`. Change the tone, add rules, or add languages (the list shown in the UI is in `web/src/lib/constants.ts`). Run the tests afterwards:

```bash
cd ai-service && python -m unittest discover -s tests -v
```
