# Lite Marketplace

**A complete WhatsApp-commerce platform: online shops, WhatsApp orders, Mobile Money & card payments, and an AI sales assistant.**

Sellers sign up, add products and get a beautiful shop at `yourdomain.com/s/their-shop`. Customers order on WhatsApp or pay online with Paystack, Flutterwave or Stripe. An AI assistant writes product listings (even from a photo), chats with shoppers, drafts replies to customers, writes broadcasts and coaches sellers on what to do next. You run it as a marketplace: sellers pay you for plans, and you can take a commission on every order.

| | |
|---|---|
| **Website** | React 19, TypeScript, Tailwind CSS 4, Vite. Animated, mobile-first, dark mode. |
| **API** | Java 21, Spring Boot 3.5, Spring Security, JPA. PostgreSQL in production, H2 for zero-setup local runs. |
| **AI service** | Python 3.11+, Flask, Pydantic. Claude (Anthropic), OpenAI or any OpenAI-compatible model, plus a built-in engine that works with no API key. |
| **Payments** | Paystack, Flutterwave, Stripe, with signed webhooks, split payments and a payouts ledger. |
| **Deploy** | One `docker compose up`. Or deploy the website alone in demo mode to Netlify for a free live demo. |

---

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [How it fits together](#how-it-fits-together)
- [Project structure](#project-structure)
- [Tests](#tests)
- [Security](#security)
- [Documentation](#documentation)

---

## Features

### For sellers
- **Shop in two minutes**: sign up with a shop name and WhatsApp number; the shop link is live immediately.
- **Products** with photo upload (drag & drop), categories, stock counts (auto-decrease on paid orders), "featured" and "sold out".
- **Orders inbox**: every WhatsApp and online order is saved automatically; status flow New → Paid → Delivered (or Cancelled, which puts stock back); add phone/walk-in orders by hand.
- **Dashboard**: total sales, this week, orders, average order, animated 7/30-day chart, best sellers, latest orders, plan usage.
- **Shop branding**: logo, brand colour, about text, custom shop address, live preview, one-tap WhatsApp share.
- **Plans & billing**: Free plan (5 products) and paid plans (weekly → 5 months), paid by MoMo/card, days stack on top of remaining time.

### AI assistant (Python service)
- **Product writer**: title, description, bullet points, WhatsApp/Instagram caption and hashtags, in 11 languages and 4 tones. Reads the product **photo** with vision models.
- **Shopper chat** on every shop: answers questions, finds products within a budget, suggests add-ons, with "Add to cart" buttons in the chat.
- **Reply helper**: paste a customer's message, get three replies (Quick, Friendly, Detailed) that use the order's details, and send with one tap.
- **Sales coach**: week-over-week trend, best sellers, items to restock, slow movers, waiting orders, best weekday, pricing hints, with a to-do list. All numbers are computed in code; the model only explains them.
- **Broadcast writer**: WhatsApp broadcast + Status text featuring your products and prices.
- **AI credits** per plan, reset monthly, refunded automatically if the AI call fails.
- **Works without an API key**: a rule-based engine answers every feature, and takes over if the AI provider is down.

### For customers
- Fast, animated storefront: search, categories, "Popular right now", product details, cart drawer, low-stock badges.
- **Checkout**: pay now (Paystack, Flutterwave, Stripe) or **send the order on WhatsApp** as a neat, numbered message.
- Thank-you page that confirms the payment with the provider and links straight to the seller's WhatsApp.

### For you (the platform owner)
- **Admin panel**: accounts, shops, paying shops, plan revenue, order volume, money owed to sellers, system status checks.
- **Sellers**: search, give a plan by hand (cash/MoMo paid directly), suspend/activate, set split-payment sub-accounts.
- **Payments log** and **Payouts**: what the platform collected for each seller, and "mark as paid".
- **Commission** on customer orders (`COMMISSION_PERCENT`), sent automatically through Paystack/Flutterwave sub-accounts or Stripe Connect.
- **White-label**: brand name, colours and plans come from config. See [docs/CUSTOMIZE.md](docs/CUSTOMIZE.md).

### Quality details
- Animations without heavy libraries: scroll reveals, count-ups, animated charts, page transitions, fly-to-cart, toasts, skeleton loaders. Respects "reduce motion".
- Dark mode, mobile bottom navigation, accessible focus states, readable error messages.
- **Demo mode**: the whole website runs in the browser with sample data and simulated payments, so you can host a free live demo.

---

## Quick start

### Option A: everything with Docker (recommended)

Needs [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
cp .env.example .env          # Windows: copy .env.example .env
docker compose up --build
```

Open **http://localhost:8080**. The first start downloads dependencies and takes a few minutes.

### Option B: just look at it (no backend)

Needs [Node.js 20.19+](https://nodejs.org).

```bash
cd web
npm install
npm run dev -- --mode demo     # http://localhost:5173, sample data, simulated payments
```

### Option C: the ready-made demo site

The `demo-site` folder delivered with this project is a finished demo build. Drag it onto [Netlify Drop](https://app.netlify.com/drop) to get a free public demo link in seconds. Rebuild it any time with `cd web && npm run build:demo`.

### Option D: run each part yourself

See [docs/SETUP.md](docs/SETUP.md) (Java 21 + Maven, Python 3.11+, Node 20.19+).

---

## Demo accounts

Created automatically on an empty database (`DEMO_SEED=true`):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@litemarket.dev` | `admin12345` (set `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
| Seller (Ama's Kitchen) | `demo@litemarket.dev` | `demo12345` |

Demo shop: **/s/amas-kitchen**. With `PAYMENTS_DEMO_MODE=true`, a "Demo payment" option simulates paying so you can test checkout and upgrades end to end. **Turn demo mode and the demo seed off in production.**

---

## How it fits together

```
 Browser ──► web (React, nginx)
               │  /api, /uploads
               ▼
             api (Java, Spring Boot) ──► PostgreSQL
               │        ▲
               │        └── webhooks ◄── Paystack / Flutterwave / Stripe
               │ X-Internal-Key
               ▼
             ai (Python, Flask) ──► Claude / OpenAI (optional)
```

- The website only talks to the Java API. The AI service is private: provider keys never reach the browser.
- A payment only counts after the API **asks the provider directly** (server to server) and checks the amount and currency. Webhooks are verified with each provider's signature, and an atomic database update makes sure a plan or order is delivered exactly once even if the redirect and the webhook arrive together.

---

## Project structure

```
backend/        Java 21 + Spring Boot API
  src/main/java/com/litemarket/
    auth/       sign up, log in, JWT, refresh tokens, password reset
    store/ product/ order/ shop/    shops, products, orders, public storefront
    payment/    PaymentService, webhooks, gateway/ (Paystack, Flutterwave, Stripe, Demo)
    ai/         calls the AI service and meters AI credits
    admin/      admin panel endpoints
    plan/ upload/ mail/ config/ common/
  src/test/     unit tests + a full end-to-end Spring test
ai-service/     Python AI service (Flask)
  app/          llm.py (providers), features.py, offline.py (built-in engine), analytics.py, prompts.py
  tests/
web/            React website
  src/pages/    landing/, auth/, app/ (dashboard), shop/ (storefront), pay/
  src/components/  UI kit, animations, charts
  src/lib/      API client, auth, router, cart, demo/ (in-browser mock API)
docs/           setup, payments, AI, deploy, customize, API, selling guide
screenshots/    18 ready-made screenshots for your sales listing
docker-compose.yml
.env.example
```

---

## Tests

```bash
cd backend && mvn test                                   # Java: unit tests + full journey on an in-memory DB
cd ai-service && python -m unittest discover -s tests    # Python: 22 tests, providers mocked
cd web && npm run typecheck && npm run build             # TypeScript strict mode + production build
```

The Java suite includes `FullFlowTest`, which boots the real application and walks the main journey: sign up → add products → customer orders on WhatsApp → customer pays online → stock goes down → seller upgrades → admin endpoints. Payment gateway tests check request building, response parsing and webhook signatures for all three providers without calling the internet.

---

## Security

- Passwords hashed with **BCrypt**. Short-lived **JWT** access tokens (15 min) in memory; refresh tokens are random, stored as SHA-256 hashes, kept in an **HttpOnly, SameSite** cookie and **rotated** on every use. Reusing an old refresh token ends all of that user's sessions.
- Rate limits on login, sign-up, password reset, checkout, uploads and the AI chat.
- Uploads are checked by their file signature (JPEG/PNG/WebP/GIF only, 5 MB max) and saved under random names.
- Prices always come from the database, never from the browser. Payments are verified with the provider, amount and currency included.
- Webhook signatures: Paystack HMAC-SHA512, Flutterwave secret hash (and HMAC-SHA256), Stripe HMAC-SHA256 with timestamp tolerance.
- Admin routes are role-protected; the public shop API never exposes emails, keys or plan details.

Before going live, follow the checklist in [docs/DEPLOY.md](docs/DEPLOY.md#go-live-checklist).

---

## Documentation

| Guide | What's in it |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Run each part locally (Windows, macOS, Linux) |
| [docs/PAYMENTS.md](docs/PAYMENTS.md) | Paystack, Flutterwave and Stripe keys, webhooks, test cards, split payments, commission |
| [docs/AI.md](docs/AI.md) | Claude/OpenAI setup, models, credits, the built-in engine, editing prompts |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Deploy to a VPS with HTTPS, free demo on Netlify, go-live checklist |
| [docs/CUSTOMIZE.md](docs/CUSTOMIZE.md) | Rebrand, change plans and prices, currencies, add a payment gateway |
| [docs/API.md](docs/API.md) | Every endpoint |
| [docs/SELLING.md](docs/SELLING.md) | How to package, demo and sell this template |

---

Originally created by **Wilson Makafui** as Lite Marketplace (HTML + Firebase, then Plain), rebuilt as a full-stack platform.
See [LICENSE.md](LICENSE.md).
