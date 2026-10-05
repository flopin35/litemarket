package com.litemarket.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Set;

/** Money maths in one place. Amounts are BigDecimal in major units (cedis, naira, dollars). */
public final class Money {

    private Money() {}

    /** Currencies that have no minor unit at the payment gateways (Stripe's list). */
    private static final Set<String> ZERO_DECIMAL = Set.of(
            "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG",
            "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF");

    public static boolean isZeroDecimal(String currency) {
        return currency != null && ZERO_DECIMAL.contains(currency.toUpperCase(Locale.ROOT));
    }

    /** 25.50 GHS becomes 2550 (pesewas). */
    public static long toMinor(BigDecimal amount, String currency) {
        int scale = isZeroDecimal(currency) ? 0 : 2;
        return amount.setScale(scale, RoundingMode.HALF_UP).movePointRight(scale).longValueExact();
    }

    public static BigDecimal fromMinor(long minor, String currency) {
        int scale = isZeroDecimal(currency) ? 0 : 2;
        return BigDecimal.valueOf(minor).movePointLeft(scale).setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal round(BigDecimal amount) {
        return (amount == null ? BigDecimal.ZERO : amount).setScale(2, RoundingMode.HALF_UP);
    }

    /** percent% of amount, rounded to 2 places. */
    public static BigDecimal percentOf(BigDecimal amount, BigDecimal percent) {
        if (amount == null || percent == null || percent.signum() <= 0) return BigDecimal.ZERO.setScale(2);
        return amount.multiply(percent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    /** True when paid covers expected (a 1-minor-unit tolerance absorbs gateway rounding). */
    public static boolean covers(BigDecimal paid, BigDecimal expected, String currency) {
        if (paid == null || expected == null) return false;
        return toMinor(paid, currency) + 1 >= toMinor(expected, currency);
    }

    public static String format(BigDecimal amount, String currency) {
        return currency + " " + round(amount).toPlainString();
    }
}
