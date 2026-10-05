package com.litemarket.order;

import com.litemarket.auth.AuthUser;
import com.litemarket.order.DashboardService.DashboardView;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DashboardController {

    private final DashboardService dashboard;

    public DashboardController(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @GetMapping("/api/dashboard")
    public DashboardView get(@AuthenticationPrincipal AuthUser me) {
        return dashboard.dashboard(me.id());
    }
}
