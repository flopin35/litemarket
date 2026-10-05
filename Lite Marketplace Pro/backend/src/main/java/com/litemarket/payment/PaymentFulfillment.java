package com.litemarket.payment;

import com.litemarket.common.Money;
import com.litemarket.common.WhatsApp;
import com.litemarket.order.OrderService;
import com.litemarket.order.ShopOrder;
import com.litemarket.order.ShopOrderRepository;
import com.litemarket.payment.PaymentDtos.PaymentStatusView;
import com.litemarket.payment.PaymentDtos.PaymentView;
import com.litemarket.plan.PlanService;
import com.litemarket.store.Store;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * The database side of payments, in short transactions (no HTTP calls happen in here).
 * Kept separate from PaymentService so @Transactional applies (Spring proxies skip self-calls).
 */
@Service
public class PaymentFulfillment {

    private static final Logger log = LoggerFactory.getLogger(PaymentFulfillment.class);

    private final PaymentRepository payments;
    private final PlanService plans;
    private final OrderService orders;
    private final ShopOrderRepository orderRepo;

    public PaymentFulfillment(PaymentRepository payments, PlanService plans, OrderService orders,
                              ShopOrderRepository orderRepo) {
        this.payments = payments;
        this.plans = plans;
        this.orders = orders;
        this.orderRepo = orderRepo;
    }

    /** Delivers what was paid for, exactly once. Returns false if it was already delivered. */
    @Transactional
    public boolean fulfill(Long paymentId, String providerTxnId) {
        if (payments.markStatusOnce(paymentId, PaymentStatus.SUCCESS, Instant.now()) == 0) {
            return false;
        }
        Payment p = payments.findById(paymentId).orElseThrow();
        p.setProviderTxnId(truncate(providerTxnId, 120));
        p.setNote(null);
        if (p.getPurpose() == PaymentPurpose.SUBSCRIPTION) {
            plans.applyPlan(p.getStore(), p.getPlanCode());
            log.info("Plan {} activated for store {} ({})", p.getPlanCode(), p.getStore().getSlug(), p.getReference());
        } else if (p.getPurpose() == PaymentPurpose.ORDER && p.getOrderId() != null) {
            orders.markPaidByPayment(p.getOrderId(), p.getProvider());
            log.info("Order payment {} confirmed for store {}", p.getReference(), p.getStore().getSlug());
        }
        return true;
    }

    @Transactional
    public void markFailed(Long paymentId, String note) {
        payments.findById(paymentId).ifPresent(p -> {
            if (p.getStatus() == PaymentStatus.PENDING) {
                p.setStatus(PaymentStatus.FAILED);
                p.setNote(truncate(note, 255));
            }
        });
    }

    @Transactional(readOnly = true)
    public PaymentStatusView statusView(String reference) {
        Payment p = payments.findByReference(reference).orElseThrow();
        Store s = p.getStore();
        String orderNumber = null;
        String whatsappUrl = null;
        if (p.getOrderId() != null) {
            ShopOrder o = orderRepo.findById(p.getOrderId()).orElse(null);
            if (o != null) {
                orderNumber = o.getNumber();
                if (p.getStatus() == PaymentStatus.SUCCESS) {
                    whatsappUrl = WhatsApp.link(s.getWhatsapp(),
                            "Hello " + s.getName() + "! I just paid " + Money.format(p.getAmount(), p.getCurrency())
                                    + " for order " + o.getNumber() + ". Payment reference: " + p.getReference() + ".");
                }
            }
        }
        String message = switch (p.getStatus()) {
            case SUCCESS -> "Payment received. Thank you!";
            case PENDING -> "We're waiting for the payment to be confirmed.";
            case FAILED -> p.getNote() == null ? "The payment didn't go through." : p.getNote();
        };
        return new PaymentStatusView(
                p.getReference(),
                p.getStatus().name(),
                p.getPurpose().name(),
                p.getProvider(),
                p.getAmount(),
                p.getCurrency(),
                p.getPlanCode(),
                p.getPlanCode() == null ? null : plans.planName(p.getPlanCode()),
                p.getPurpose() == PaymentPurpose.SUBSCRIPTION && p.getStatus() == PaymentStatus.SUCCESS
                        ? s.getPlanExpiresAt() : null,
                orderNumber,
                s.getName(),
                s.getSlug(),
                whatsappUrl,
                message);
    }

    public PaymentView view(Payment p) {
        return new PaymentView(p.getReference(), p.getPurpose().name(), p.getProvider(), p.getStatus().name(),
                p.getAmount(), p.getCurrency(), p.getPlanCode(),
                p.getPlanCode() == null ? null : plans.planName(p.getPlanCode()),
                p.getNote(), p.getCreatedAt(), p.getPaidAt());
    }

    static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
