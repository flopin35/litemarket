package com.litemarket.shop;

import com.litemarket.common.ApiException;
import com.litemarket.common.Money;
import com.litemarket.common.WhatsApp;
import com.litemarket.order.OrderChannel;
import com.litemarket.order.OrderDtos.CheckoutRequest;
import com.litemarket.order.OrderItem;
import com.litemarket.order.OrderService;
import com.litemarket.order.OrderStatus;
import com.litemarket.order.ShopOrder;
import com.litemarket.payment.gateway.GatewayModels.ProviderOption;
import com.litemarket.payment.gateway.GatewayRegistry;
import com.litemarket.product.Product;
import com.litemarket.product.ProductRepository;
import com.litemarket.shop.ShopDtos.PublicProduct;
import com.litemarket.shop.ShopDtos.ShopView;
import com.litemarket.shop.ShopDtos.WhatsAppOrderView;
import com.litemarket.store.Store;
import com.litemarket.store.StoreRepository;
import com.litemarket.user.UserStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/** The customer-facing side of a shop. Never exposes emails, keys or anything private. */
@Service
public class PublicShopService {

    private final StoreRepository stores;
    private final ProductRepository products;
    private final OrderService orders;
    private final GatewayRegistry gateways;

    public PublicShopService(StoreRepository stores, ProductRepository products, OrderService orders,
                             GatewayRegistry gateways) {
        this.stores = stores;
        this.products = products;
        this.orders = orders;
        this.gateways = gateways;
    }

    @Transactional(readOnly = true)
    public Store requireOpenStore(String slug) {
        Store s = stores.findBySlug(slug == null ? "" : slug.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> ApiException.notFound("This shop doesn't exist."));
        if (s.getOwner().getStatus() != UserStatus.ACTIVE) {
            throw ApiException.notFound("This shop is closed.");
        }
        return s;
    }

    public static PublicProduct publicView(Product p) {
        return new PublicProduct(p.getId(), p.getName(), p.getPrice(), p.getCategory(), p.getDescription(),
                p.getImageUrl(), p.isAvailable(), p.isFeatured(),
                p.getStockQty() != null && p.getStockQty() <= 5 ? p.getStockQty() : null);
    }

    /** Products customers see: featured first, then available, then newest. */
    @Transactional(readOnly = true)
    public List<Product> catalog(Store s) {
        return products.findByStoreIdOrderByCreatedAtDesc(s.getId()).stream()
                .sorted(Comparator.comparing((Product p) -> !p.isFeatured())
                        .thenComparing(p -> !p.isAvailable()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ShopView shop(String slug) {
        Store s = requireOpenStore(slug);
        List<Product> list = catalog(s);
        List<String> categories = list.stream().map(Product::getCategory).filter(Objects::nonNull)
                .distinct().sorted().toList();
        List<ProviderOption> providers = s.isOnlinePayments() ? gateways.options() : List.of();
        return new ShopView(s.getName(), s.getSlug(), s.getAbout(), s.getWhatsapp(), s.getCurrency(),
                s.getAccentColor(), s.getLogoUrl(), s.isWhatsappOrders(), !providers.isEmpty(), providers,
                categories, list.stream().map(PublicShopService::publicView).toList(), true);
    }

    /** Saves the order (so the seller sees it in the dashboard) and returns the wa.me link. */
    @Transactional
    public WhatsAppOrderView whatsappOrder(String slug, CheckoutRequest req) {
        Store s = requireOpenStore(slug);
        if (!s.isWhatsappOrders()) throw ApiException.badRequest("This shop takes online payments only.");
        ShopOrder o = orders.createFromCart(s, req.items(), req.customer(), OrderChannel.WHATSAPP, OrderStatus.NEW);
        orders.notifySeller(o, "New WhatsApp order");
        return new WhatsAppOrderView(o.getNumber(), o.getTotal(), o.getCurrency(),
                WhatsApp.link(s.getWhatsapp(), whatsappMessage(s, o)));
    }

    /** Creates an order waiting for payment. The caller then opens the gateway. */
    @Transactional
    public Long createOnlineOrder(String slug, CheckoutRequest req) {
        Store s = requireOpenStore(slug);
        if (!s.isOnlinePayments()) throw ApiException.badRequest("This shop takes orders on WhatsApp only.");
        gateways.require(req.provider());
        String email = req.customer().email();
        if (!"demo".equals(req.provider()) && (email == null || email.isBlank())) {
            throw ApiException.badRequest("Please add your email address for the payment receipt.");
        }
        ShopOrder o = orders.createFromCart(s, req.items(), req.customer(), OrderChannel.ONLINE,
                OrderStatus.PENDING_PAYMENT);
        return o.getId();
    }

    static String whatsappMessage(Store s, ShopOrder o) {
        StringBuilder m = new StringBuilder();
        m.append("Hello ").append(s.getName()).append("! I'd like to order (").append(o.getNumber()).append("):\n");
        for (OrderItem i : o.getItems()) {
            m.append("• ").append(i.getQuantity()).append(" x ").append(i.getName())
                    .append(" (").append(Money.format(i.lineTotal(), o.getCurrency())).append(")\n");
        }
        m.append("Total: ").append(Money.format(o.getTotal(), o.getCurrency())).append("\n");
        m.append("Name: ").append(o.getCustomerName()).append("\n");
        m.append("Phone: ").append(o.getCustomerPhone()).append("\n");
        m.append("Deliver to: ").append(o.getAddress());
        if (o.getNote() != null) m.append("\nNote: ").append(o.getNote());
        return m.toString();
    }
}
