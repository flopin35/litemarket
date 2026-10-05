package com.litemarket;

import com.litemarket.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Lite Marketplace API.
 *
 * Sellers sign up, add products and get a live shop at /s/{slug}. Customers order on
 * WhatsApp or pay online (Paystack, Flutterwave, Stripe). AI features are served by the
 * Python service in /ai-service and reached through {@link com.litemarket.ai.AiClient}.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableConfigurationProperties(AppProperties.class)
@EnableScheduling
public class LiteMarketApplication {

    public static void main(String[] args) {
        SpringApplication.run(LiteMarketApplication.class, args);
    }
}
