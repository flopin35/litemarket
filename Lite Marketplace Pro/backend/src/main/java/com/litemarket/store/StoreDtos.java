package com.litemarket.store;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class StoreDtos {

    private StoreDtos() {}

    public record StoreView(
            Long id,
            String name,
            String slug,
            String whatsapp,
            String currency,
            String about,
            String accentColor,
            String logoUrl,
            boolean onlinePayments,
            boolean whatsappOrders,
            String publicLink,
            String shopUrl) {}

    public record PlanView(
            String code,
            String name,
            boolean premium,
            Instant expiresAt,
            long daysLeft,
            Integer productLimit,
            int aiCreditsUsed,
            int aiCreditsLimit) {}

    public record StoreUpdateRequest(
            @NotBlank @Size(max = 80) String name,
            @NotBlank @Size(min = 3, max = 40)
            @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$", message = "can only use small letters, numbers and dashes")
            String slug,
            @NotBlank @Size(max = 30) String whatsapp,
            @NotBlank @Pattern(regexp = "^[A-Za-z]{3}$", message = "must be a 3-letter code like GHS") String currency,
            @Size(max = 1000) String about,
            @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "must be a colour like #0F9D7A") String accentColor,
            @Size(max = 500) String logoUrl,
            boolean onlinePayments,
            boolean whatsappOrders,
            @Size(max = 300) String publicLink) {}
}
