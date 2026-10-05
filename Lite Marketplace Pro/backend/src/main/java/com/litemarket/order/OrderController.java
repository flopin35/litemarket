package com.litemarket.order;

import com.litemarket.auth.AuthUser;
import com.litemarket.order.OrderDtos.ManualOrderRequest;
import com.litemarket.order.OrderDtos.OrderView;
import com.litemarket.order.OrderDtos.StatusRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orders;

    public OrderController(OrderService orders) {
        this.orders = orders;
    }

    @GetMapping
    public List<OrderView> list(@AuthenticationPrincipal AuthUser me,
                                @RequestParam(name = "status", required = false) OrderStatus status) {
        return orders.list(me.id(), status);
    }

    @GetMapping("/{id}")
    public OrderView get(@AuthenticationPrincipal AuthUser me, @PathVariable("id") Long id) {
        return orders.get(me.id(), id);
    }

    @PostMapping
    public OrderView create(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ManualOrderRequest req) {
        return orders.createManual(me.id(), req);
    }

    @PutMapping("/{id}")
    public OrderView update(@AuthenticationPrincipal AuthUser me, @PathVariable("id") Long id,
                            @Valid @RequestBody ManualOrderRequest req) {
        return orders.update(me.id(), id, req);
    }

    @PatchMapping("/{id}/status")
    public OrderView setStatus(@AuthenticationPrincipal AuthUser me, @PathVariable("id") Long id,
                               @Valid @RequestBody StatusRequest req) {
        return orders.setStatus(me.id(), id, req.status());
    }
}
