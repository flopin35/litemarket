package com.litemarket.auth;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    private static final String SECRET = "test-secret-that-is-long-enough-0123456789";
    private static final Instant T0 = Instant.parse("2026-10-05T10:00:00Z");

    private JwtService at(Instant t) {
        return new JwtService(SECRET, Duration.ofMinutes(15), Clock.fixed(t, ZoneOffset.UTC));
    }

    @Test
    void issuesAndVerifies() {
        String token = at(T0).issue(42, "ama@example.com", "SELLER");
        JwtService.Claims c = at(T0.plusSeconds(60)).verify(token).orElseThrow();
        assertEquals(42, c.userId());
        assertEquals("ama@example.com", c.email());
        assertEquals("SELLER", c.role());
    }

    @Test
    void rejectsExpiredTokens() {
        String token = at(T0).issue(1, "a@b.co", "SELLER");
        assertTrue(at(T0.plus(Duration.ofMinutes(16))).verify(token).isEmpty());
    }

    @Test
    void rejectsTamperedTokens() {
        String token = at(T0).issue(1, "a@b.co", "SELLER");
        String[] parts = token.split("\\.");
        String evil = Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("{\"sub\":\"1\",\"email\":\"a@b.co\",\"role\":\"ADMIN\",\"exp\":" + (T0.getEpochSecond() + 900) + "}")
                        .getBytes(StandardCharsets.UTF_8));
        assertTrue(at(T0).verify(parts[0] + "." + evil + "." + parts[2]).isEmpty());
        assertTrue(at(T0).verify(token + "x").isEmpty());
        assertTrue(at(T0).verify("not.a.jwt").isEmpty());
        assertTrue(at(T0).verify(null).isEmpty());
    }

    @Test
    void rejectsOtherSecretsAndAlgNone() {
        String token = at(T0).issue(1, "a@b.co", "SELLER");
        JwtService other = new JwtService("another-secret-that-is-long-enough-987654", Duration.ofMinutes(15),
                Clock.fixed(T0, ZoneOffset.UTC));
        assertTrue(other.verify(token).isEmpty());
        String none = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"none\"}".getBytes(StandardCharsets.UTF_8));
        assertTrue(at(T0).verify(none + "." + token.split("\\.")[1] + ".").isEmpty());
    }

    @Test
    void refusesShortSecrets() {
        assertThrows(IllegalStateException.class, () -> new JwtService("short", Duration.ofMinutes(1), Clock.systemUTC()));
    }
}
