package com.litemarket.ai;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public final class AiDtos {

    private AiDtos() {}

    public record ProductWriterRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 60) String category,
            @DecimalMin("0.00") BigDecimal price,
            @Size(max = 1000) String notes,
            @Size(max = 20) String tone,
            @Size(max = 20) String language,
            @Size(max = 500) String imageUrl) {}

    public record ReplyRequest(
            @NotBlank @Size(max = 2000) String message,
            Long orderId,
            @Size(max = 20) String tone,
            @Size(max = 20) String language) {}

    public record BroadcastRequest(
            @Size(max = 300) String goal,
            @Size(max = 10) List<Long> productIds,
            @Size(max = 20) String tone,
            @Size(max = 20) String language) {}

    public record UsageView(int used, int limit, boolean premium) {}
}
