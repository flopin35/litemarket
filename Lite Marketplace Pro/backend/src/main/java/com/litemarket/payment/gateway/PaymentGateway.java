package com.litemarket.payment.gateway;

import com.litemarket.payment.gateway.GatewayModels.InitRequest;
import com.litemarket.payment.gateway.GatewayModels.InitResult;
import com.litemarket.payment.gateway.GatewayModels.PaymentRef;
import com.litemarket.payment.gateway.GatewayModels.VerifyResult;
import com.litemarket.payment.gateway.GatewayModels.WebhookEvent;

import java.util.Optional;
import java.util.function.Function;

/**
 * One payment provider. To add another (Hubtel, M-Pesa, PayPal...), implement this interface
 * and register it in GatewayRegistry. Nothing else in the app needs to change.
 */
public interface PaymentGateway {

    /** Short id stored with each payment, e.g. "paystack". */
    String id();

    /** Name shown on buttons. */
    String label();

    /** False when the provider's keys aren't configured. */
    boolean enabled();

    /** Creates a hosted checkout page. Throws GatewayException if the provider says no. */
    InitResult initialize(InitRequest request);

    /** Asks the provider (server to server) whether this payment went through. */
    VerifyResult verify(PaymentRef payment);

    /**
     * Checks a webhook's signature and pulls out our payment reference.
     * Throws WebhookSignatureException when the signature is wrong. Empty = event we don't use.
     */
    Optional<WebhookEvent> parseWebhook(byte[] body, Function<String, String> header);
}
