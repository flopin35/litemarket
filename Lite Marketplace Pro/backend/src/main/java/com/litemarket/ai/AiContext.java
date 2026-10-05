package com.litemarket.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.litemarket.ai.AiDtos.BroadcastRequest;
import com.litemarket.ai.AiDtos.ProductWriterRequest;
import com.litemarket.ai.AiDtos.ReplyRequest;
import com.litemarket.order.OrderItem;
import com.litemarket.order.OrderStatus;
import com.litemarket.order.ShopOrder;
import com.litemarket.order.ShopOrderRepository;
import com.litemarket.plan.PlanService;
import com.litemarket.product.Product;
import com.litemarket.product.ProductRepository;
import com.litemarket.shop.PublicShopService;
import com.litemarket.shop.ShopDtos.AssistantRequest;
import com.litemarket.shop.ShopDtos.ChatMessage;
import com.litemarket.store.Store;
import com.litemarket.store.StoreService;
import com.litemarket.upload.StorageService;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Reads the database and builds the JSON the AI service needs. Runs in short read-only
 * transactions; the (slow) AI call happens afterwards, outside any transaction.
 */
@Component
public class AiContext {

    /** A request body ready to send, plus whose credits it uses. */
    public record Prepared(Long storeId, boolean whatsappOrders, ObjectNode body) {}

    private final ObjectMapper mapper;
    private final StoreService stores;
    private final PlanService plans;
    private final ProductRepository products;
    private final ShopOrderRepository orders;
    private final PublicShopService shops;
    private final StorageService storage;

