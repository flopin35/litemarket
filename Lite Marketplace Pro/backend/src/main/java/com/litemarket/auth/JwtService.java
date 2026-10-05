package com.litemarket.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.litemarket.common.Tokens;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;

/**
 * Minimal, dependency-free JWT (HS256) for short-lived access tokens.
 * Unit-tested in JwtServiceTest (valid, tampered, expired and wrong-algorithm tokens).
 */
public class JwtService {

    public record Claims(long userId, String email, String role, long expiresAtEpochSeconds) {}

    private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DEC = Base64.getUrlDecoder();
    private static final String HEADER = ENC.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

    private final byte[] key;
    private final Duration ttl;
    private final Clock clock;
    private final ObjectMapper mapper = new ObjectMapper();

    public JwtService(String secret, Duration ttl, Clock clock) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("app.security.jwt-secret (JWT_SECRET) must be at least 32 characters long.");
        }
        this.key = secret.getBytes(StandardCharsets.UTF_8);
        this.ttl = ttl;
        this.clock = clock;
    }

    public long ttlSeconds() {
        return ttl.getSeconds();
    }

    public String issue(long userId, String email, String role) {
        long now = clock.instant().getEpochSecond();
        ObjectNode payload = mapper.createObjectNode();
        payload.put("sub", String.valueOf(userId));
        payload.put("email", email);
        payload.put("role", role);
        payload.put("iat", now);
        payload.put("exp", now + ttl.getSeconds());
        String body = ENC.encodeToString(payload.toString().getBytes(StandardCharsets.UTF_8));
        String signingInput = HEADER + "." + body;
        return signingInput + "." + ENC.encodeToString(sign(signingInput));
    }

    /** Returns the claims if the token is well-formed, correctly signed and not expired. */
    public Optional<Claims> verify(String token) {
        try {
            if (token == null) return Optional.empty();
            String[] parts = token.split("\\.");
            if (parts.length != 3) return Optional.empty();

            JsonNode header = mapper.readTree(DEC.decode(parts[0]));
            if (!"HS256".equals(header.path("alg").asText())) return Optional.empty();

            byte[] expected = sign(parts[0] + "." + parts[1]);
            byte[] given = DEC.decode(parts[2]);
            if (!MessageDigest.isEqual(expected, given)) return Optional.empty();

            JsonNode p = mapper.readTree(DEC.decode(parts[1]));
            long exp = p.path("exp").asLong(0);
            if (exp <= clock.instant().getEpochSecond()) return Optional.empty();

            return Optional.of(new Claims(
                    Long.parseLong(p.path("sub").asText()),
                    p.path("email").asText(),
                    p.path("role").asText(),
                    exp));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private byte[] sign(String input) {
        return Tokens.hmac("HmacSHA256", key, input.getBytes(StandardCharsets.UTF_8));
    }
}
