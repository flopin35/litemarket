package com.litemarket.product;

import com.litemarket.auth.AuthUser;
import com.litemarket.product.ProductDtos.ProductRequest;
import com.litemarket.product.ProductDtos.ProductView;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService products;

    public ProductController(ProductService products) {
        this.products = products;
    }

    @GetMapping
    public List<ProductView> list(@AuthenticationPrincipal AuthUser me) {
        return products.list(me.id());
    }

    @PostMapping
    public ProductView create(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ProductRequest req) {
        return products.create(me.id(), req);
    }

    @PutMapping("/{id}")
    public ProductView update(@AuthenticationPrincipal AuthUser me, @PathVariable("id") Long id,
                              @Valid @RequestBody ProductRequest req) {
        return products.update(me.id(), id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthUser me, @PathVariable("id") Long id) {
        products.delete(me.id(), id);
        return ResponseEntity.noContent().build();
    }
}
