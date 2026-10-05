package com.litemarket.product;

import com.litemarket.common.ApiException;
import com.litemarket.common.Money;
import com.litemarket.common.Slugs;
import com.litemarket.plan.PlanService;
import com.litemarket.product.ProductDtos.ProductRequest;
import com.litemarket.product.ProductDtos.ProductView;
import com.litemarket.store.Store;
import com.litemarket.store.StoreService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class ProductService {

    private final ProductRepository products;
    private final StoreService stores;
    private final PlanService plans;

    public ProductService(ProductRepository products, StoreService stores, PlanService plans) {
        this.products = products;
        this.stores = stores;
        this.plans = plans;
    }

    public static ProductView view(Product p) {
        return new ProductView(p.getId(), p.getName(), p.getPrice(), p.getCategory(), p.getDescription(),
                p.getImageUrl(), p.isInStock(), p.getStockQty(), p.isFeatured(), p.isAvailable(), p.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public List<ProductView> list(Long ownerId) {
        Store s = stores.requireStore(ownerId);
        return products.findByStoreIdOrderByCreatedAtDesc(s.getId()).stream().map(ProductService::view).toList();
    }

    @Transactional
    public ProductView create(Long ownerId, ProductRequest req) {
        Store s = stores.requireStore(ownerId);
        Integer limit = plans.productLimit(s);
        if (limit != null && products.countByStoreId(s.getId()) >= limit) {
            throw ApiException.paymentRequired("PLAN_LIMIT",
                    "The Free plan has room for " + limit + " products. Upgrade for unlimited products.");
        }
        Product p = new Product();
        p.setStore(s);
        apply(p, req);
        return view(products.save(p));
    }

    @Transactional
    public ProductView update(Long ownerId, Long id, ProductRequest req) {
        Product p = owned(ownerId, id);
        apply(p, req);
        p.setUpdatedAt(Instant.now());
        return view(p);
    }

    @Transactional
    public void delete(Long ownerId, Long id) {
        products.delete(owned(ownerId, id));
    }

    private Product owned(Long ownerId, Long id) {
        Store s = stores.requireStore(ownerId);
        return products.findByIdAndStoreId(id, s.getId())
                .orElseThrow(() -> ApiException.notFound("Product not found."));
    }

    private static void apply(Product p, ProductRequest req) {
        String name = Slugs.clean(req.name());
        if (name == null) throw ApiException.badRequest("Give the product a name.");
        String image = Slugs.clean(req.imageUrl());
        if (image != null && !(image.startsWith("/uploads/") || image.startsWith("https://"))) {
            throw ApiException.badRequest("The photo must be an uploaded file or an https:// link.");
        }
        p.setName(name);
        p.setPrice(Money.round(req.price()));
        p.setCategory(Slugs.clean(req.category()));
        p.setDescription(Slugs.cleanMultiline(req.description()));
        p.setImageUrl(image);
        p.setStockQty(req.stockQty());
        p.setInStock(req.inStock());
        p.setFeatured(req.featured());
    }
}
