package com.litemarket.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/** Everything under "app:" in application.yml, bound into typed records. */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Brand brand,
        Web web,
        Security security,
        Plans plans,
        Payments payments,
        Ai ai,
        Storage storage,
        Demo demo,
        Mail mail) {

    public record Brand(String name, String supportEmail, String defaultCountryCode) {}

    public record Web(String baseUrl, List<String> corsOrigins) {
        /** Base URL without a trailing slash. */
        public String base() {
            String b = baseUrl == null ? "" : baseUrl.trim();
            while (b.endsWith("/")) b = b.substring(0, b.length() - 1);
            return b;
        }
    }

    public record Security(String jwtSecret, int accessTokenMinutes, int refreshTokenDays, boolean secureCookies) {}

    public record Plans(String currency, int freeProductLimit, int freeAiCredits, int paidAiCredits, List<Plan> paid) {
        public Optional<Plan> find(String code) {
            if (code == null || paid == null) return Optional.empty();
            return paid.stream().filter(p -> p.code().equalsIgnoreCase(code)).findFirst();
        }
    }

    public record Plan(String code, String name, BigDecimal price, int days, boolean popular) {}

    public record Payments(boolean demoMode, BigDecimal commissionPercent,
                           Flutterwave flutterwave, Paystack paystack, Stripe stripe) {}

    public record Flutterwave(String secretKey, String webhookHash, String baseUrl) {}

    public record Paystack(String secretKey, String baseUrl) {}

    public record Stripe(String secretKey, String webhookSecret, String baseUrl) {}

    public record Ai(String baseUrl, String internalKey, int timeoutSeconds) {}

    public record Storage(String uploadDir) {}

    public record Demo(boolean seed, String adminEmail, String adminPassword) {}

    public record Mail(String from) {}
}
