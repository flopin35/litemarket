package com.litemarket.common;

import java.text.Normalizer;
import java.util.Locale;

/** Text helpers with no framework dependencies (unit-tested in SlugsTest). */
public final class Slugs {

    private Slugs() {}

    /** "Ama's Kitchen & Café" becomes "amas-kitchen-cafe". Never returns an empty string. */
    public static String slugify(String input) {
        if (input == null) return "my-shop";
        String s = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace("'", "")
                .replace("’", "")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+)|(-+$)", "");
        if (s.length() > 40) {
            s = s.substring(0, 40).replaceAll("-+$", "");
        }
        return s.isEmpty() ? "my-shop" : s;
    }

    /**
     * Turns a phone number into the international digits WhatsApp expects.
     * "024 123 4567" with country code 233 becomes "233241234567"; "+44 7700 900123" stays "447700900123".
     */
    public static String cleanPhone(String raw, String defaultCountryCode) {
        if (raw == null) return "";
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.startsWith("00")) {
            digits = digits.substring(2);
        } else if (digits.startsWith("0") && defaultCountryCode != null && !defaultCountryCode.isBlank()) {
            digits = defaultCountryCode.replaceAll("[^0-9]", "") + digits.substring(1);
        }
        return digits;
    }

    /** Trims and collapses whitespace; returns null for blank input. */
    public static String clean(String s) {
        if (s == null) return null;
        String t = s.trim().replaceAll("\\s+", " ");
        return t.isEmpty() ? null : t;
    }

    /** Like {@link #clean} but keeps line breaks (for descriptions and notes). */
    public static String cleanMultiline(String s) {
        if (s == null) return null;
        String t = s.replace("\r\n", "\n").trim();
        return t.isEmpty() ? null : t;
    }
}
