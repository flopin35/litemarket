package com.litemarket.plan;

import java.math.BigDecimal;

/** A paid plan as shown on the pricing page. */
public record PlanOption(String code, String name, BigDecimal price, int days, boolean popular) {}
