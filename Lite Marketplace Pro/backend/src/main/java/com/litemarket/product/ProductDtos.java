package com.litemarket.product;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public final class ProductDtos {

    private ProductDtos() {}

    public record ProductRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull @DecimalMin(value = "0.00") @DecimalMax(value = "99999999.99") BigDecimal price,
            @Size(max = 60) String category,
            @Size(max = 2000) String description,
            @Size(max = 500) String imageUrl,
            boolean inStock,
            @Min(0) @Max(1_000_000) Integer stockQty,
            boolean featured) {}

    public record ProductView(
            Long id,
            String name,
            BigDecimal price,
            String category,
            String description,
            String imageUrl,
            boolean inStock,
            Integer stockQty,
            boolean featured,
            boolean available,
            Instant createdAt) {}
}
