package com.litemarket.admin;

import com.litemarket.admin.AdminDtos.AdminPayment;
import com.litemarket.admin.AdminDtos.GivePlanRequest;
import com.litemarket.admin.AdminDtos.Overview;
import com.litemarket.admin.AdminDtos.PayoutRow;
import com.litemarket.admin.AdminDtos.SellerRow;
import com.litemarket.admin.AdminDtos.SplitRequest;
import com.litemarket.admin.AdminDtos.UserStatusRequest;
import com.litemarket.auth.AuthUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Admin only (role ADMIN, enforced in SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService admin;

    public AdminController(AdminService admin) {
        this.admin = admin;
    }

    @GetMapping("/overview")
    public Overview overview() {
        return admin.overview();
    }

    @GetMapping("/sellers")
    public List<SellerRow> sellers(@RequestParam(name = "q", required = false) String q) {
        return admin.sellers(q);
    }

    @PostMapping("/sellers/{storeId}/plan")
    public SellerRow givePlan(@PathVariable("storeId") Long storeId, @Valid @RequestBody GivePlanRequest req) {
        return admin.givePlan(storeId, req.planCode());
    }

    @PostMapping("/sellers/{storeId}/status")
    public SellerRow setStatus(@AuthenticationPrincipal AuthUser me, @PathVariable("storeId") Long storeId,
                               @Valid @RequestBody UserStatusRequest req) {
        return admin.setUserStatus(me.id(), storeId, req.status());
    }

    @PutMapping("/sellers/{storeId}/split")
    public SellerRow setSplit(@PathVariable("storeId") Long storeId, @Valid @RequestBody SplitRequest req) {
        return admin.setSplit(storeId, req);
    }

    @GetMapping("/payments")
    public List<AdminPayment> payments() {
        return admin.payments();
    }

    @GetMapping("/payouts")
    public List<PayoutRow> payouts() {
        return admin.payouts();
    }

    @PostMapping("/payouts/{storeId}/paid")
    public Map<String, Integer> markPaidOut(@PathVariable("storeId") Long storeId) {
        return Map.of("updated", admin.markPaidOut(storeId));
    }
}
