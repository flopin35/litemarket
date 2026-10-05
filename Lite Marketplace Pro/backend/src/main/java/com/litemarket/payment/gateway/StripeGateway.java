package com.litemarket.payment.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.litemarket.common.Money;
import com.litemarket.common.Tokens;
import com.litemarket.payment.gateway.GatewayModels.InitRequest;
import com.litemarket.payment.gateway.GatewayModels.InitResult;
import com.litemarket.payment.gateway.GatewayModels.PaymentRef;
import com.litemarket.payment.gateway.GatewayModels.VerifyResult;
import com.litemarket.payment.gateway.GatewayModels.WebhookEvent;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

/**
 * Stripe Checkout: cards, Apple Pay, Google Pay and local methods in 40+ countries.
 * Split payments use Stripe Connect destination charges.
 * Docs: https://docs.stripe.com/api/checkout/sessions
 */
public class StripeGateway implements PaymentGateway {

    private static final long TOLERANCE_SECONDS = 300;
    private static final Set<String> EVENTS = Set.of(
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
            "checkout.session.async_payment_failed",
            "checkout.session.expired");

    private final String secretKey;
    private final String webhookSecret;
    private final String baseUrl;
    private final HttpJson http;
    private final Clock clock;

    public StripeGateway(String secretKey, String webhookSecret, String baseUrl, HttpJson http, Clock clock) {
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        this.webhookSecret = webhookSecret == null ? "" : webhookSecret.trim();
        this.baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.stripe.com/v1" : baseUrl.replaceAll("/+$", "");
        this.http = http;
        this.clock = clock;
    }

    @Override public String id() { return "stripe"; }

    @Override public String label() { return "Card, Apple Pay & Google Pay"; }

    @Override public boolean enabled() { return !secretKey.isEmpty(); }

    private Map<String, String> auth() {
        return Map.of("Authorization", "Bearer " + secretKey);
    }

    @Override
    public InitResult initialize(InitRequest req) {
        String currency = req.currency().toLowerCase(Locale.ROOT);
        List<String[]> form = new ArrayList<>();
        form.add(new String[]{"mode", "payment"});
        form.add(new String[]{"success_url", withQuery(req.returnUrl(), "reference=" + HttpJson.enc(req.reference()))});
        form.add(new String[]{"cancel_url", req.cancelUrl()});
        form.add(new String[]{"client_reference_id", req.reference()});
        form.add(new String[]{"metadata[reference]", req.reference()});
        form.add(new String[]{"payment_intent_data[metadata][reference]", req.reference()});
        form.add(new String[]{"line_items[0][quantity]", "1"});
        form.add(new String[]{"line_items[0][price_data][currency]", currency});
        form.add(new String[]{"line_items[0][price_data][unit_amount]", String.valueOf(Money.toMinor(req.amount(), currency))});
        form.add(new String[]{"line_items[0][price_data][product_data][name]", req.title()});
        if (req.description() != null && !req.description().isBlank()) {
            form.add(new String[]{"line_items[0][price_data][product_data][description]", req.description()});
        }
        if (req.customerEmail() != null && !req.customerEmail().isBlank()) {
            form.add(new String[]{"customer_email", req.customerEmail()});
        }
        if (req.split() != null && req.split().destination() != null && !req.split().destination().isBlank()) {
            form.add(new String[]{"payment_intent_data[transfer_data][destination]", req.split().destination()});
            long fee = Money.toMinor(req.split().platformFee(), currency);
            if (fee > 0) form.add(new String[]{"payment_intent_data[application_fee_amount]", String.valueOf(fee)});
        }

        HttpJson.Response res = http.postForm(baseUrl + "/checkout/sessions", auth(), form);
        JsonNode json = res.json();
        if (!res.ok() || json.path("url").asText("").isEmpty()) {
            throw new GatewayException(json.path("error").path("message").asText("Stripe refused the payment (" + res.status() + ")"));
        }
        return new InitResult(json.path("url").asText(), json.path("id").asText());
    }

    @Override
    public VerifyResult verify(PaymentRef payment) {
        if (payment.providerRef() == null || payment.providerRef().isBlank()) {
            return VerifyResult.pending("Checkout was not started");
        }
        HttpJson.Response res = http.get(baseUrl + "/checkout/sessions/" + HttpJson.enc(payment.providerRef()), auth());
        JsonNode json = res.json();
        if (!res.ok()) {
            return VerifyResult.pending(json.path("error").path("message").asText("Not paid yet"));
        }
        String paymentStatus = json.path("payment_status").asText("");
        String currency = json.path("currency").asText(payment.currency()).toUpperCase(Locale.ROOT);
        if ("paid".equals(paymentStatus)) {
            return VerifyResult.success(Money.fromMinor(json.path("amount_total").asLong(), currency), currency,
                    json.path("payment_intent").asText(json.path("id").asText()));
        }
        if ("expired".equals(json.path("status").asText())) {
            return VerifyResult.failed("Checkout expired");
        }
        return VerifyResult.pending("Payment is " + (paymentStatus.isEmpty() ? "not finished" : paymentStatus));
    }

    @Override
    public Optional<WebhookEvent> parseWebhook(byte[] body, Function<String, String> header) {
        if (webhookSecret.isEmpty()) throw new WebhookSignatureException("STRIPE_WEBHOOK_SECRET is not set");
        String sigHeader = header.apply("Stripe-Signature");
        if (sigHeader == null) throw new WebhookSignatureException("Missing Stripe-Signature");

        String timestamp = null;
        List<String> signatures = new ArrayList<>();
        for (String part : sigHeader.split(",")) {
            String[] kv = part.trim().split("=", 2);
            if (kv.length != 2) continue;
            if (kv[0].equals("t")) timestamp = kv[1];
            if (kv[0].equals("v1")) signatures.add(kv[1]);
        }
        if (timestamp == null || signatures.isEmpty()) throw new WebhookSignatureException("Malformed Stripe-Signature");

        byte[] prefix = (timestamp + ".").getBytes(StandardCharsets.UTF_8);
        byte[] signed = new byte[prefix.length + body.length];
        System.arraycopy(prefix, 0, signed, 0, prefix.length);
        System.arraycopy(body, 0, signed, prefix.length, body.length);
        String expected = Tokens.hmacHex("HmacSHA256", webhookSecret, signed);
        boolean match = signatures.stream().anyMatch(s -> Tokens.constantTimeEquals(expected, s));
        if (!match) throw new WebhookSignatureException("Bad Stripe signature");

        long age;
        try {
            age = Math.abs(clock.instant().getEpochSecond() - Long.parseLong(timestamp));
        } catch (NumberFormatException e) {
            throw new WebhookSignatureException("Bad Stripe timestamp");
        }
        if (age > TOLERANCE_SECONDS) throw new WebhookSignatureException("Stripe webhook is too old");

        JsonNode json = http.parse(new String(body, StandardCharsets.UTF_8));
        String type = json.path("type").asText("");
        if (!EVENTS.contains(type)) return Optional.empty();
        JsonNode obj = json.path("data").path("object");
        String ref = obj.path("client_reference_id").asText(obj.path("metadata").path("reference").asText(""));
        return ref.isEmpty() ? Optional.empty() : Optional.of(new WebhookEvent(ref, type));
    }

    static String withQuery(String url, String query) {
        return url + (url.contains("?") ? "&" : "?") + query;
    }
}
