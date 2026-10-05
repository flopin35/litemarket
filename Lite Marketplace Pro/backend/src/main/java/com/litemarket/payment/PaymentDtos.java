package com.litemarket.payment;

import com.litemarket.payment.gateway.GatewayModels.ProviderOption;
import com.litemarket.plan.PlanOption;
import com.litemarket.store.StoreDtos.PlanView;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class PaymentDtos {

    private PaymentDtos() {}

    public record BillingCheckoutRequest(@NotBlank String planCode, @NotBlank String provider) {}

    public record VerifyRequest(@NotBlank @Size(max = 60) String reference) {}

    public record CheckoutView(String reference, String checkoutUrl) {}

    public record PaymentView(
            String reference,
            String purpose,
            String provider,
            String status,
            BigDecimal amount,
            String currency,
            String planCode,
            String planName,
            String note,
            Instant createdAt,
            Instant paidAt) {}

    /** What the callback / thank-you page shows after the gateway sends the customer back. */
    public record PaymentStatusView(
            String reference,
            String status,
            String purpose,
            String provider,
            BigDecimal amount,
            String currency,
            String planCode,
            String planName,
            Instant planExpiresAt,
            String orderNumber,
            String storeName,
            String storeSlug,
            String whatsappUrl,
            String message) {}

    public record BillingView(
            String currency,
            List<PlanOption> plans,
            PlanView current,
            List<ProviderOption> providers,
            List<PaymentView> history) {}
}
