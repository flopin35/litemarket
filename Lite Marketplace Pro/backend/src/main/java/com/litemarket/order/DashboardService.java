package com.litemarket.order;

import com.litemarket.order.OrderDtos.DayPoint;
import com.litemarket.order.OrderDtos.OrderView;
import com.litemarket.order.OrderDtos.TopProduct;
import com.litemarket.plan.PlanService;
import com.litemarket.product.ProductRepository;
import com.litemarket.store.Store;
import com.litemarket.store.StoreDtos.PlanView;
import com.litemarket.store.StoreService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    public record DashboardView(
            String currency,
            BigDecimal revenue,
            BigDecimal revenue30,
            long paidOrders,
            long newOrders,
            long totalOrders,
            long productCount,
            BigDecimal averageOrder,
            PlanView plan,
            List<DayPoint> last7,
            List<DayPoint> last30,
            List<TopProduct> topProducts,
            List<OrderView> recentOrders,
            String shopUrl) {}

    private final ShopOrderRepository orders;
    private final ProductRepository products;
    private final StoreService stores;
    private final PlanService plans;

    public DashboardService(ShopOrderRepository orders, ProductRepository products, StoreService stores, PlanService plans) {
        this.orders = orders;
        this.products = products;
        this.stores = stores;
        this.plans = plans;
    }

    @Transactional(readOnly = true)
    public DashboardView dashboard(Long ownerId) {
        Store s = stores.requireStore(ownerId);
        List<ShopOrder> all = orders.findByStoreIdOrderByCreatedAtDesc(s.getId());
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal revenue30 = BigDecimal.ZERO;
        long paid = 0;
        long fresh = 0;
        Map<LocalDate, BigDecimal> byDay = new HashMap<>();
        Map<LocalDate, Integer> countByDay = new HashMap<>();
        Map<String, TopProduct> top = new HashMap<>();

        for (ShopOrder o : all) {
            if (o.getStatus() == OrderStatus.NEW) fresh++;
            if (!o.getStatus().countsAsSale()) continue;
            paid++;
            revenue = revenue.add(o.getTotal());
            LocalDate day = LocalDate.ofInstant(o.getPaidAt() != null ? o.getPaidAt() : o.getCreatedAt(), ZoneOffset.UTC);
            if (!day.isBefore(today.minusDays(29))) {
                revenue30 = revenue30.add(o.getTotal());
                byDay.merge(day, o.getTotal(), BigDecimal::add);
                countByDay.merge(day, 1, Integer::sum);
                for (OrderItem i : o.getItems()) {
                    String key = i.getProductId() != null ? "p" + i.getProductId() : "n" + i.getName();
                    TopProduct prev = top.get(key);
                    top.put(key, prev == null
                            ? new TopProduct(i.getProductId(), i.getName(), i.getQuantity(), i.lineTotal())
                            : new TopProduct(prev.productId(), prev.name(), prev.quantity() + i.getQuantity(),
                                    prev.revenue().add(i.lineTotal())));
                }
            }
        }

        List<DayPoint> last30 = new ArrayList<>();
        for (int k = 29; k >= 0; k--) {
            LocalDate d = today.minusDays(k);
            last30.add(new DayPoint(d, byDay.getOrDefault(d, BigDecimal.ZERO), countByDay.getOrDefault(d, 0)));
        }
        List<DayPoint> last7 = last30.subList(23, 30);

        List<TopProduct> topProducts = top.values().stream()
                .sorted(Comparator.comparing(TopProduct::revenue).reversed())
                .limit(5)
                .toList();

        BigDecimal avg = paid == 0 ? BigDecimal.ZERO
                : revenue.divide(BigDecimal.valueOf(paid), 2, java.math.RoundingMode.HALF_UP);

        return new DashboardView(
                s.getCurrency(),
                revenue,
                revenue30,
                paid,
                fresh,
                all.size(),
                products.countByStoreId(s.getId()),
                avg,
                plans.view(s),
                List.copyOf(last7),
                last30,
                topProducts,
                all.stream().limit(6).map(OrderService::view).toList(),
                stores.shopUrl(s));
    }
}
