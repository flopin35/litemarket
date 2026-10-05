package com.litemarket.admin;

import com.litemarket.payment.gateway.GatewayModels.ProviderOption;
import com.litemarket.user.UserStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class AdminDtos {

    private AdminDtos() {}

    public record Overview(
            long users,
            long stores,
            long products,
            long orders,
            long payingStores,
            BigDecimal subscriptionRevenue,
            BigDecimal orderVolume,
            BigDecimal owedToSellers,
            String currency,
            boolean aiOnline,
            List<ProviderOption> providers,
            boolean demoPayments,
            BigDecimal commissionPercent,
            boolean emailEnabled) {}

    public record SellerRow(
            Long storeId,
            Long userId,
            String storeName,
            String slug,
            String email,
            String whatsapp,
            String plan,
            String planName,
            Instant planExpiresAt,
            boolean premium,
            long products,
            String status,
            String role,
            Instant createdAt,
            String flutterwaveSubaccount,
            String paystackSubaccount,
            String stripeAccount,
            String shopUrl) {}

    public record AdminPayment(
            String reference,
            String purpose,
            String provider,
            String status,
            BigDecimal amount,
            String currency,
            String storeName,
            String storeSlug,
            String planName,
            String payerEmail,
            String settlement,
            BigDecimal platformFee,
            BigDecimal sellerAmount,
            Instant createdAt,
            Instant paidAt,
            String note) {}

    public record PayoutRow(
            Long storeId,
            String storeName,
            String slug,
            String whatsapp,
            String email,
            BigDecimal owed,
            long payments,
            String currency) {}

    public record GivePlanRequest(@NotBlank String planCode) {}

    public record UserStatusRequest(@NotNull UserStatus status) {}

    public record SplitRequest(
            @Size(max = 64) String flutterwaveSubaccount,
            @Size(max = 64) String paystackSubaccount,
            @Size(max = 64) String stripeAccount) {}
}
