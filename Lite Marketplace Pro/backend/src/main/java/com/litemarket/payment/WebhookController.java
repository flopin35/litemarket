package com.litemarket.payment;

import com.litemarket.payment.gateway.WebhookSignatureException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Webhook URLs to paste into each dashboard:
 *   Paystack:    https://YOUR-DOMAIN/api/webhooks/paystack
 *   Flutterwave: https://YOUR-DOMAIN/api/webhooks/flutterwave
 *   Stripe:      https://YOUR-DOMAIN/api/webhooks/stripe
 * The raw bytes are read so signatures can be checked exactly as sent.
 */
@RestController
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final PaymentService payments;

    public WebhookController(PaymentService payments) {
        this.payments = payments;
    }

    @PostMapping("/api/webhooks/{provider}")
    public ResponseEntity<Map<String, Object>> receive(@PathVariable("provider") String provider,
                                                       @RequestBody(required = false) byte[] body,
                                                       HttpServletRequest request) {
        try {
            payments.handleWebhook(provider, body == null ? new byte[0] : body, request::getHeader);
            return ResponseEntity.ok(Map.of("received", true));
        } catch (WebhookSignatureException e) {
            log.warn("Rejected {} webhook: {}", provider, e.getMessage());
            return ResponseEntity.status(401).body(Map.of("received", false, "error", "bad signature"));
        }
    }
}
