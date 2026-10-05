package com.litemarket.payment;

import com.litemarket.auth.AuthUser;
import com.litemarket.payment.PaymentDtos.BillingCheckoutRequest;
import com.litemarket.payment.PaymentDtos.BillingView;
import com.litemarket.payment.PaymentDtos.CheckoutView;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final PaymentService payments;

    public BillingController(PaymentService payments) {
        this.payments = payments;
    }

    @GetMapping
    public BillingView billing(@AuthenticationPrincipal AuthUser me) {
        return payments.billing(me);
    }

    @PostMapping("/checkout")
    public CheckoutView checkout(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody BillingCheckoutRequest req) {
        return payments.startSubscription(me, req.planCode(), req.provider());
    }
}
