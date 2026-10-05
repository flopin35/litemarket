package com.litemarket.payment;

import com.litemarket.common.RateLimiter;
import com.litemarket.payment.PaymentDtos.PaymentStatusView;
import com.litemarket.payment.PaymentDtos.VerifyRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** Public: the pages customers land on after paying call these. References are unguessable. */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService payments;
    private final RateLimiter limiter = new RateLimiter(60, Duration.ofMinutes(1));

    public PaymentController(PaymentService payments) {
        this.payments = payments;
    }

    @PostMapping("/verify")
    public PaymentStatusView verify(@Valid @RequestBody VerifyRequest req, HttpServletRequest http) {
        limiter.check(http.getRemoteAddr(), "Too many checks. Wait a minute.");
        return payments.verify(req.reference().trim());
    }

    @PostMapping("/demo/{reference}/complete")
    public PaymentStatusView completeDemo(@PathVariable("reference") String reference, HttpServletRequest http) {
        limiter.check(http.getRemoteAddr(), "Too many checks. Wait a minute.");
        return payments.completeDemo(reference);
    }
}
