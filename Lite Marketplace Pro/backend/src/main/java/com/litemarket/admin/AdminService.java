package com.litemarket.admin;

import com.litemarket.admin.AdminDtos.AdminPayment;
import com.litemarket.admin.AdminDtos.Overview;
import com.litemarket.admin.AdminDtos.PayoutRow;
import com.litemarket.admin.AdminDtos.SellerRow;
import com.litemarket.admin.AdminDtos.SplitRequest;
import com.litemarket.ai.AiClient;
import com.litemarket.common.ApiException;
import com.litemarket.common.Money;
import com.litemarket.common.Slugs;
import com.litemarket.common.Tokens;
import com.litemarket.config.AppProperties;
import com.litemarket.config.AppProperties.Plan;
import com.litemarket.mail.Mailer;
import com.litemarket.order.ShopOrderRepository;
import com.litemarket.payment.Payment;
import com.litemarket.payment.PaymentPurpose;
import com.litemarket.payment.PaymentRepository;
import com.litemarket.payment.PaymentStatus;
import com.litemarket.payment.Settlement;
import com.litemarket.payment.gateway.GatewayRegistry;
import com.litemarket.plan.PlanMath;
import com.litemarket.plan.PlanService;
import com.litemarket.product.ProductRepository;
import com.litemarket.store.Store;
import com.litemarket.store.StoreRepository;
import com.litemarket.store.StoreService;
import com.litemarket.user.User;
import com.litemarket.user.UserRepository;
import com.litemarket.user.UserStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AdminService {

    private final UserRepository users;
    private final StoreRepository stores;
    private final ProductRepository products;
    private final ShopOrderRepository orders;
    private final PaymentRepository payments;
    private final PlanService plans;
    private final StoreService storeService;
    private final GatewayRegistry gateways;
    private final AiClient ai;
    private final Mailer mailer;
    private final AppProperties props;

    public AdminService(UserRepository users, StoreRepository stores, ProductRepository products,
                        ShopOrderRepository orders, PaymentRepository payments, PlanService plans,
                        StoreService storeService, GatewayRegistry gateways, AiClient ai, Mailer mailer,
                        AppProperties props) {
        this.users = users;
        this.stores = stores;
        this.products = products;
        this.orders = orders;
        this.payments = payments;
        this.plans = plans;
        this.storeService = storeService;
        this.gateways = gateways;
        this.ai = ai;
        this.mailer = mailer;
        this.props = props;
    }

    @Transactional(readOnly = true)
    public Overview overview() {
        List<Store> all = stores.findAll();
        long paying = all.stream().filter(plans::isPremium).count();
        BigDecimal subs = payments.sumAmount(PaymentStatus.SUCCESS, PaymentPurpose.SUBSCRIPTION);
        BigDecimal volume = payments.sumAmount(PaymentStatus.SUCCESS, PaymentPurpose.ORDER);
        BigDecimal owed = payments.findBySettlement(Settlement.OWED).stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .map(p -> p.getSellerAmount() == null ? BigDecimal.ZERO : p.getSellerAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Overview(
                users.count(),
                all.size(),
                products.count(),
                orders.count(),
                paying,
                subs == null ? BigDecimal.ZERO : subs,
                volume == null ? BigDecimal.ZERO : volume,
                owed,
                props.plans().currency(),
                ai.healthy(),
                gateways.options(),
                props.payments().demoMode(),
                props.payments().commissionPercent(),
                mailer.enabled());
    }

    @Transactional(readOnly = true)
    public List<SellerRow> sellers(String query) {
        String q = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        List<SellerRow> rows = new ArrayList<>();
        for (Store s : stores.findAllByOrderByCreatedAtDesc()) {
            User u = s.getOwner();
            if (!q.isEmpty() && !(s.getName().toLowerCase(Locale.ROOT).contains(q)
                    || u.getEmail().contains(q) || s.getSlug().contains(q) || s.getWhatsapp().contains(q))) {
                continue;
            }
            rows.add(row(s));
        }
        return rows;
    }

    private SellerRow row(Store s) {
        User u = s.getOwner();
        boolean premium = plans.isPremium(s);
        String code = premium ? s.getPlanCode() : PlanMath.FREE;
        return new SellerRow(s.getId(), u.getId(), s.getName(), s.getSlug(), u.getEmail(), s.getWhatsapp(),
                code, plans.planName(code), premium ? s.getPlanExpiresAt() : null, premium,
                products.countByStoreId(s.getId()), u.getStatus().name(), u.getRole().name(), s.getCreatedAt(),
                s.getFlutterwaveSubaccount(), s.getPaystackSubaccount(), s.getStripeAccount(),
                storeService.shopUrl(s));
    }

    /** Gives a plan by hand (cash or MoMo paid directly), like the original app's Admin tab. */
    @Transactional
    public SellerRow givePlan(Long storeId, String planCode) {
        Store s = stores.findById(storeId).orElseThrow(() -> ApiException.notFound("Store not found."));
        if (PlanMath.FREE.equalsIgnoreCase(planCode)) {
            plans.setFree(s);
            return row(s);
        }
        Plan plan = plans.find(planCode).orElseThrow(() -> ApiException.badRequest("Unknown plan."));
        plans.applyPlan(s, plan.code());
        Payment p = new Payment();
        p.setReference("MAN-" + Tokens.randomCode(12));
        p.setPurpose(PaymentPurpose.SUBSCRIPTION);
        p.setProvider("manual");
        p.setStatus(PaymentStatus.SUCCESS);
        p.setAmount(Money.round(plan.price()));
        p.setCurrency(plans.currency());
        p.setStore(s);
        p.setPlanCode(plan.code());
        p.setPayerEmail(s.getOwner().getEmail());
        p.setNote("Given by admin");
        p.setPaidAt(Instant.now());
        payments.save(p);
        mailer.send(s.getOwner().getEmail(), "Your " + plan.name() + " plan is active",
                "Hi " + s.getName() + ",\n\nYour " + plan.name() + " plan is now active. Enjoy unlimited products!\n\n"
                        + props.brand().name());
        return row(s);
    }

    @Transactional
    public SellerRow setUserStatus(Long adminId, Long storeId, UserStatus status) {
        Store s = stores.findById(storeId).orElseThrow(() -> ApiException.notFound("Store not found."));
        if (s.getOwner().getId().equals(adminId)) throw ApiException.badRequest("You can't suspend yourself.");
        s.getOwner().setStatus(status);
        return row(s);
    }

    @Transactional
    public SellerRow setSplit(Long storeId, SplitRequest req) {
        Store s = stores.findById(storeId).orElseThrow(() -> ApiException.notFound("Store not found."));
        s.setFlutterwaveSubaccount(Slugs.clean(req.flutterwaveSubaccount()));
        s.setPaystackSubaccount(Slugs.clean(req.paystackSubaccount()));
        s.setStripeAccount(Slugs.clean(req.stripeAccount()));
        return row(s);
    }

    @Transactional(readOnly = true)
    public List<AdminPayment> payments() {
        return payments.findTop200ByOrderByCreatedAtDesc().stream().map(p -> new AdminPayment(
                p.getReference(), p.getPurpose().name(), p.getProvider(), p.getStatus().name(), p.getAmount(),
                p.getCurrency(), p.getStore().getName(), p.getStore().getSlug(),
                p.getPlanCode() == null ? null : plans.planName(p.getPlanCode()),
                p.getPayerEmail(), p.getSettlement().name(), p.getPlatformFee(), p.getSellerAmount(),
                p.getCreatedAt(), p.getPaidAt(), p.getNote())).toList();
    }

    /** Money the platform collected for sellers without a split sub-account. */
    @Transactional(readOnly = true)
    public List<PayoutRow> payouts() {
        Map<Long, PayoutRow> rows = new LinkedHashMap<>();
        for (Payment p : payments.findBySettlement(Settlement.OWED)) {
            if (p.getStatus() != PaymentStatus.SUCCESS) continue;
            Store s = p.getStore();
            BigDecimal amount = p.getSellerAmount() == null ? BigDecimal.ZERO : p.getSellerAmount();
            PayoutRow prev = rows.get(s.getId());
            rows.put(s.getId(), prev == null
                    ? new PayoutRow(s.getId(), s.getName(), s.getSlug(), s.getWhatsapp(), s.getOwner().getEmail(),
                    amount, 1, p.getCurrency())
                    : new PayoutRow(s.getId(), s.getName(), s.getSlug(), s.getWhatsapp(), s.getOwner().getEmail(),
                    prev.owed().add(amount), prev.payments() + 1, p.getCurrency()));
        }
        return new ArrayList<>(rows.values());
    }

    @Transactional
    public int markPaidOut(Long storeId) {
        List<Payment> owed = payments.findByStoreIdAndSettlement(storeId, Settlement.OWED);
        int n = 0;
        for (Payment p : owed) {
            if (p.getStatus() == PaymentStatus.SUCCESS) {
                p.setSettlement(Settlement.PAID_OUT);
                n++;
            }
        }
        return n;
    }
}
