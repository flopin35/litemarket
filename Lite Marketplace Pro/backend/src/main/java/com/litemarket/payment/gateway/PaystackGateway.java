package com.litemarket.payment.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.litemarket.common.Money;
import com.litemarket.common.Tokens;
import com.litemarket.payment.gateway.GatewayModels.InitRequest;
import com.litemarket.payment.gateway.GatewayModels.InitResult;
import com.litemarket.payment.gateway.GatewayModels.PaymentRef;
import com.litemarket.payment.gateway.GatewayModels.VerifyResult;
import com.litemarket.payment.gateway.GatewayModels.WebhookEvent;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

/**
 * Paystack (Ghana, Nigeria, Kenya, South Africa, Côte d'Ivoire): Mobile Money, cards, bank, USSD.
 * Docs: https://paystack.com/docs/api/transaction
 */
public class PaystackGateway implements PaymentGateway {

    private final String secretKey;
    private final String baseUrl;
    private final HttpJson http;

    public PaystackGateway(String secretKey, String baseUrl, HttpJson http) {
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        this.baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.paystack.co" : baseUrl.replaceAll("/+$", "");
        this.http = http;
    }

    @Override public String id() { return "paystack"; }

    @Override public String label() { return "Paystack: Mobile Money & Card"; }

    @Override public boolean enabled() { return !secretKey.isEmpty(); }

    private Map<String, String> auth() {
        return Map.of("Authorization", "Bearer " + secretKey);
    }

    @Override
    public InitResult initialize(InitRequest req) {
        if (req.customerEmail() == null || req.customerEmail().isBlank()) {
            throw new GatewayException("Paystack needs the customer's email address.");
        }
        ObjectNode body = http.mapper().createObjectNode();
        body.put("email", req.customerEmail());
        body.put("amount", Money.toMinor(req.amount(), req.currency()));
        body.put("currency", req.currency().toUpperCase(Locale.ROOT));
        body.put("reference", req.reference());
        body.put("callback_url", req.returnUrl());
        ObjectNode meta = body.putObject("metadata");
        meta.put("reference", req.reference());
        meta.put("cancel_action", req.cancelUrl());
        meta.put("customer_name", req.customerName());
        meta.put("customer_phone", req.customerPhone());
        if (req.split() != null && req.split().destination() != null && !req.split().destination().isBlank()) {
            body.put("subaccount", req.split().destination());
            // Flat amount the main (platform) account keeps; overrides the sub-account's default split.
            body.put("transaction_charge", Money.toMinor(req.split().platformFee(), req.currency()));
        }

        HttpJson.Response res = http.postJson(baseUrl + "/transaction/initialize", auth(), body);
        JsonNode json = res.json();
        if (!res.ok() || !json.path("status").asBoolean(false)) {
            throw new GatewayException(json.path("message").asText("Paystack refused the payment (" + res.status() + ")"));
        }
        JsonNode data = json.path("data");
        return new InitResult(data.path("authorization_url").asText(), data.path("access_code").asText(null));
    }

    @Override
    public VerifyResult verify(PaymentRef payment) {
        HttpJson.Response res = http.get(baseUrl + "/transaction/verify/" + HttpJson.enc(payment.reference()), auth());
        JsonNode json = res.json();
        if (!res.ok() || !json.path("status").asBoolean(false)) {
            return VerifyResult.pending(json.path("message").asText("Not paid yet"));
        }
        JsonNode data = json.path("data");
        String status = data.path("status").asText("");
        String currency = data.path("currency").asText(payment.currency());
        return switch (status) {
            case "success" -> VerifyResult.success(
                    Money.fromMinor(data.path("amount").asLong(), currency), currency, data.path("id").asText(null));
            case "failed", "reversed" -> VerifyResult.failed(data.path("gateway_response").asText("Payment failed"));
            default -> VerifyResult.pending("Payment is " + (status.isEmpty() ? "not finished" : status));
        };
    }

    @Override
    public Optional<WebhookEvent> parseWebhook(byte[] body, Function<String, String> header) {
        String signature = header.apply("x-paystack-signature");
        String expected = Tokens.hmacHex("HmacSHA512", secretKey, body);
        if (signature == null || !Tokens.constantTimeEquals(expected, signature.trim().toLowerCase(Locale.ROOT))) {
            throw new WebhookSignatureException("Bad Paystack signature");
        }
        JsonNode json = http.parse(new String(body, java.nio.charset.StandardCharsets.UTF_8));
        String event = json.path("event").asText("");
        String reference = json.path("data").path("reference").asText("");
        if (event.startsWith("charge.") && !reference.isEmpty()) {
            return Optional.of(new WebhookEvent(reference, event));
        }
        return Optional.empty();
    }
}
