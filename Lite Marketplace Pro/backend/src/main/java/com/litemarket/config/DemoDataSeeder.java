package com.litemarket.config;

import com.litemarket.order.OrderChannel;
import com.litemarket.order.OrderItem;
import com.litemarket.order.OrderStatus;
import com.litemarket.order.ShopOrder;
import com.litemarket.order.ShopOrderRepository;
import com.litemarket.product.Product;
import com.litemarket.product.ProductRepository;
import com.litemarket.store.Store;
import com.litemarket.store.StoreRepository;
import com.litemarket.user.Role;
import com.litemarket.user.User;
import com.litemarket.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * On an empty database (and app.demo.seed=true) creates:
 *   - the admin account (ADMIN_EMAIL / ADMIN_PASSWORD)
 *   - a demo seller, demo@litemarket.dev / demo12345, with the shop "Ama's Kitchen" at /s/amas-kitchen
 * so a fresh install has something to look at. Set DEMO_SEED=false for production.
 */
@Component
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final AppProperties props;
    private final UserRepository users;
    private final StoreRepository stores;
    private final ProductRepository products;
    private final ShopOrderRepository orders;
    private final PasswordEncoder encoder;

    public DemoDataSeeder(AppProperties props, UserRepository users, StoreRepository stores,
                          ProductRepository products, ShopOrderRepository orders, PasswordEncoder encoder) {
        this.props = props;
        this.users = users;
        this.stores = stores;
        this.products = products;
        this.orders = orders;
        this.encoder = encoder;
    }

    private record Item(String name, String price, String category, String description, boolean featured, Integer stock) {}

    @Override
    @Transactional
    public void run(String... args) {
        if (!props.demo().seed() || users.count() > 0) return;

        User admin = user(props.demo().adminEmail(), props.demo().adminPassword(), "Platform Admin", Role.ADMIN);
        store(admin, "Lite Marketplace HQ", "hq", "233200000000",
                "The admin's own shop. Use it to test, or delete its products.");

        User seller = user("demo@litemarket.dev", "demo12345", "Ama Mensah", Role.SELLER);
        Store shop = store(seller, "Ama's Kitchen", "amas-kitchen", "233241234567",
                "Home-cooked Ghanaian meals and drinks, delivered hot around Accra. Order on WhatsApp or pay with MoMo.");
        shop.setAccentColor("#E8590C");
        shop.setPlanCode("MONTHLY");
        shop.setPlanExpiresAt(Instant.now().plus(Duration.ofDays(21)));

        List<Item> menu = List.of(
                new Item("Jollof Rice & Grilled Chicken", "45", "Food",
                        "Smoky party jollof with a quarter grilled chicken, fried plantain and fresh salad.", true, null),
                new Item("Waakye Special", "35", "Food",
                        "Waakye with gari, spaghetti, egg, wele, fish and our house shito.", true, null),
                new Item("Banku & Grilled Tilapia", "60", "Food",
                        "Two balls of banku with a whole grilled tilapia, pepper and onions.", false, 8),
                new Item("Fried Rice & Shito", "40", "Food",
                        "Vegetable fried rice with chicken and a side of hot black shito.", false, null),
                new Item("Kelewele (Spicy Plantain)", "15", "Snacks",
                        "Ripe plantain cubes fried with ginger and pepper. Add peanuts on request.", false, null),
                new Item("Meat Pie (2 pieces)", "10", "Snacks",
                        "Buttery, flaky pastry filled with minced beef. Baked fresh every morning.", false, 3),
                new Item("Sobolo (500ml)", "12", "Drinks",
                        "Chilled hibiscus drink with ginger, pineapple and cloves.", false, null),
                new Item("Fresh Pineapple Juice (500ml)", "15", "Drinks",
                        "100% pressed pineapple, no added sugar.", false, 0));
        List<Product> saved = new ArrayList<>();
        for (Item it : menu) {
            Product p = new Product();
            p.setStore(shop);
            p.setName(it.name());
            p.setPrice(new BigDecimal(it.price()));
            p.setCategory(it.category());
            p.setDescription(it.description());
            p.setFeatured(it.featured());
            p.setStockQty(it.stock());
            saved.add(products.save(p));
        }

        String[] customers = {"Kofi Boateng", "Efua Owusu", "Yaw Asante", "Akosua Darko", "Kwame Nkrumah Jr.",
                "Abena Osei", "Kojo Mensah", "Adwoa Sarpong"};
        String[] places = {"East Legon, near A&C Mall", "Osu, Oxford Street", "Madina Zongo Junction",
                "Spintex, Coca-Cola roundabout", "Achimota Mall", "Dansoman Last Stop"};
        Random r = new Random(7);
        Instant now = Instant.now();
        for (int i = 0; i < 26; i++) {
            ShopOrder o = new ShopOrder();
            o.setStore(shop);
            o.setNumber("LM-DEMO" + (10 + i));
            o.setCustomerName(customers[r.nextInt(customers.length)]);
            o.setCustomerPhone("23324" + (1000000 + r.nextInt(8999999)));
            o.setAddress(places[r.nextInt(places.length)]);
            o.setCurrency(shop.getCurrency());
            o.setChannel(i % 3 == 0 ? OrderChannel.ONLINE : OrderChannel.WHATSAPP);
            Instant created = now.minus(Duration.ofHours(6 + (long) i * 11 + r.nextInt(5)));
            o.setCreatedAt(created);
            int lines = 1 + r.nextInt(3);
            BigDecimal total = BigDecimal.ZERO;
            for (int k = 0; k < lines; k++) {
                Product p = saved.get(r.nextInt(6));
                OrderItem item = new OrderItem(p.getId(), p.getName(), p.getPrice(), 1 + r.nextInt(3));
                o.addItem(item);
                total = total.add(item.lineTotal());
            }
            o.setTotal(total);
            o.setItemsSummary(String.join(", ", o.getItems().stream().map(x -> x.getQuantity() + " x " + x.getName()).toList()));
            OrderStatus status = i < 3 ? OrderStatus.NEW : i == 7 ? OrderStatus.CANCELLED
                    : i % 4 == 0 ? OrderStatus.PAID : OrderStatus.DELIVERED;
            o.setStatus(status);
            if (status.countsAsSale()) {
                o.setPaidAt(created.plus(Duration.ofMinutes(20)));
                o.setStockDeducted(true);
                o.setPaymentProvider(o.getChannel() == OrderChannel.ONLINE ? "paystack" : null);
            }
            orders.save(o);
        }
        log.info("Demo data created. Admin: {} | Seller: demo@litemarket.dev / demo12345 | Shop: /s/amas-kitchen",
                props.demo().adminEmail());
    }

    private User user(String email, String password, String name, Role role) {
        User u = new User();
        u.setEmail(email.toLowerCase());
        u.setPasswordHash(encoder.encode(password));
        u.setFullName(name);
        u.setRole(role);
        return users.save(u);
    }

    private Store store(User owner, String name, String slug, String phone, String about) {
        Store s = new Store();
        s.setOwner(owner);
        s.setName(name);
        s.setSlug(slug);
        s.setWhatsapp(phone);
        s.setCurrency(props.plans().currency());
        s.setAbout(about);
        return stores.save(s);
    }
}
