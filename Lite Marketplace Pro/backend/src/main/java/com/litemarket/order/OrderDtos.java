package com.litemarket.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class OrderDtos {

    private OrderDtos() {}

    public record CartLine(@NotNull Long productId, @Min(1) @Max(99) int quantity) {}

    public record CustomerInfo(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 30) String phone,
            @Email @Size(max = 190) String email,
            @NotBlank @Size(max = 500) String address,
            @Size(max = 1000) String note) {}

    /** Cart sent from the shop page. provider is only used for online payment. */
    public record CheckoutRequest(
            @NotEmpty @Size(max = 50) @Valid List<CartLine> items,
            @NotNull @Valid CustomerInfo customer,
            String provider) {}

    public record ManualOrderRequest(
            @NotBlank @Size(max = 120) String customerName,
            @Size(max = 30) String customerPhone,
            @Size(max = 1000) String itemsSummary,
            @NotNull @DecimalMin("0.00") BigDecimal total,
            @NotNull OrderStatus status,
            @Size(max = 500) String address,
            @Size(max = 1000) String note) {}

    public record StatusRequest(@NotNull OrderStatus status) {}

    public record OrderItemView(Long productId, String name, BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {}

    public record OrderView(
            Long id,
            String number,
            String customerName,
            String customerPhone,
            String customerEmail,
            String address,
            String note,
            OrderChannel channel,
            OrderStatus status,
            BigDecimal total,
            String currency,
            String paymentProvider,
            String itemsSummary,
            List<OrderItemView> items,
            Instant createdAt,
            Instant paidAt) {}

    public record DayPoint(LocalDate date, BigDecimal total, int orders) {}

    public record TopProduct(Long productId, String name, int quantity, BigDecimal revenue) {}
}
