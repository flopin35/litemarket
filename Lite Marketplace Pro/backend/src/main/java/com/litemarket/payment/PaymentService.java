package com.litemarket.payment;

import com.litemarket.auth.AuthUser;
import com.litemarket.common.ApiException;
import com.litemarket.common.Money;
import com.litemarket.common.Tokens;
import com.litemarket.config.AppProperties;
import com.litemarket.config.AppProperties.Plan;
import com.litemarket.order.ShopOrder;
import com.litemarket.order.ShopOrderRepository;
import com.litemarket.payment.PaymentDtos.BillingView;
import com.litemarket.payment.PaymentDtos.CheckoutView;
import com.litemarket.payment.PaymentDtos.PaymentStatusView;
import com.litemarket.payment.gateway.DemoGateway;
import com.litemarket.payment.gateway.GatewayException;
import com.litemarket.payment.gateway.GatewayModels.InitRequest;
import com.litemarket.payment.gateway.GatewayModels.InitResult;
import com.litemarket.payment.gateway.GatewayModels.PaymentRef;
import com.litemarket.payment.gateway.GatewayModels.Split;
import com.litemarket.payment.gateway.GatewayModels.VerifyResult;
import com.litemarket.payment.gateway.GatewayModels.VerifyStatus;
import com.litemarket.payment.gateway.GatewayModels.WebhookEvent;
import com.litemarket.payment.gateway.GatewayRegistry;
import com.litemarket.payment.gateway.PaymentGateway;
import com.litemarket.plan.PlanOption;
import com.litemarket.plan.PlanService;
import com.litemarket.store.Store;
import com.litemarket.store.StoreService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.function.Function;

