package com.litemarket.order;

import com.litemarket.common.ApiException;
import com.litemarket.common.Money;
import com.litemarket.common.Slugs;
import com.litemarket.common.Tokens;
import com.litemarket.config.AppProperties;
import com.litemarket.mail.Mailer;
import com.litemarket.order.OrderDtos.CartLine;
import com.litemarket.order.OrderDtos.CustomerInfo;
import com.litemarket.order.OrderDtos.ManualOrderRequest;
import com.litemarket.order.OrderDtos.OrderItemView;
import com.litemarket.order.OrderDtos.OrderView;
import com.litemarket.product.Product;
import com.litemarket.product.ProductRepository;
import com.litemarket.store.Store;
import com.litemarket.store.StoreService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final ShopOrderRepository orders;
    private final ProductRepository products;
    private final StoreService stores;
    private final Mailer mailer;
    private final AppProperties props;

    public OrderService(ShopOrderRepository orders, ProductRepository products, StoreService stores,
                        Mailer mailer, AppProperties props) {
        this.orders = orders;
        this.products = products;
        this.stores = stores;
        this.mailer = mailer;
        this.props = props;
    }

    public static OrderView view(ShopOrder o) {
        List<OrderItemView> items = o.getItems().stream()
                .map(i -> new OrderItemView(i.getProductId(), i.getName(), i.getUnitPrice(), i.getQuantity(), i.lineTotal()))
                .toList();
        return new OrderView(o.getId(), o.getNumber(), o.getCustomerName(), o.getCustomerPhone(), o.getCustomerEmail(),
                o.getAddress(), o.getNote(), o.getChannel(), o.getStatus(), o.getTotal(), o.getCurrency(),
                o.getPaymentProvider(), o.getItemsSummary(), items, o.getCreatedAt(), o.getPaidAt());
    }

    @Transactional(readOnly = true)
    public List<OrderView> list(Long ownerId, OrderStatus status) {
        Store s = stores.requireStore(ownerId);
        List<ShopOrder> found = status == null
                ? orders.findByStoreIdOrderByCreatedAtDesc(s.getId())
                : orders.findByStoreIdAndStatusOrderByCreatedAtDesc(s.getId(), status);
        return found.stream().map(OrderService::view).toList();
    }

    @Transactional(readOnly = true)
    public OrderView get(Long ownerId, Long id) {
        return view(owned(ownerId, id));
    }

    @Transactional
    public OrderView createManual(Long ownerId, ManualOrderRequest req) {
        Store s = stores.requireStore(ownerId);
        ShopOrder o = new ShopOrder();
        o.setStore(s);
        o.setNumber(newNumber());
        o.setChannel(OrderChannel.MANUAL);
        o.setCurrency(s.getCurrency());
        o.setStatus(OrderStatus.NEW);
        applyManual(o, req);
        orders.save(o);
        changeStatus(o, req.status());
        return view(o);
    }

    @Transactional
    public OrderView update(Long ownerId, Long id, ManualOrderRequest req) {
        ShopOrder o = owned(ownerId, id);
        if (o.getChannel() == OrderChannel.MANUAL) {
            applyManual(o, req);
        } else {
            // Cart orders keep their items and total; the seller can still fix contact details.
            o.setCustomerName(Slugs.clean(req.customerName()));
            o.setCustomerPhone(Slugs.clean(req.customerPhone()));
            o.setAddress(Slugs.cleanMultiline(req.address()));
            o.setNote(Slugs.cleanMultiline(req.note()));
        }
        changeStatus(o, req.status());
        return view(o);
    }

    @Transactional
    public OrderView setStatus(Long ownerId, Long id, OrderStatus status) {
        ShopOrder o = owned(ownerId, id);
        changeStatus(o, status);
        return view(o);
    }

    /**
     * Builds an order from a shop cart. Prices always come from the database, never from the browser.
     */
    @Transactional
    public ShopOrder createFromCart(Store store, List<CartLine> lines, CustomerInfo c,
                                    OrderChannel channel, OrderStatus status) {
        Map<Long, Integer> qty = new LinkedHashMap<>();
        for (CartLine l : lines) qty.merge(l.productId(), l.quantity(), Integer::sum);

        Map<Long, Product> found = products.findByStoreIdAndIdIn(store.getId(), qty.keySet()).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        ShopOrder o = new ShopOrder();
        o.setStore(store);
        o.setNumber(newNumber());
        o.setChannel(channel);
        o.setStatus(status);
        o.setCurrency(store.getCurrency());
        o.setCustomerName(Slugs.clean(c.name()));
        o.setCustomerPhone(Slugs.cleanPhone(c.phone(), props.brand().defaultCountryCode()));
        o.setCustomerEmail(Slugs.clean(c.email()));
        o.setAddress(Slugs.cleanMultiline(c.address()));
        o.setNote(Slugs.cleanMultiline(c.note()));

        BigDecimal total = BigDecimal.ZERO;
        for (Map.Entry<Long, Integer> e : qty.entrySet()) {
            Product p = found.get(e.getKey());
            if (p == null) throw ApiException.badRequest("One of the products is no longer in this shop. Refresh the page.");
            if (!p.isAvailable()) throw ApiException.badRequest(p.getName() + " is sold out.");
            int q = Math.min(e.getValue(), 99);
            if (p.getStockQty() != null && q > p.getStockQty()) {
                throw ApiException.badRequest("Only " + p.getStockQty() + " " + p.getName() + " left.");
            }
            OrderItem item = new OrderItem(p.getId(), p.getName(), p.getPrice(), q);
            o.addItem(item);
            total = total.add(item.lineTotal());
        }
        o.setTotal(Money.round(total));
        o.setItemsSummary(summary(o.getItems()));
        orders.save(o);
        return o;
    }

    /** Called when an online payment for this order is confirmed. */
    @Transactional
    public ShopOrder markPaidByPayment(Long orderId, String provider) {
        ShopOrder o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        o.setPaymentProvider(provider);
        changeStatus(o, OrderStatus.PAID);
        notifySeller(o, "Paid order");
        return o;
    }

    public void notifySeller(ShopOrder o, String kind) {
        Store s = o.getStore();
        mailer.send(s.getOwner().getEmail(),
                kind + " " + o.getNumber() + " - " + Money.format(o.getTotal(), o.getCurrency()),
                kind + " in " + s.getName() + "\n\n"
                        + "Customer: " + o.getCustomerName() + " (" + o.getCustomerPhone() + ")\n"
                        + "Items: " + o.getItemsSummary() + "\n"
                        + "Total: " + Money.format(o.getTotal(), o.getCurrency()) + "\n"
                        + "Deliver to: " + (o.getAddress() == null ? "-" : o.getAddress()) + "\n\n"
                        + "Open your dashboard: " + props.web().base() + "/app/orders");
    }

    /** Moves an order to a new status and keeps stock counts right. */
    void changeStatus(ShopOrder o, OrderStatus next) {
        if (next == null || next == o.getStatus()) return;
        if (next.countsAsSale()) {
            if (o.getPaidAt() == null) o.setPaidAt(Instant.now());
            if (!o.isStockDeducted()) {
                adjustStock(o, -1);
                o.setStockDeducted(true);
            }
        } else if (next == OrderStatus.CANCELLED && o.isStockDeducted()) {
            adjustStock(o, +1);
            o.setStockDeducted(false);
        }
        o.setStatus(next);
    }

    private void adjustStock(ShopOrder o, int direction) {
        for (OrderItem i : o.getItems()) {
            if (i.getProductId() == null) continue;
            products.findByIdAndStoreId(i.getProductId(), o.getStore().getId()).ifPresent(p -> {
                if (p.getStockQty() != null) {
                    p.setStockQty(Math.max(0, p.getStockQty() + direction * i.getQuantity()));
                }
            });
        }
    }

    private ShopOrder owned(Long ownerId, Long id) {
        Store s = stores.requireStore(ownerId);
        return orders.findByIdAndStoreId(id, s.getId()).orElseThrow(() -> ApiException.notFound("Order not found."));
    }

    private static void applyManual(ShopOrder o, ManualOrderRequest req) {
        String name = Slugs.clean(req.customerName());
        if (name == null) throw ApiException.badRequest("Type the customer's name.");
        o.setCustomerName(name);
        o.setCustomerPhone(Slugs.clean(req.customerPhone()));
        o.setItemsSummary(Slugs.cleanMultiline(req.itemsSummary()));
        o.setTotal(Money.round(req.total()));
        o.setAddress(Slugs.cleanMultiline(req.address()));
        o.setNote(Slugs.cleanMultiline(req.note()));
    }

    static String summary(List<OrderItem> items) {
        return items.stream().map(i -> i.getQuantity() + " x " + i.getName()).collect(Collectors.joining(", "));
    }

    private String newNumber() {
        String n;
        do {
            n = "LM-" + Tokens.randomCode(6);
        } while (orders.existsByNumber(n));
        return n;
    }
}
