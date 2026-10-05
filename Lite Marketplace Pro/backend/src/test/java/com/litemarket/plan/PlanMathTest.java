package com.litemarket.plan;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlanMathTest {

    private static final Instant NOW = Instant.parse("2026-10-05T10:00:00Z");

    @Test
    void premiumOnlyWhilePaidAndNotExpired() {
        assertTrue(PlanMath.isPremium("MONTHLY", NOW.plus(Duration.ofDays(3)), NOW));
        assertFalse(PlanMath.isPremium("MONTHLY", NOW.minusSeconds(1), NOW));
        assertFalse(PlanMath.isPremium("FREE", NOW.plus(Duration.ofDays(3)), NOW));
        assertFalse(PlanMath.isPremium("MONTHLY", null, NOW));
    }

    @Test
    void extendsFromRemainingTimeOrFromNow() {
        Instant active = NOW.plus(Duration.ofDays(5));
        assertEquals(active.plus(Duration.ofDays(30)), PlanMath.extend(active, NOW, 30));
        assertEquals(NOW.plus(Duration.ofDays(7)), PlanMath.extend(NOW.minus(Duration.ofDays(2)), NOW, 7));
        assertEquals(NOW.plus(Duration.ofDays(7)), PlanMath.extend(null, NOW, 7));
    }

    @Test
    void daysLeftRoundsUp() {
        assertEquals(1, PlanMath.daysLeft(NOW.plus(Duration.ofHours(2)), NOW));
        assertEquals(30, PlanMath.daysLeft(NOW.plus(Duration.ofDays(30)), NOW));
        assertEquals(0, PlanMath.daysLeft(NOW.minusSeconds(5), NOW));
    }

    @Test
    void aiCreditsResetMonthly() {
        assertEquals(LocalDate.parse("2026-10-01"), PlanMath.creditPeriodStart(NOW));
        assertEquals(12, PlanMath.creditsUsed(LocalDate.parse("2026-10-01"), 12, NOW));
        assertEquals(0, PlanMath.creditsUsed(LocalDate.parse("2026-09-01"), 49, NOW));
        assertEquals(0, PlanMath.creditsUsed(null, 49, NOW));
    }
}
