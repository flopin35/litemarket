package com.litemarket.common;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MoneyAndSlugsTest {

    @Test
    void convertsToMinorUnits() {
        assertEquals(2550, Money.toMinor(new BigDecimal("25.50"), "GHS"));
        assertEquals(10000, Money.toMinor(new BigDecimal("100"), "NGN"));
        assertEquals(1235, Money.toMinor(new BigDecimal("12.345"), "USD"));
        assertEquals(5000, Money.toMinor(new BigDecimal("5000"), "UGX"));
        assertEquals(new BigDecimal("25.50"), Money.fromMinor(2550, "GHS"));
        assertEquals(new BigDecimal("5000.00"), Money.fromMinor(5000, "XOF"));
    }

    @Test
    void commissionAndCoverage() {
        assertEquals(new BigDecimal("2.25"), Money.percentOf(new BigDecimal("45"), new BigDecimal("5")));
        assertEquals(new BigDecimal("0.00"), Money.percentOf(new BigDecimal("45"), BigDecimal.ZERO));
        assertTrue(Money.covers(new BigDecimal("45.00"), new BigDecimal("45"), "GHS"));
        assertTrue(Money.covers(new BigDecimal("44.99"), new BigDecimal("45"), "GHS"));
        assertFalse(Money.covers(new BigDecimal("40"), new BigDecimal("45"), "GHS"));
        assertFalse(Money.covers(null, new BigDecimal("45"), "GHS"));
    }

    @Test
    void slugsAndPhones() {
        assertEquals("amas-kitchen-cafe", Slugs.slugify("Ama's Kitchen & Café"));
        assertEquals("my-shop", Slugs.slugify("!!!"));
        assertEquals("nelles-foundation", Slugs.slugify("  Nelle's Foundation "));
        assertEquals("233241234567", Slugs.cleanPhone("024 123 4567", "233"));
        assertEquals("447700900123", Slugs.cleanPhone("+44 7700 900123", "233"));
        assertEquals("447700900123", Slugs.cleanPhone("0044 7700 900123", "233"));
        assertEquals("a b", Slugs.clean("  a    b "));
    }

    @Test
    void whatsappLinkEncodesSpacesAndLines() {
        String link = WhatsApp.link("+233 24 123 4567", "Hello Ama!\nTotal: GHS 45.00");
        assertEquals("https://wa.me/233241234567?text=Hello%20Ama%21%0ATotal%3A%20GHS%2045.00", link);
    }

    @Test
    void rateLimiterResetsAfterWindow() {
        MutableClock clock = new MutableClock();
        RateLimiter limiter = new RateLimiter(2, Duration.ofMinutes(1), clock);
        assertTrue(limiter.tryAcquire("ip"));
        assertTrue(limiter.tryAcquire("ip"));
        assertFalse(limiter.tryAcquire("ip"));
        assertTrue(limiter.tryAcquire("other"));
        clock.now = clock.now.plusSeconds(61);
        assertTrue(limiter.tryAcquire("ip"));
    }

    @Test
    void tokensAreRandomAndComparable() {
        String a = Tokens.randomUrlToken(32);
        String b = Tokens.randomUrlToken(32);
        assertFalse(a.equals(b));
        assertEquals(43, a.length());
        assertEquals(8, Tokens.randomCode(8).length());
        assertTrue(Tokens.constantTimeEquals("abc", "abc"));
        assertFalse(Tokens.constantTimeEquals("abc", "abd"));
        assertFalse(Tokens.constantTimeEquals(null, "abd"));
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", Tokens.sha256Hex("abc"));
    }

    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-05T10:00:00Z");
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }
}
