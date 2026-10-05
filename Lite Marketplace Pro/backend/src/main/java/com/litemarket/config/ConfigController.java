package com.litemarket.config;

import com.litemarket.payment.gateway.GatewayModels.ProviderOption;
import com.litemarket.payment.gateway.GatewayRegistry;
import com.litemarket.plan.PlanOption;
import com.litemarket.plan.PlanService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Public settings the website needs before anyone logs in (brand, plans, payment options). */
@RestController
public class ConfigController {

    public record PublicConfig(
            String brandName,
            String supportEmail,
            String currency,
            int freeProductLimit,
            int freeAiCredits,
            int paidAiCredits,
            List<PlanOption> plans,
            List<ProviderOption> providers,
            boolean demoPayments) {}

    private final AppProperties props;
    private final PlanService plans;
    private final GatewayRegistry gateways;

    public ConfigController(AppProperties props, PlanService plans, GatewayRegistry gateways) {
        this.props = props;
        this.plans = plans;
        this.gateways = gateways;
    }

    @GetMapping("/api/config")
    public PublicConfig config() {
        return new PublicConfig(
                props.brand().name(),
                props.brand().supportEmail(),
                props.plans().currency(),
                props.plans().freeProductLimit(),
                props.plans().freeAiCredits(),
                props.plans().paidAiCredits(),
                plans.paidPlans().stream()
                        .map(p -> new PlanOption(p.code(), p.name(), p.price(), p.days(), p.popular()))
                        .toList(),
                gateways.options(),
                props.payments().demoMode());
    }

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
