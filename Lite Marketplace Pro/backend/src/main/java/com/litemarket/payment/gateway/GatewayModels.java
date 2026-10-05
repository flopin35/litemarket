package com.litemarket.payment.gateway;

import java.math.BigDecimal;

/** Plain data passed between PaymentService and the gateways. No framework types. */
public final class GatewayModels {

    private GatewayModels() {}

    /** A payment option shown to customers and sellers. */
    public record ProviderOption(String id, String label) {}

    /** Send part of the money straight to the seller's sub-account; the platform keeps platformFee. */
    public record Split(String destination, BigDecimal platformFee, BigDecimal sellerAmount) {}

    public record InitRequest(
            String reference,
            BigDecimal amount,
            String currency,
            String customerEmail,
            String customerPhone,
            String customerName,
            String title,
            String description,
            String returnUrl,
            String cancelUrl,
            Split split) {}

    public record InitResult(String checkoutUrl, String providerRef) {}

    /** What we know about a payment when we ask the gateway about it. */
    public record PaymentRef(String reference, String providerRef, BigDecimal amount, String currency) {}

    public enum VerifyStatus { SUCCESS, PENDING, FAILED }

    public record VerifyResult(VerifyStatus status, BigDecimal amount, String currency, String providerTxnId, String message) {

        public static VerifyResult success(BigDecimal amount, String currency, String txnId) {
            return new VerifyResult(VerifyStatus.SUCCESS, amount, currency, txnId, "Payment successful");
        }

        public static VerifyResult pending(String message) {
            return new VerifyResult(VerifyStatus.PENDING, null, null, null, message);
        }

        public static VerifyResult failed(String message) {
            return new VerifyResult(VerifyStatus.FAILED, null, null, null, message);
        }
    }

    /** A verified webhook that refers to one of our payment references. */
    public record WebhookEvent(String reference, String type) {}
}
