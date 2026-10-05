package com.litemarket.plan;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

/** Plan date rules with no framework dependencies (unit-tested in PlanMathTest). */
public final class PlanMath {

    public static final String FREE = "FREE";

    private PlanMath() {}

    public static boolean isPremium(String planCode, Instant expiresAt, Instant now) {
        return planCode != null && !FREE.equalsIgnoreCase(planCode) && expiresAt != null && expiresAt.isAfter(now);
    }

    /**
     * New expiry after buying {@code days}: added on top of the time still left on an active plan,
     * or counted from now when the plan has run out (same rule as the original app).
     */
    public static Instant extend(Instant currentExpiry, Instant now, int days) {
        Instant base = (currentExpiry != null && currentExpiry.isAfter(now)) ? currentExpiry : now;
        return base.plus(days, ChronoUnit.DAYS);
    }

    /** Whole days left, rounded up ("ends in 2 hours" counts as 1 day). 0 when expired. */
    public static long daysLeft(Instant expiresAt, Instant now) {
        if (expiresAt == null || !expiresAt.isAfter(now)) return 0;
        long seconds = Duration.between(now, expiresAt).getSeconds();
        return (seconds + 86_399) / 86_400;
    }

    /** First day of the month that {@code now} falls in (UTC). AI credits reset on this day. */
    public static LocalDate creditPeriodStart(Instant now) {
        return LocalDate.ofInstant(now, ZoneOffset.UTC).withDayOfMonth(1);
    }

    /** AI credits already used in the current period (0 when the stored period is older). */
    public static int creditsUsed(LocalDate storedPeriodStart, int storedUsed, Instant now) {
        if (storedPeriodStart == null || storedPeriodStart.isBefore(creditPeriodStart(now))) return 0;
        return storedUsed;
    }
}