    public AiContext(ObjectMapper mapper, StoreService stores, PlanService plans, ProductRepository products,
                     ShopOrderRepository orders, PublicShopService shops, StorageService storage) {
        this.mapper = mapper;
        this.stores = stores;
        this.plans = plans;
        this.products = products;
        this.orders = orders;
        this.shops = shops;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public Prepared productWriter(Long ownerId, ProductWriterRequest req) {
        Store s = stores.requireStore(ownerId);
        ObjectNode body = base(s);
        ObjectNode product = body.putObject("product");
        product.put("name", req.name());
        product.put("category", req.category());
        if (req.price() != null) product.put("price", req.price());
        product.put("notes", req.notes());
        body.put("tone", orDefault(req.tone(), "friendly"));
        body.put("language", orDefault(req.language(), "English"));
        storage.read(req.imageUrl()).ifPresent(f -> {
            ObjectNode img = body.putObject("image");
            img.put("media_type", f.mediaType());
            img.put("data", Base64.getEncoder().encodeToString(f.bytes()));
        });
        return prepared(s, body);
    }

    @Transactional(readOnly = true)
    public Prepared replyDrafts(Long ownerId, ReplyRequest req) {
        Store s = stores.requireStore(ownerId);
        ObjectNode body = base(s);
        body.put("message", req.message());
        body.put("tone", orDefault(req.tone(), "friendly"));
        body.put("language", orDefault(req.language(), "English"));
        if (req.orderId() != null) {
            orders.findByIdAndStoreId(req.orderId(), s.getId()).ifPresent(o -> body.set("order", orderNode(o)));
        }
        return prepared(s, body);
    }

    @Transactional(readOnly = true)
    public Prepared broadcast(Long ownerId, BroadcastRequest req) {
        Store s = stores.requireStore(ownerId);
        List<Product> chosen = req.productIds() == null || req.productIds().isEmpty()
                ? shops.catalog(s).stream().filter(Product::isAvailable).limit(4).toList()
                : products.findByStoreIdAndIdIn(s.getId(), req.productIds());
        ObjectNode body = base(s);
        ArrayNode list = body.putArray("products");
        for (Product p : chosen) list.add(productNode(p));
        body.put("goal", orDefault(req.goal(), "Remind customers what's available this week"));
        body.put("tone", orDefault(req.tone(), "exciting"));
        body.put("language", orDefault(req.language(), "English"));
        return prepared(s, body);
    }

    /** Sales numbers for the coach. The maths happens here and in Python; the AI explains it. */
    @Transactional(readOnly = true)
    public Prepared coach(Long ownerId) {
        Store s = stores.requireStore(ownerId);
        Instant now = Instant.now();
        Instant since30 = now.minus(Duration.ofDays(30));
        Instant since7 = now.minus(Duration.ofDays(7));
        List<ShopOrder> recent = orders.findByStoreIdAndCreatedAtAfter(s.getId(), now.minus(Duration.ofDays(60)));

        Map<Long, int[]> units = new HashMap<>();
        Map<Long, BigDecimal> revenue = new HashMap<>();
        Map<LocalDate, BigDecimal> dayRevenue = new HashMap<>();
        Map<LocalDate, Integer> dayOrders = new HashMap<>();
        Map<OrderStatus, Integer> statusCounts = new EnumMap<>(OrderStatus.class);
        Map<String, Integer> channelCounts = new HashMap<>();
        int staleNew = 0;

        for (ShopOrder o : recent) {
            statusCounts.merge(o.getStatus(), 1, Integer::sum);
            channelCounts.merge(o.getChannel().name(), 1, Integer::sum);
            if (o.getStatus() == OrderStatus.NEW && o.getCreatedAt().isBefore(now.minus(Duration.ofHours(48)))) {
                staleNew++;
            }
            if (!o.getStatus().countsAsSale()) continue;
            Instant when = o.getPaidAt() != null ? o.getPaidAt() : o.getCreatedAt();
            LocalDate day = LocalDate.ofInstant(when, ZoneOffset.UTC);
            dayRevenue.merge(day, o.getTotal(), BigDecimal::add);
            dayOrders.merge(day, 1, Integer::sum);
            if (when.isBefore(since30)) continue;
            for (OrderItem i : o.getItems()) {
                if (i.getProductId() == null) continue;
                int[] u = units.computeIfAbsent(i.getProductId(), k -> new int[2]);
                u[0] += i.getQuantity();
                if (when.isAfter(since7)) u[1] += i.getQuantity();
                revenue.merge(i.getProductId(), i.lineTotal(), BigDecimal::add);
            }
        }

        ObjectNode body = base(s);
        ObjectNode store = (ObjectNode) body.get("store");
        store.put("premium", plans.isPremium(s));
        Integer limit = plans.productLimit(s);
        if (limit != null) store.put("product_limit", limit);
        List<Product> catalog = products.findByStoreIdOrderByCreatedAtDesc(s.getId());
        store.put("product_count", catalog.size());

        ArrayNode ps = body.putArray("products");
        for (Product p : catalog) {
            ObjectNode n = productNode(p);
            int[] u = units.getOrDefault(p.getId(), new int[2]);
            n.put("units_30", u[0]);
            n.put("units_7", u[1]);
            n.put("revenue_30", revenue.getOrDefault(p.getId(), BigDecimal.ZERO));
            n.put("created_days_ago", Duration.between(p.getCreatedAt(), now).toDays());
            ps.add(n);
        }
        ArrayNode daily = body.putArray("daily");
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (int k = 59; k >= 0; k--) {
            LocalDate d = today.minusDays(k);
            ObjectNode n = daily.addObject();
            n.put("date", d.toString());
            n.put("revenue", dayRevenue.getOrDefault(d, BigDecimal.ZERO));
            n.put("orders", dayOrders.getOrDefault(d, 0));
        }
        ObjectNode sc = body.putObject("status_counts");
        statusCounts.forEach((k, v) -> sc.put(k.name(), v));
        ObjectNode cc = body.putObject("channel_counts");
        channelCounts.forEach(cc::put);
        body.put("stale_new_orders", staleNew);
        return prepared(s, body);
    }

    @Transactional(readOnly = true)
    public Prepared shopChat(String slug, AssistantRequest req) {
        Store s = shops.requireOpenStore(slug);
        ObjectNode body = base(s);
        ArrayNode ps = body.putArray("products");
        shops.catalog(s).stream().limit(80).forEach(p -> ps.add(productNode(p)));
        ArrayNode msgs = body.putArray("messages");
        List<ChatMessage> history = req.messages();
        for (ChatMessage m : history.subList(Math.max(0, history.size() - 12), history.size())) {
            ObjectNode n = msgs.addObject();
            n.put("role", m.role());
            n.put("content", m.content());
        }
        ArrayNode cart = body.putArray("cart");
        if (req.cartProductIds() != null) req.cartProductIds().forEach(cart::add);
        return prepared(s, body);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private Prepared prepared(Store s, ObjectNode body) {
        return new Prepared(s.getId(), s.isWhatsappOrders(), body);
    }

    private ObjectNode base(Store s) {
        ObjectNode body = mapper.createObjectNode();
        ObjectNode n = body.putObject("store");
        n.put("name", s.getName());
        n.put("currency", s.getCurrency());
        n.put("about", s.getAbout());
        n.put("shop_url", stores.shopUrl(s));
        n.put("whatsapp_orders", s.isWhatsappOrders());
        n.put("online_payments", s.isOnlinePayments());
        return body;
    }

    private ObjectNode productNode(Product p) {
        ObjectNode n = mapper.createObjectNode();
        n.put("id", p.getId());
        n.put("name", p.getName());
        n.put("price", p.getPrice());
        n.put("category", p.getCategory());
        n.put("description", p.getDescription());
        n.put("available", p.isAvailable());
        if (p.getStockQty() != null) n.put("stock_qty", p.getStockQty());
        n.put("featured", p.isFeatured());
        return n;
    }

    private ObjectNode orderNode(ShopOrder o) {
        ObjectNode n = mapper.createObjectNode();
        n.put("number", o.getNumber());
        n.put("status", o.getStatus().name());
        n.put("channel", o.getChannel().name());
        n.put("total", o.getTotal());
        n.put("customer_name", o.getCustomerName());
        n.put("address", o.getAddress());
        String items = o.getItems().isEmpty() ? o.getItemsSummary()
                : String.join(", ", o.getItems().stream().map(i -> i.getQuantity() + " x " + i.getName()).toList());
        n.put("items", items);
        return n;
    }

    private static String orDefault(String v, String d) {
        return v == null || v.isBlank() ? d : v.trim();
    }
}
