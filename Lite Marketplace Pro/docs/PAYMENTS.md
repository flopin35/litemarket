# Payments

Lite Marketplace supports **Paystack**, **Flutterwave** and **Stripe** at the same time. A gateway switches on as soon as its secret key is set; customers and sellers then see it as a payment option. With `PAYMENTS_DEMO_MODE=true` a **Demo payment** option is also shown, which simulates a successful payment (no money moves).

Two kinds of payments use the same machinery:

| | Who pays | What happens when it's confirmed |
|---|---|---|
| **Plan** | A seller upgrading | The plan's days are added on top of any days left |
| **Order** | A customer at checkout | The order becomes Paid, stock goes down, the seller gets an email |

## How a payment is confirmed

1. The API creates a payment with a unique reference (`SUB-…` or `PAY-…`) and asks the gateway for a checkout page.
2. The customer pays on the gateway's page and is sent back to the website.
3. The website calls `POST /api/payments/verify`. The API **asks the gateway directly** whether that reference was paid, and checks the **amount and currency**.
4. The gateway also sends a **webhook**. Its signature is checked, then step 3 runs again.
5. A single database update marks the payment successful only once, so the plan or order is never delivered twice.

Nothing is trusted from the browser: prices come from the database and success comes from the gateway.

## Paystack

1. Create an account at [paystack.com](https://paystack.com) (Ghana, Nigeria, Kenya, South Africa, Côte d'Ivoire).
2. **Settings → API Keys & Webhooks**: copy the **test secret key** (`sk_test_…`) into `PAYSTACK_SECRET_KEY`.
3. Set the **Test Webhook URL** to `https://YOUR-DOMAIN/api/webhooks/paystack`.
4. Pay with the test cards and test Mobile Money numbers from [Paystack's test payments page](https://paystack.com/docs/payments/test-payments).
5. When it works, switch to the live key (`sk_live_…`) and the live webhook URL.

Paystack needs the customer's email, so the checkout asks for it when Paystack is chosen.

## Flutterwave

1. Create an account at [flutterwave.com](https://flutterwave.com).
2. **Settings → API keys**: copy the **secret key** (`FLWSECK_TEST-…`) into `FLUTTERWAVE_SECRET_KEY`.
3. **Settings → Webhooks**: URL `https://YOUR-DOMAIN/api/webhooks/flutterwave`. Type any long random text as the **secret hash**, and put the same text in `FLUTTERWAVE_WEBHOOK_HASH`.
4. Test with the cards and Mobile Money numbers in Flutterwave's developer docs, then switch to live keys.

Both the classic `verif-hash` header and the newer `flutterwave-signature` (HMAC-SHA256) are supported.

## Stripe

1. Create an account at [stripe.com](https://stripe.com). Check that your Stripe country supports the currency your shops use.
2. **Developers → API keys**: copy the **secret key** (`sk_test_…`) into `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**: `https://YOUR-DOMAIN/api/webhooks/stripe`, events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.
   Copy the **signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.
4. Test card: `4242 4242 4242 4242`, any future date, any CVC.

## Commission and split payments

Set `COMMISSION_PERCENT` (for example `5`) to keep a share of every customer order.

How the seller gets their share depends on whether you gave the shop a **sub-account** (Admin → Sellers → Split):

| Gateway | Sub-account field | What happens |
|---|---|---|
| Paystack | Subaccount code `ACCT_…` | Paystack sends the seller's share to them directly; you keep the commission (`transaction_charge`). |
| Flutterwave | Subaccount ID `RS_…` | The seller's sub-account gets exactly their share (`flat_subaccount`). |
| Stripe | Connected account `acct_…` | Destination charge with an `application_fee_amount` (needs Stripe Connect). |
| None set | – | The platform receives the money. It appears under **Admin → Payouts** until you pay the seller and press "Mark paid". |

## Testing webhooks on your own computer

Gateways can't reach `localhost`. Use a tunnel such as `cloudflared tunnel --url http://localhost:8080` or `ngrok http 8080`, then use the tunnel address in the webhook settings. The redirect back to your site uses `WEB_BASE_URL`, so payments still confirm without webhooks while you develop.

## Adding another gateway (Hubtel, M-Pesa, PayPal…)

Create a class in `backend/src/main/java/com/litemarket/payment/gateway/` that implements `PaymentGateway` (initialize, verify, parseWebhook), then add it to the list in `GatewayRegistry`. Use `PaystackGateway` as the example and copy `GatewaysTest` for its tests. Nothing else needs to change.
