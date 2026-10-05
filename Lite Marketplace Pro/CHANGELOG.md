# Changelog

## 1.0.0 (October 2026)

First full-stack release, rebuilt from the Lite Marketplace Plain app.

- Java 21 / Spring Boot API: accounts, shops, products, orders, plans, admin, uploads
- Secure logins: BCrypt, JWT access tokens, rotating HttpOnly refresh tokens, password reset, rate limits
- Payments: Paystack, Flutterwave and Stripe with server-side verification, signed webhooks, split payments, commission and payouts ledger, plus a demo gateway
- Python AI service: product writer (with photo), shopper chat, reply drafts, sales coach, broadcast writer; Claude, OpenAI or built-in engine
- React website: animated landing page, seller dashboard, storefront with cart, WhatsApp and online checkout, admin panel, dark mode, browser demo mode
- Docker Compose deployment, documentation and automated tests