/**
 * Starts and confirms payments. A payment only counts once the gateway confirms it server-to-server
 * (verify), whether that is triggered by the customer coming back or by a signed webhook.
 * Amount and currency are checked against what we asked for before anything is delivered.
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository payments;
    private final GatewayRegistry gateways;
    private final PaymentFulfillment fulfillment;
    private final StoreService stores;
    private final PlanService plans;
    private final ShopOrderRepository orders;
    private final AppProperties props;

    public PaymentService(PaymentRepository payments, GatewayRegistry gateways, PaymentFulfillment fulfillment,
                          StoreService stores, PlanService plans, ShopOrderRepository orders, AppProperties props) {
        this.payments = payments;
        this.gateways = gateways;
        this.fulfillment = fulfillment;
        this.stores = stores;
        this.plans = plans;
        this.orders = orders;
        this.props = props;
    }

    // ── Seller plans ───────────────────────────────────────────────────────────

    public BillingView billing(AuthUser me) {
        Store s = stores.requireStore(me.id());
        return new BillingView(
                plans.currency(),
                plans.paidPlans().stream()
                        .map(p -> new PlanOption(p.code(), p.name(), p.price(), p.days(), p.popular()))
                        .toList(),
                plans.view(s),
                gateways.options(),
                payments.findTop50ByStoreIdAndPurposeOrderByCreatedAtDesc(s.getId(), PaymentPurpose.SUBSCRIPTION)
                        .stream().map(fulfillment::view).toList());
    }

    public CheckoutView startSubscription(AuthUser me, String planCode, String providerId) {
        Plan plan = plans.find(planCode).orElseThrow(() -> ApiException.badRequest("Choose a plan."));
        PaymentGateway gateway = gateways.require(providerId);
        Store store = stores.requireStore(me.id());

        Payment p = new Payment();
        p.setReference("SUB-" + Tokens.randomCode(12));
        p.setPurpose(PaymentPurpose.SUBSCRIPTION);
        p.setProvider(gateway.id());
        p.setAmount(Money.round(plan.price()));
        p.setCurrency(plans.currency());
        p.setStore(store);
        p.setPlanCode(plan.code());
        p.setPayerEmail(me.email());
        payments.save(p);

        String web = props.web().base();
        InitRequest req = new InitRequest(
                p.getReference(), p.getAmount(), p.getCurrency(),
                me.email(), store.getWhatsapp(), store.getName(),
                props.brand().name() + ": " + plan.name() + " plan",
                plan.name() + " plan for " + store.getName() + " (" + plan.days() + " days)",
                web + "/app/billing/callback",
                web + "/app/billing?cancelled=1",
                null);
        return begin(p, gateway, req);
    }

    // ── Customer orders ────────────────────────────────────────────────────────

    public CheckoutView startOrderPayment(Long orderId, String providerId) {
        ShopOrder o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found."));
        Store s = o.getStore();
        PaymentGateway gateway = gateways.require(providerId);

        BigDecimal fee = Money.percentOf(o.getTotal(), props.payments().commissionPercent());
        BigDecimal sellerAmount = o.getTotal().subtract(fee);
        String destination = destinationFor(gateway.id(), s);

        Payment p = new Payment();
        p.setReference("PAY-" + Tokens.randomCode(12));
        p.setPurpose(PaymentPurpose.ORDER);
        p.setProvider(gateway.id());
        p.setAmount(o.getTotal());
        p.setCurrency(o.getCurrency());
        p.setStore(s);
        p.setOrderId(o.getId());
        p.setPayerEmail(o.getCustomerEmail());
        p.setPlatformFee(fee);
        p.setSellerAmount(sellerAmount);
        p.setSettlement(gateway instanceof DemoGateway ? Settlement.NONE
                : destination != null ? Settlement.SPLIT : Settlement.OWED);
        payments.save(p);

        String web = props.web().base();
        String description = "Order " + o.getNumber() + ": " + o.getItemsSummary();
        if (description.length() > 200) description = description.substring(0, 197) + "...";
        InitRequest req = new InitRequest(
                p.getReference(), p.getAmount(), p.getCurrency(),
                o.getCustomerEmail(), o.getCustomerPhone(), o.getCustomerName(),
                s.getName(), description,
                web + "/s/" + s.getSlug() + "/thanks",
                web + "/s/" + s.getSlug() + "?checkout=cancelled",
                destination == null ? null : new Split(destination, fee, sellerAmount));
        return begin(p, gateway, req);
    }

    private static String destinationFor(String gatewayId, Store s) {
        String d = switch (gatewayId) {
            case "paystack" -> s.getPaystackSubaccount();
            case "flutterwave" -> s.getFlutterwaveSubaccount();
            case "stripe" -> s.getStripeAccount();
            default -> null;
        };
        return d == null || d.isBlank() ? null : d.trim();
    }

    private CheckoutView begin(Payment p, PaymentGateway gateway, InitRequest req) {
        try {
            InitResult r = gateway.initialize(req);
            p.setProviderRef(r.providerRef());
            p.setCheckoutUrl(r.checkoutUrl());
            payments.save(p);
            return new CheckoutView(p.getReference(), r.checkoutUrl());
        } catch (GatewayException e) {
            log.warn("{} could not start payment {}: {}", gateway.id(), p.getReference(), e.getMessage());
            p.setStatus(PaymentStatus.FAILED);
            p.setNote(PaymentFulfillment.truncate(e.getMessage(), 255));
            payments.save(p);
            throw ApiException.badGateway("We couldn't open the payment page: " + e.getMessage());
        }
    }

    // ── Confirming ─────────────────────────────────────────────────────────────

    public PaymentStatusView verify(String reference) {
        Payment p = payments.findByReference(reference)
                .orElseThrow(() -> ApiException.notFound("We can't find that payment."));
        if (p.getStatus() != PaymentStatus.SUCCESS) {
            Optional<PaymentGateway> gateway = gateways.find(p.getProvider());
            if (gateway.isPresent()) {
                VerifyResult r;
                try {
                    r = gateway.get().verify(new PaymentRef(p.getReference(), p.getProviderRef(), p.getAmount(), p.getCurrency()));
                } catch (GatewayException e) {
                    log.warn("Could not verify {} with {}: {}", reference, p.getProvider(), e.getMessage());
                    r = VerifyResult.pending("We couldn't reach the payment provider. Try again in a moment.");
                }
                if (r.status() == VerifyStatus.SUCCESS) {
                    boolean currencyOk = r.currency() != null && r.currency().equalsIgnoreCase(p.getCurrency());
                    if (currencyOk && Money.covers(r.amount(), p.getAmount(), p.getCurrency())) {
                        fulfillment.fulfill(p.getId(), r.providerTxnId());
                    } else {
                        log.warn("Payment {} amount/currency mismatch: expected {} {}, got {} {}",
                                reference, p.getAmount(), p.getCurrency(), r.amount(), r.currency());
                        fulfillment.markFailed(p.getId(), "The amount paid didn't match. Contact support with reference "
                                + reference + ".");
                    }
                } else if (r.status() == VerifyStatus.FAILED) {
                    fulfillment.markFailed(p.getId(), r.message());
                }
            }
        }
        return fulfillment.statusView(reference);
    }

    /** The "Pay now" button on the demo checkout page. Only works while demo mode is on. */
    public PaymentStatusView completeDemo(String reference) {
        if (!props.payments().demoMode()) throw ApiException.notFound("Demo payments are turned off.");
        Payment p = payments.findByReference(reference)
                .orElseThrow(() -> ApiException.notFound("We can't find that payment."));
        if (!"demo".equals(p.getProvider())) throw ApiException.badRequest("This isn't a demo payment.");
        if (p.getStatus() == PaymentStatus.PENDING) {
            p.setProviderRef(DemoGateway.PAID_MARKER);
            payments.save(p);
        }
        return verify(reference);
    }

    /** Handles a webhook: check the signature, then confirm with the gateway itself. */
    public void handleWebhook(String providerId, byte[] body, Function<String, String> header) {
        PaymentGateway gateway = gateways.find(providerId).filter(PaymentGateway::enabled)
                .orElseThrow(() -> ApiException.notFound("Unknown payment provider."));
        Optional<WebhookEvent> event = gateway.parseWebhook(body, header);
        if (event.isEmpty()) return;
        String ref = event.get().reference();
        if (payments.findByReference(ref).isPresent()) {
            PaymentStatusView v = verify(ref);
            log.info("Webhook {} {} -> {}", providerId, ref, v.status());
        } else {
            log.info("Webhook {} for unknown reference {} ignored", providerId, ref);
        }
    }
}
