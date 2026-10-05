package com.litemarket.payment.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.litemarket.common.ApiException;
import com.litemarket.config.AppProperties;
import com.litemarket.payment.gateway.GatewayModels.ProviderOption;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.List;
import java.util.Optional;

/** All payment gateways. Those without keys are disabled and hidden from customers. */
@Component
public class GatewayRegistry {

    private static final Logger log = LoggerFactory.getLogger(GatewayRegistry.class);

    private final List<PaymentGateway> all;

    public GatewayRegistry(AppProperties props, ObjectMapper mapper) {
        HttpJson http = new HttpJson(mapper);
        AppProperties.Payments p = props.payments();
        this.all = List.of(
                new PaystackGateway(p.paystack().secretKey(), p.paystack().baseUrl(), http),
                new FlutterwaveGateway(p.flutterwave().secretKey(), p.flutterwave().webhookHash(),
                        p.flutterwave().baseUrl(), http),
                new StripeGateway(p.stripe().secretKey(), p.stripe().webhookSecret(), p.stripe().baseUrl(), http,
                        Clock.systemUTC()),
                new DemoGateway(p.demoMode(), props.web().base()));
        log.info("Payment gateways enabled: {}", enabled().stream().map(PaymentGateway::id).toList());
    }

    public List<PaymentGateway> enabled() {
        return all.stream().filter(PaymentGateway::enabled).toList();
    }

    public List<ProviderOption> options() {
        return enabled().stream().map(g -> new ProviderOption(g.id(), g.label())).toList();
    }

    public Optional<PaymentGateway> find(String id) {
        return all.stream().filter(g -> g.id().equalsIgnoreCase(id == null ? "" : id)).findFirst();
    }

    /** The enabled gateway with this id, or a 400 error the customer can read. */
    public PaymentGateway require(String id) {
        return find(id).filter(PaymentGateway::enabled)
                .orElseThrow(() -> ApiException.badRequest("That payment option isn't available. Choose another one."));
    }
}
