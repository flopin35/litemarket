package com.litemarket.shop;

import com.litemarket.payment.gateway.GatewayModels.ProviderOption;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public final class ShopDtos {

    private ShopDtos() {}

    public record PublicProduct(
            Long id,
            String name,
            BigDecimal price,
            String category,
            String description,
            String imageUrl,
            boolean available,
            boolean featured,
            Integer stockLeft) {}

    public record ShopView(
            String name,
            String slug,
            String about,
            String whatsapp,
            String currency,
            String accentColor,
            String logoUrl,
            boolean whatsappOrders,
            boolean onlinePayments,
            List<ProviderOption> providers,
            List<String> categories,
            List<PublicProduct> products,
            boolean assistant) {}

    public record WhatsAppOrderView(String orderNumber, BigDecimal total, String currency, String whatsappUrl) {}

    public record ChatMessage(
            @NotBlank @Pattern(regexp = "user|assistant") String role,
            @NotBlank @Size(max = 1000) String content) {}

    public record AssistantRequest(
            @NotEmpty @Size(max = 20) @Valid List<ChatMessage> messages,
            @Size(max = 50) List<Long> cartProductIds) {}
}
