# Customizing and rebranding

## Name, logo and colours

| What | Where |
|---|---|
| Brand name (website) | `web/src/config.ts` → `BRAND`, and `<title>`/meta tags in `web/index.html` |
| Brand name (emails, payment pages) | `BRAND_NAME` in `.env` |
| Colours | `web/src/index.css` → the `--color-brand-*` scale in `@theme`. Change these 11 values and the whole site follows. |
| Logo | `Logo` in `web/src/components/bits.tsx` and `web/public/favicon.svg` |
| Font | Google Fonts link in `web/index.html` and `--font-sans` in `index.css` |
| Landing page text | `web/src/pages/landing/Landing.tsx` |

## Plans and prices

Paid plans live in `backend/src/main/resources/application.yml` under `app.plans.paid`:

```yaml
- code: MONTHLY      # stored on the shop, keep it stable
  name: Monthly      # shown to sellers
  price: 100         # in PLAN_CURRENCY
  days: 30
  popular: true      # highlighted card
```

Free-plan limits and AI credits are environment variables: `FREE_PRODUCT_LIMIT`, `FREE_AI_CREDITS`, `PAID_AI_CREDITS`. The pricing section on the landing page reads plans from the API, so it updates by itself (the fallback list in `Landing.tsx` is only used if the API is unreachable).

## Currency and country

- `PLAN_CURRENCY` is what sellers pay for plans (default `GHS`).
- Each shop picks its own currency in **My shop** (GHS, NGN, KES, ZAR, UGX, XOF, USD, EUR, GBP). Add more in `web/src/lib/constants.ts`. Make sure your payment gateway supports it.
- `DEFAULT_COUNTRY_CODE` turns local phone numbers into WhatsApp numbers (`024 123 4567` → `233241234567`).

## Product categories and AI languages

`web/src/lib/constants.ts` holds the category list, the AI tones and languages. If you add a category, also add keywords for it in `ai-service/app/offline.py` (`CATEGORY_KEYWORDS` and `COPY`) so the built-in engine recognises it.

## Emails

Email texts are short strings in `AuthService` (welcome, password reset), `OrderService` (new order) and `AdminService` (plan given). Set `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD` and `MAIL_FROM` to send them (any SMTP provider: Brevo, Mailgun, Gmail app password…).

## Demo data

- Server: `backend/src/main/java/com/litemarket/config/DemoDataSeeder.java`
- Browser demo mode: `web/src/lib/demo/mockApi.ts` (`seed()`)

## Adding a page to the seller dashboard

1. Create `web/src/pages/app/MyPage.tsx` (copy a small page such as `Billing.tsx`).
2. Add it to the `lazy` imports, the `nav` list and the `page` switch in `web/src/pages/app/AppShell.tsx`.
3. Add the API endpoint in a controller under `backend/src/main/java/com/litemarket/`.
