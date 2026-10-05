package com.litemarket.plan;

import com.litemarket.common.ApiException;
import com.litemarket.config.AppProperties;
import com.litemarket.config.AppProperties.Plan;
import com.litemarket.store.Store;
import com.litemarket.store.StoreDtos.PlanView;
import com.litemarket.store.StoreRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Plans, limits and AI credits. Prices and limits come from app.plans in application.yml. */
@Service
public class PlanService {

    private static final Logger log = LoggerFactory.getLogger(PlanService.class);

    private final AppProperties props;
    private final StoreRepository stores;

    public PlanService(AppProperties props, StoreRepository stores) {
        this.props = props;
        this.stores = stores;
    }

    public List<Plan> paidPlans() {
        return props.plans().paid() == null ? List.of() : props.plans().paid();
    }

    public Optional<Plan> find(String code) {
        return props.plans().find(code);
    }

    public String currency() {
        return props.plans().currency();
    }

    public boolean isPremium(Store s) {
        return PlanMath.isPremium(s.getPlanCode(), s.getPlanExpiresAt(), Instant.now());
    }

    /** Max products, or null for unlimited. */
    public Integer productLimit(Store s) {
        return isPremium(s) ? null : props.plans().freeProductLimit();
    }

    public int aiLimit(Store s) {
        return isPremium(s) ? props.plans().paidAiCredits() : props.plans().freeAiCredits();
    }

    public int aiUsed(Store s) {
        return PlanMath.creditsUsed(s.getAiPeriodStart(), s.getAiCreditsUsed(), Instant.now());
    }

    public String planName(String code) {
        if (code == null || PlanMath.FREE.equalsIgnoreCase(code)) return "Free";
        return find(code).map(Plan::name).orElse(code);
    }

    public PlanView view(Store s) {
        boolean premium = isPremium(s);
        String code = premium ? s.getPlanCode() : PlanMath.FREE;
        return new PlanView(
                code,
                planName(code),
                premium,
                premium ? s.getPlanExpiresAt() : null,
                premium ? PlanMath.daysLeft(s.getPlanExpiresAt(), Instant.now()) : 0,
                productLimit(s),
                aiUsed(s),
                aiLimit(s));
    }

    /** Adds a paid plan's days to the store (on top of any days still left). */
    public void applyPlan(Store s, String code) {
        Plan plan = find(code).orElseThrow(() -> ApiException.badRequest("Unknown plan: " + code));
        Instant current = isPremium(s) ? s.getPlanExpiresAt() : null;
        s.setPlanExpiresAt(PlanMath.extend(current, Instant.now(), plan.days()));
        s.setPlanCode(plan.code());
    }

    public void setFree(Store s) {
        s.setPlanCode(PlanMath.FREE);
        s.setPlanExpiresAt(null);
    }

    /**
     * Uses one AI credit. Credits reset on the 1st of every month.
     * Throws 402 AI_CREDITS when the store has used them all.
     */
    @Transactional
    public int consumeAiCredit(Long storeId) {
        Store s = stores.findById(storeId).orElseThrow(() -> ApiException.notFound("Store not found"));
        Instant now = Instant.now();
        int used = PlanMath.creditsUsed(s.getAiPeriodStart(), s.getAiCreditsUsed(), now);
        int limit = aiLimit(s);
        if (used >= limit) {
            throw ApiException.paymentRequired("AI_CREDITS",
                    "You've used all " + limit + " AI credits this month. Upgrade your plan for more.");
        }
        s.setAiPeriodStart(PlanMath.creditPeriodStart(now));
        s.setAiCreditsUsed(used + 1);
        return limit - used - 1;
    }

    /** Gives a credit back when the AI call failed after the credit was taken. */
    @Transactional
    public void refundAiCredit(Long storeId) {
        stores.findById(storeId).ifPresent(s -> {
            if (s.getAiCreditsUsed() > 0) s.setAiCreditsUsed(s.getAiCreditsUsed() - 1);
        });
    }

    /** Every night: plans that ran out go back to Free (they already act Free; this tidies the data). */
    @Scheduled(cron = "0 15 3 * * *")
    @Transactional
    public void downgradeExpired() {
        List<Store> expired = stores.findByPlanCodeNotAndPlanExpiresAtBefore(PlanMath.FREE, Instant.now());
        for (Store s : expired) setFree(s);
        if (!expired.isEmpty()) log.info("Moved {} expired plan(s) back to Free", expired.size());
    }
}
