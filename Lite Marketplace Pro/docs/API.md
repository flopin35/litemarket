# API reference

Base path: `/api`. JSON in and out. Errors look like `{"error": "CODE", "message": "Readable text", "fields": {...}}`.

Authenticated routes need `Authorization: Bearer <accessToken>`. Access tokens last 15 minutes; get a new one with `POST /api/auth/refresh` (uses the HttpOnly refresh cookie).

## Public

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/config` | Brand, plans, enabled payment options |
| GET | `/api/health` | `{"status":"ok"}` |
| POST | `/api/auth/signup` | `{email, password, storeName, whatsapp, fullName?}` → `{accessToken, expiresIn, me}` + cookie |
| POST | `/api/auth/login` | `{email, password}` |
| POST | `/api/auth/refresh` | Cookie only. Rotates the refresh token |
| POST | `/api/auth/logout` | Revokes the refresh token |
| POST | `/api/auth/forgot-password` | `{email}`. Always succeeds |
| POST | `/api/auth/reset-password` | `{token, password}` |
| GET | `/api/shops/{slug}` | Public shop: products, categories, payment options |
| POST | `/api/shops/{slug}/orders` | WhatsApp order: `{items:[{productId, quantity}], customer:{name, phone, email?, address, note?}}` → `{orderNumber, total, currency, whatsappUrl}` |
| POST | `/api/shops/{slug}/checkout` | Same body + `provider` → `{reference, checkoutUrl}` |
| POST | `/api/shops/{slug}/assistant` | `{messages:[{role, content}], cartProductIds?}` → `{reply, suggestions, engine}` |
| POST | `/api/payments/verify` | `{reference}` → payment status (asks the gateway) |
| POST | `/api/payments/demo/{reference}/complete` | Demo mode only |
| POST | `/api/webhooks/{paystack\|flutterwave\|stripe}` | Raw provider webhooks (signature checked) |

## Seller (logged in)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/me` | User, shop and plan |
| PUT | `/api/me/password` | `{currentPassword, newPassword}` |
| GET / PUT | `/api/store` | Shop settings |
| GET / POST | `/api/products` | List / create (Free plan limit → `402 PLAN_LIMIT`) |
| PUT / DELETE | `/api/products/{id}` | |
| POST | `/api/uploads` | multipart `file` (JPEG/PNG/WebP/GIF, 5 MB) → `{url}` |
| GET | `/api/orders?status=NEW` | |
| POST | `/api/orders` | Manual order |
| GET / PUT | `/api/orders/{id}` | |
| PATCH | `/api/orders/{id}/status` | `{status}`: NEW, PAID, DELIVERED, CANCELLED |
| GET | `/api/dashboard` | Totals, 7/30-day series, best sellers, recent orders |
| GET | `/api/billing` | Plans, current plan, history |
| POST | `/api/billing/checkout` | `{planCode, provider}` → `{reference, checkoutUrl}` |
| GET | `/api/ai/usage` | `{used, limit, premium}` |
| POST | `/api/ai/product-writer` | `{name, category?, price?, notes?, tone?, language?, imageUrl?}` |
| POST | `/api/ai/reply-drafts` | `{message, orderId?, tone?, language?}` |
| POST | `/api/ai/broadcast` | `{goal?, productIds?, tone?, language?}` |
| POST | `/api/ai/coach` | |

AI routes return `402 AI_CREDITS` when the month's credits are used up.

## Admin (role ADMIN)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/overview` | Totals and system status |
| GET | `/api/admin/sellers?q=` | |
| POST | `/api/admin/sellers/{storeId}/plan` | `{planCode}` (or `FREE`) |
| POST | `/api/admin/sellers/{storeId}/status` | `{status: ACTIVE\|SUSPENDED}` |
| PUT | `/api/admin/sellers/{storeId}/split` | `{paystackSubaccount, flutterwaveSubaccount, stripeAccount}` |
| GET | `/api/admin/payments` | Latest 200 |
| GET | `/api/admin/payouts` | Money owed per shop |
| POST | `/api/admin/payouts/{storeId}/paid` | Mark as paid out |
