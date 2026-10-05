package com.litemarket.payment.gateway;

/** A webhook whose signature didn't check out. It is rejected with HTTP 401. */
public class WebhookSignatureException extends RuntimeException {

    public WebhookSignatureException(String message) {
        super(message);
    }
}
