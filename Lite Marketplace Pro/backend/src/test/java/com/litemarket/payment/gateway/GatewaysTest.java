package com.litemarket.payment.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.litemarket.common.Tokens;
import com.litemarket.payment.gateway.GatewayModels.InitRequest;
import com.litemarket.payment.gateway.GatewayModels.InitResult;
import com.litemarket.payment.gateway.GatewayModels.PaymentRef;
import com.litemarket.payment.gateway.GatewayModels.Split;
import com.litemarket.payment.gateway.GatewayModels.VerifyResult;
import com.litemarket.payment.gateway.GatewayModels.VerifyStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GatewaysTest {

    private final ObjectMapper json = new ObjectMapper();

    private static InitRequest order(Split split) {
        return new InitRequest("PAY-ABC123", new BigDecimal("45.50"), "GHS", "kofi@example.com", "233241234567",
                "Kofi", "Ama's Kitchen", "Order LM-7KQ2XA", "https://shop.test/s/amas/thanks",
                "https://shop.test/s/amas?checkout=cancelled", split);
    }

    private static PaymentRef ref() {
        return new PaymentRef("PAY-ABC123", "cs_test_1", new BigDecimal("45.50"), "GHS");
    }

    private static java.util.function.Function<String, String> headers(Map<String, String> h) {
        return name -> h.entrySet().stream().filter(e -> e.getKey().equalsIgnoreCase(name))
                .map(Map.Entry::getValue).findFirst().orElse(null);
    }

    // ── Paystack ───────────────────────────────────────────────────────────────

    @Test
    void paystackInitializeSendsPesewasAndSplit() throws Exception {
        FakeHttp http = new FakeHttp().reply(200,
                "{\"status\":true,\"data\":{\"authorization_url\":\"https://checkout.paystack.com/x\",\"access_code\":\"ac_1\"}}");
        PaystackGateway g = new PaystackGateway("sk_test_123", null, http);
        InitResult r = g.initialize(order(new Split("ACCT_seller", new BigDecimal("2.28"), new BigDecimal("43.22"))));

        assertEquals("https://checkout.paystack.com/x", r.checkoutUrl());
        assertEquals("ac_1", r.providerRef());
        assertEquals("https://api.paystack.co/transaction/initialize", http.last().url());
        assertEquals("Bearer sk_test_123", http.last().authorization());
        JsonNode body = json.readTree(http.last().body());
        assertEquals(4550, body.path("amount").asLong());
        assertEquals("GHS", body.path("currency").asText());
        assertEquals("PAY-ABC123", body.path("reference").asText());
        assertEquals("ACCT_seller", body.path("subaccount").asText());
        assertEquals(228, body.path("transaction_charge").asLong());
    }

    @Test
    void paystackVerifyMapsStatuses() {
        FakeHttp http = new FakeHttp()
                .reply(200, "{\"status\":true,\"data\":{\"status\":\"success\",\"amount\":4550,\"currency\":\"GHS\",\"id\":99}}")
                .reply(200, "{\"status\":true,\"data\":{\"status\":\"abandoned\"}}")
                .reply(200, "{\"status\":true,\"data\":{\"status\":\"failed\",\"gateway_response\":\"Declined\"}}")
                .reply(400, "{\"status\":false,\"message\":\"Transaction reference not found\"}");
        PaystackGateway g = new PaystackGateway("sk_test_123", null, http);

        VerifyResult ok = g.verify(ref());
        assertEquals(VerifyStatus.SUCCESS, ok.status());
        assertEquals(new BigDecimal("45.50"), ok.amount());
        assertEquals("99", ok.providerTxnId());
        assertEquals("https://api.paystack.co/transaction/verify/PAY-ABC123", http.sent.get(0).url());
        assertEquals(VerifyStatus.PENDING, g.verify(ref()).status());
        assertEquals(VerifyStatus.FAILED, g.verify(ref()).status());
        assertEquals(VerifyStatus.PENDING, g.verify(ref()).status());
    }

    @Test
    void paystackWebhookChecksSignature() {
        PaystackGateway g = new PaystackGateway("sk_test_123", null, new FakeHttp());
        byte[] body = "{\"event\":\"charge.success\",\"data\":{\"reference\":\"PAY-ABC123\"}}".getBytes(StandardCharsets.UTF_8);
        String sig = Tokens.hmacHex("HmacSHA512", "sk_test_123", body);

        assertEquals("PAY-ABC123", g.parseWebhook(body, headers(Map.of("x-paystack-signature", sig))).orElseThrow().reference());
        assertThrows(WebhookSignatureException.class,
                () -> g.parseWebhook(body, headers(Map.of("x-paystack-signature", "deadbeef"))));
        assertThrows(WebhookSignatureException.class, () -> g.parseWebhook(body, headers(Map.of())));
    }

    @Test
    void paystackNeedsEmail() {
        PaystackGateway g = new PaystackGateway("sk_test_123", null, new FakeHttp());
        InitRequest noEmail = new InitRequest("R", BigDecimal.TEN, "GHS", null, null, null, "t", "d", "u", "c", null);
        assertThrows(GatewayException.class, () -> g.initialize(noEmail));
    }

    // ── Flutterwave ────────────────────────────────────────────────────────────

    @Test
    void flutterwaveInitializeAndVerify() throws Exception {
        FakeHttp http = new FakeHttp()
                .reply(200, "{\"status\":\"success\",\"data\":{\"link\":\"https://checkout.flutterwave.com/pay/x\"}}")
                .reply(200, "{\"status\":\"success\",\"data\":{\"id\":5551,\"status\":\"successful\",\"amount\":45.5,\"currency\":\"GHS\"}}")
                .reply(400, "{\"status\":\"error\",\"message\":\"No transaction was found for this id\"}");
        FlutterwaveGateway g = new FlutterwaveGateway("FLWSECK_TEST-1", "hash", null, http);

        InitResult r = g.initialize(order(new Split("RS_seller", new BigDecimal("2.28"), new BigDecimal("43.22"))));
        assertEquals("https://checkout.flutterwave.com/pay/x", r.checkoutUrl());
        JsonNode body = json.readTree(http.sent.get(0).body());
        assertEquals("PAY-ABC123", body.path("tx_ref").asText());
        assertEquals("45.50", body.path("amount").asText());
        assertEquals("kofi@example.com", body.path("customer").path("email").asText());
        assertEquals("RS_seller", body.path("subaccounts").get(0).path("id").asText());
        assertEquals("flat_subaccount", body.path("subaccounts").get(0).path("transaction_charge_type").asText());
        assertEquals("43.22", body.path("subaccounts").get(0).path("transaction_charge").asText());

        VerifyResult ok = g.verify(ref());
        assertEquals(VerifyStatus.SUCCESS, ok.status());
        assertEquals(0, new BigDecimal("45.5").compareTo(ok.amount()));
        assertTrue(http.sent.get(1).url().endsWith("/transactions/verify_by_reference?tx_ref=PAY-ABC123"));
        assertEquals(VerifyStatus.PENDING, g.verify(ref()).status());
    }

    @Test
    void flutterwaveWebhookSupportsBothSignatureStyles() {
        FlutterwaveGateway g = new FlutterwaveGateway("FLWSECK_TEST-1", "my-secret-hash", null, new FakeHttp());
        byte[] body = "{\"event\":\"charge.completed\",\"data\":{\"tx_ref\":\"SUB-XYZ\",\"status\":\"successful\"}}"
                .getBytes(StandardCharsets.UTF_8);

        assertEquals("SUB-XYZ", g.parseWebhook(body, headers(Map.of("verif-hash", "my-secret-hash"))).orElseThrow().reference());
        String hmac = Base64.getEncoder().encodeToString(
                Tokens.hmac("HmacSHA256", "my-secret-hash".getBytes(StandardCharsets.UTF_8), body));
        assertEquals("SUB-XYZ", g.parseWebhook(body, headers(Map.of("flutterwave-signature", hmac))).orElseThrow().reference());
        assertThrows(WebhookSignatureException.class, () -> g.parseWebhook(body, headers(Map.of("verif-hash", "wrong"))));
        FlutterwaveGateway noHash = new FlutterwaveGateway("FLWSECK_TEST-1", "", null, new FakeHttp());
        assertThrows(WebhookSignatureException.class, () -> noHash.parseWebhook(body, headers(Map.of("verif-hash", ""))));
    }

    // ── Stripe ─────────────────────────────────────────────────────────────────

    @Test
    void stripeCreatesCheckoutSession() {
        FakeHttp http = new FakeHttp().reply(200, "{\"id\":\"cs_test_1\",\"url\":\"https://checkout.stripe.com/c/pay/cs_test_1\"}");
        StripeGateway g = new StripeGateway("sk_test_abc", "whsec_x", null, http, Clock.systemUTC());
        InitResult r = g.initialize(order(new Split("acct_123", new BigDecimal("2.28"), new BigDecimal("43.22"))));

        assertEquals("cs_test_1", r.providerRef());
        String form = URLDecoder.decode(http.last().body(), StandardCharsets.UTF_8);
        assertTrue(form.contains("line_items[0][price_data][unit_amount]=4550"));
        assertTrue(form.contains("line_items[0][price_data][currency]=ghs"));
        assertTrue(form.contains("success_url=https://shop.test/s/amas/thanks?reference=PAY-ABC123"));
        assertTrue(form.contains("client_reference_id=PAY-ABC123"));
        assertTrue(form.contains("payment_intent_data[transfer_data][destination]=acct_123"));
        assertTrue(form.contains("payment_intent_data[application_fee_amount]=228"));
        assertEquals("https://api.stripe.com/v1/checkout/sessions", http.last().url());
    }

    @Test
    void stripeVerifyReadsSession() {
        FakeHttp http = new FakeHttp()
                .reply(200, "{\"id\":\"cs_test_1\",\"payment_status\":\"paid\",\"status\":\"complete\",\"amount_total\":4550,\"currency\":\"ghs\",\"payment_intent\":\"pi_1\"}")
                .reply(200, "{\"id\":\"cs_test_1\",\"payment_status\":\"unpaid\",\"status\":\"expired\"}");
        StripeGateway g = new StripeGateway("sk_test_abc", "whsec_x", null, http, Clock.systemUTC());
        VerifyResult ok = g.verify(ref());
        assertEquals(VerifyStatus.SUCCESS, ok.status());
        assertEquals("GHS", ok.currency());
        assertEquals(new BigDecimal("45.50"), ok.amount());
        assertEquals("pi_1", ok.providerTxnId());
        assertEquals(VerifyStatus.FAILED, g.verify(ref()).status());
        assertEquals(VerifyStatus.PENDING,
                g.verify(new PaymentRef("X", null, BigDecimal.ONE, "GHS")).status());
    }

    @Test
    void stripeWebhookSignature() {
        Instant now = Instant.parse("2026-10-05T10:00:00Z");
        StripeGateway g = new StripeGateway("sk_test_abc", "whsec_test", null, new FakeHttp(), Clock.fixed(now, ZoneOffset.UTC));
        byte[] body = "{\"type\":\"checkout.session.completed\",\"data\":{\"object\":{\"client_reference_id\":\"PAY-ABC123\"}}}"
                .getBytes(StandardCharsets.UTF_8);
        long t = now.getEpochSecond();
        byte[] signed = (t + "." + new String(body, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8);
        String v1 = Tokens.hmacHex("HmacSHA256", "whsec_test", signed);

        assertEquals("PAY-ABC123", g.parseWebhook(body,
                headers(Map.of("Stripe-Signature", "t=" + t + ",v1=" + v1))).orElseThrow().reference());
        assertThrows(WebhookSignatureException.class, () -> g.parseWebhook(body,
                headers(Map.of("Stripe-Signature", "t=" + t + ",v1=" + v1.replace('a', 'b')))));
        long old = t - 3600;
        String oldSig = Tokens.hmacHex("HmacSHA256", "whsec_test",
                (old + "." + new String(body, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8));
        assertThrows(WebhookSignatureException.class, () -> g.parseWebhook(body,
                headers(Map.of("Stripe-Signature", "t=" + old + ",v1=" + oldSig))));
        byte[] other = "{\"type\":\"customer.created\",\"data\":{\"object\":{}}}".getBytes(StandardCharsets.UTF_8);
        String otherSig = Tokens.hmacHex("HmacSHA256", "whsec_test",
                (t + "." + new String(other, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8));
        assertFalse(g.parseWebhook(other, headers(Map.of("Stripe-Signature", "t=" + t + ",v1=" + otherSig))).isPresent());
    }

    // ── Demo ───────────────────────────────────────────────────────────────────

    @Test
    void demoGatewayOnlyPaysWhenMarked() {
        DemoGateway g = new DemoGateway(true, "http://localhost:5173");
        InitResult r = g.initialize(order(null));
        assertTrue(r.checkoutUrl().startsWith("http://localhost:5173/pay/demo?reference=PAY-ABC123"));
        assertEquals(VerifyStatus.PENDING, g.verify(new PaymentRef("PAY-ABC123", r.providerRef(), BigDecimal.TEN, "GHS")).status());
        VerifyResult paid = g.verify(new PaymentRef("PAY-ABC123", DemoGateway.PAID_MARKER, BigDecimal.TEN, "GHS"));
        assertEquals(VerifyStatus.SUCCESS, paid.status());
        assertEquals(BigDecimal.TEN, paid.amount());
        assertFalse(new DemoGateway(false, "x").enabled());
    }
}
