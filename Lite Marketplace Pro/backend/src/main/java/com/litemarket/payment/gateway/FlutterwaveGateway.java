package com.litemarket.payment.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.litemarket.common.Tokens;
import com.litemarket.payment.gateway.GatewayModels.InitRequest;
import com.litemarket.payment.gateway.GatewayModels.InitResult;
import com.litemarket.payment.gateway.GatewayModels.PaymentRef;
import com.litemarket.payment.gateway.GatewayModels.VerifyResult;
import com.litemarket.payment.gateway.GatewayModels.WebhookEvent;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

/**
 * Flutterwave Standard (v3): Mobile Money (GH, UG, RW, ZM...), M-Pesa, cards, bank transfer, USSD.
 * Docs: https://developer.flutterwave.com/docs
 */
public class FlutterwaveGateway implements PaymentGateway {

    private final String secretKey;
    private final String webhookHash;
    private final String baseUrl;
    private final HttpJson http;

    public FlutterwaveGateway(String secretKey, String webhookHash, String baseUrl, HttpJson http) {
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        this.webhookHash = webhookHash == null ? "" : webhookHash.trim();
        this.baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.flutterwave.com/v3" : baseUrl.replaceAll("/+$", "");
        this.http = http;
    }

    @Override public String id() { return "flutterwave"; }

    @Override public String label() { return "Flutterwave: Mobile Money & Card"; }

    @Override public boolean enabled() { return !secretKey.isEmpty(); }

    private Map<String, String> auth() {
        return Map.of("Authorization", "Bearer " + secretKey);
    }

    @Override
    public InitResult initialize(InitRequest req) {
        if (req.customerEmail() == null || req.customerEmail().isBlank()) {
            throw new GatewayException("Flutterwave needs the customer's email address.");
        }
        ObjectNode body = http.mapper().createObjectNode();
        body.put("tx_ref", req.reference());
        body.put("amount", req.amount().toPlainString());
        body.put("currency", req.currency().toUpperCase(Locale.ROOT));
        body.put("redirect_url", req.returnUrl());
        ObjectNode customer = body.putObject("customer");
        customer.put("email", req.customerEmail());
        if (req.customerPhone() != null) customer.put("phonenumber", req.customerPhone());
        if (req.customerName() != null) customer.put("name", req.customerName());
        ObjectNode custom = body.putObject("customizations");
        custom.put("title", req.title());
        custom.put("description", req.description());
        body.putObject("meta").put("reference", req.reference());
        if (req.split() != null && req.split().destination() != null && !req.split().destination().isBlank()) {
            ArrayNode subs = body.putArray("subaccounts");
            ObjectNode sub = subs.addObject();
            sub.put("id", req.split().destination());
            // The seller's sub-account receives exactly sellerAmount; the rest stays with the platform.
            sub.put("transaction_charge_type", "flat_subaccount");
            sub.put("transaction_charge", req.split().sellerAmount().toPlainString());
        }

        HttpJson.Response res = http.postJson(baseUrl + "/payments", auth(), body);
        JsonNode json = res.json();
        if (!res.ok() || !"success".equals(json.path("status").asText())) {
            throw new GatewayException(json.path("message").asText("Flutterwave refused the payment (" + res.status() + ")"));
        }
        return new InitResult(json.path("data").path("link").asText(), null);
    }

    @Override
    public VerifyResult verify(PaymentRef payment) {
        HttpJson.Response res = http.get(
                baseUrl + "/transactions/verify_by_reference?tx_ref=" + HttpJson.enc(payment.reference()), auth());
        JsonNode json = res.json();
        if (!res.ok() || !"success".equals(json.path("status").asText())) {
            return VerifyResult.pending(json.path("message").asText("Not paid yet"));
        }
        JsonNode data = json.path("data");
        String status = data.path("status").asText("");
        return switch (status) {
            case "successful" -> VerifyResult.success(
                    new java.math.BigDecimal(data.path("amount").asText("0")), data.path("currency").asText(payment.currency()),
                    data.path("id").asText(null));
            case "failed" -> VerifyResult.failed(data.path("processor_response").asText("Payment failed"));
            default -> VerifyResult.pending("Payment is " + (status.isEmpty() ? "not finished" : status));
        };
    }

    @Override
    public Optional<WebhookEvent> parseWebhook(byte[] body, Function<String, String> header) {
        if (webhookHash.isEmpty()) {
            throw new WebhookSignatureException("FLUTTERWAVE_WEBHOOK_HASH is not set");
        }
        String signature = header.apply("flutterwave-signature");
        String verifHash = header.apply("verif-hash");
        boolean valid;
        if (signature != null && !signature.isBlank()) {
            // Newer webhooks: base64(HMAC-SHA256(body, secret hash))
            String expected = Base64.getEncoder().encodeToString(
                    Tokens.hmac("HmacSHA256", webhookHash.getBytes(StandardCharsets.UTF_8), body));
            valid = Tokens.constantTimeEquals(expected, signature.trim());
        } else {
            // Classic v3 webhooks: the secret hash itself is sent in "verif-hash".
            valid = Tokens.constantTimeEquals(webhookHash, verifHash == null ? null : verifHash.trim());
        }
        if (!valid) throw new WebhookSignatureException("Bad Flutterwave signature");

        JsonNode json = http.parse(new String(body, StandardCharsets.UTF_8));
        String event = json.path("event").asText(json.path("event.type").asText(""));
        String txRef = json.path("data").path("tx_ref").asText(json.path("txRef").asText(""));
        return txRef.isEmpty() ? Optional.empty() : Optional.of(new WebhookEvent(txRef, event));
    }
}
