package com.litemarket.common;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/** Random tokens, hashing and constant-time comparison. */
public final class Tokens {

    private Tokens() {}

    private static final SecureRandom RANDOM = new SecureRandom();
    /** No 0/O or 1/I, so codes are easy to read out over the phone. */
    private static final char[] CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    /** URL-safe random token (refresh tokens, reset links). */
    public static String randomUrlToken(int bytes) {
        byte[] b = new byte[bytes];
        RANDOM.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    /** Short human-friendly code such as "7KQ2XAPM". */
    public static String randomCode(int length) {
        char[] out = new char[length];
        for (int i = 0; i < length; i++) out[i] = CODE_ALPHABET[RANDOM.nextInt(CODE_ALPHABET.length)];
        return new String(out);
    }

    public static String sha256Hex(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static byte[] hmac(String algorithm, byte[] key, byte[] data) {
        try {
            Mac mac = Mac.getInstance(algorithm);
            mac.init(new SecretKeySpec(key, algorithm));
            return mac.doFinal(data);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC failed: " + algorithm, e);
        }
    }

    public static String hmacHex(String algorithm, String key, byte[] data) {
        return HexFormat.of().formatHex(hmac(algorithm, key.getBytes(StandardCharsets.UTF_8), data));
    }

    /** Compares secrets without leaking timing information. */
    public static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
