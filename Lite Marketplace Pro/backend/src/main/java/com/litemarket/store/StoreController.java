package com.litemarket.store;

import com.litemarket.auth.AuthUser;
import com.litemarket.store.StoreDtos.StoreUpdateRequest;
import com.litemarket.store.StoreDtos.StoreView;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/store")
public class StoreController {

    private final StoreService stores;

    public StoreController(StoreService stores) {
        this.stores = stores;
    }

    @GetMapping
    public StoreView get(@AuthenticationPrincipal AuthUser me) {
        return stores.get(me.id());
    }

    @PutMapping
    public StoreView update(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody StoreUpdateRequest req) {
        return stores.update(me.id(), req);
    }
}
