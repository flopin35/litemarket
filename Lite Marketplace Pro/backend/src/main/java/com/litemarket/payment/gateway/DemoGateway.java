package com.litemarket.payment.gateway;

import com.litemarket.payment.gateway.GatewayModels.InitRequest;
import com.litemarket.payment.gateway.GatewayModels.InitResult;
import com.litemarket.payment.gateway.GatewayModels.PaymentRef;
import com.litemarket.payment.gateway.GatewayModels.VerifyResult;
import com.litemarket.payment.gateway.GatewayModels.WebhookEvent;

import java.util.Optional;
import java.util.function.Function;

/**
 * Simulated payments for demos and local development (PAYMENTS_DEMO_MODE=true).
 * The checkout page is the website's /pay/demo screen, clearly marked as a test. No money moves.
 */
public class DemoGateway implements PaymentGateway {

    public static final String PAID_MARKER = "demo-paid";

    private final boolean enabled;
    private final String webBase;

    public DemoGateway(boolean enabled, String webBase) {
        this.enabled = enabled;
        this.webBase = webBase;
    }

    @Override public String id() { return "demo"; }

    @Override public String label() { return "Demo payment (test mode)"; }

    @Override public boolean enabled() { return enabled; }

    @Override
    public InitResult initialize(InitRequest req) {
        String url = webBase + "/pay/demo?reference=" + HttpJson.enc(req.reference())
                + "&amount=" + HttpJson.enc(req.amount().toPlainString())
                + "&currency=" + HttpJson.enc(req.currency())
                + "&title=" + HttpJson.enc(req.title())
                + "&return=" + HttpJson.enc(req.returnUrl())
                + "&cancel=" + HttpJson.enc(req.cancelUrl());
        return new InitResult(url, "demo-pending");
    }

    @Override
    public VerifyResult verify(PaymentRef payment) {
        if (PAID_MARKER.equals(payment.providerRef())) {
            return VerifyResult.success(payment.amount(), payment.currency(), "DEMO-" + payment.reference());
        }
        return VerifyResult.pending("Waiting for the demo payment");
    }

    @Override
    public Optional<WebhookEvent> parseWebhook(byte[] body, Function<String, String> header) {
        return Optional.empty();
    }
}
