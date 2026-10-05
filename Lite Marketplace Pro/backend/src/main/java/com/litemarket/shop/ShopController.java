package com.litemarket.shop;

import com.fasterxml.jackson.databind.JsonNode;
import com.litemarket.ai.AiService;
import com.litemarket.common.RateLimiter;
import com.litemarket.order.OrderDtos.CheckoutRequest;
import com.litemarket.payment.PaymentDtos.CheckoutView;
import com.litemarket.payment.PaymentService;
import com.litemarket.shop.ShopDtos.AssistantRequest;
import com.litemarket.shop.ShopDtos.ShopView;
import com.litemarket.shop.ShopDtos.WhatsAppOrderView;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** Public shop endpoints used by the storefront at /s/{slug}. */
@RestController
@RequestMapping("/api/shops/{slug}")
public class ShopController {

    private final PublicShopService shops;
    private final PaymentService payments;
    private final AiService ai;
    private final RateLimiter orderLimiter = new RateLimiter(10, Duration.ofMinutes(10));
    private final RateLimiter chatLimiter = new RateLimiter(20, Duration.ofMinutes(10));

    public ShopController(PublicShopService shops, PaymentService payments, AiService ai) {
        this.shops = shops;
        this.payments = payments;
        this.ai = ai;
    }

    @GetMapping
    public ShopView shop(@PathVariable("slug") String slug) {
        return shops.shop(slug);
    }

    @PostMapping("/orders")
    public WhatsAppOrderView whatsappOrder(@PathVariable("slug") String slug, @Valid @RequestBody CheckoutRequest req,
                                           HttpServletRequest http) {
        orderLimiter.check(http.getRemoteAddr(), "Too many orders from your network. Wait a few minutes.");
        return shops.whatsappOrder(slug, req);
    }

    @PostMapping("/checkout")
    public CheckoutView checkout(@PathVariable("slug") String slug, @Valid @RequestBody CheckoutRequest req,
                                 HttpServletRequest http) {
        orderLimiter.check(http.getRemoteAddr(), "Too many orders from your network. Wait a few minutes.");
        Long orderId = shops.createOnlineOrder(slug, req);
        return payments.startOrderPayment(orderId, req.provider());
    }

    @PostMapping("/assistant")
    public JsonNode assistant(@PathVariable("slug") String slug, @Valid @RequestBody AssistantRequest req,
                              HttpServletRequest http) {
        chatLimiter.check(http.getRemoteAddr() + "|" + slug, "You're sending messages quickly. Wait a moment.");
        return ai.shopChat(slug, req);
    }
}
