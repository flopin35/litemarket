package com.litemarket.store;

import com.litemarket.common.ApiException;
import com.litemarket.common.Slugs;
import com.litemarket.config.AppProperties;
import com.litemarket.plan.PlanService;
import com.litemarket.store.StoreDtos.StoreUpdateRequest;
import com.litemarket.store.StoreDtos.StoreView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
public class StoreService {

    /** Slugs that would clash with website routes. */
    private static final Set<String> RESERVED = Set.of(
            "app", "api", "admin", "login", "signup", "pay", "s", "shop", "shops", "uploads", "pricing", "help", "www");

    private final StoreRepository stores;
    private final PlanService plans;
    private final AppProperties props;

    public StoreService(StoreRepository stores, PlanService plans, AppProperties props) {
        this.stores = stores;
        this.plans = plans;
        this.props = props;
    }

    @Transactional(readOnly = true)
    public Store requireStore(Long ownerId) {
        return stores.findByOwnerId(ownerId).orElseThrow(() -> ApiException.notFound("You don't have a store yet."));
    }

    public String shopUrl(Store s) {
        return props.web().base() + "/s/" + s.getSlug();
    }

    public StoreView view(Store s) {
        return new StoreView(s.getId(), s.getName(), s.getSlug(), s.getWhatsapp(), s.getCurrency(), s.getAbout(),
                s.getAccentColor(), s.getLogoUrl(), s.isOnlinePayments(), s.isWhatsappOrders(), s.getPublicLink(),
                shopUrl(s));
    }

    @Transactional(readOnly = true)
    public StoreView get(Long ownerId) {
        return view(requireStore(ownerId));
    }

    @Transactional
    public StoreView update(Long ownerId, StoreUpdateRequest req) {
        Store s = requireStore(ownerId);
        String slug = req.slug().toLowerCase(Locale.ROOT);
        if (!slug.equals(s.getSlug())) {
            if (RESERVED.contains(slug) || stores.existsBySlug(slug)) {
                throw ApiException.conflict("That shop address is taken. Try another one.");
            }
            s.setSlug(slug);
        }
        String phone = Slugs.cleanPhone(req.whatsapp(), props.brand().defaultCountryCode());
        if (phone.length() < 9 || phone.length() > 15) {
            throw ApiException.badRequest("Please enter a valid WhatsApp number.");
        }
        s.setName(Slugs.clean(req.name()));
        s.setWhatsapp(phone);
        s.setCurrency(req.currency().toUpperCase(Locale.ROOT));
        s.setAbout(Slugs.cleanMultiline(req.about()));
        if (req.accentColor() != null) s.setAccentColor(req.accentColor());
        s.setLogoUrl(Slugs.clean(req.logoUrl()));
        s.setOnlinePayments(req.onlinePayments());
        s.setWhatsappOrders(req.whatsappOrders());
        s.setPublicLink(Slugs.clean(req.publicLink()));
        if (!s.isOnlinePayments() && !s.isWhatsappOrders()) {
            throw ApiException.badRequest("Keep at least one way for customers to order.");
        }
        return view(s);
    }

    /** A free slug based on the store name: "amas-kitchen", then "amas-kitchen-2"... */
    @Transactional(readOnly = true)
    public String uniqueSlug(String storeName) {
        String base = Slugs.slugify(storeName);
        if (RESERVED.contains(base)) base = base + "-shop";
        String candidate = base;
        int n = 2;
        while (stores.existsBySlug(candidate)) {
            candidate = base + "-" + n++;
        }
        return candidate;
    }

    public PlanService plans() {
        return plans;
    }
}
