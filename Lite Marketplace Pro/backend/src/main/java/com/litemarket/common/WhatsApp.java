package com.litemarket.common;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** Builds wa.me links that open a chat with the message already typed. */
public final class WhatsApp {

    private WhatsApp() {}

    public static String link(String phoneDigits, String message) {
        String text = URLEncoder.encode(message == null ? "" : message, StandardCharsets.UTF_8).replace("+", "%20");
        String phone = phoneDigits == null ? "" : phoneDigits.replaceAll("[^0-9]", "");
        return "https://wa.me/" + phone + "?text=" + text;
    }
}
