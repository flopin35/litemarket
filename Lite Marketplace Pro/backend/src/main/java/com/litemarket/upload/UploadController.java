package com.litemarket.upload;

import com.litemarket.auth.AuthUser;
import com.litemarket.common.RateLimiter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.Map;

@RestController
public class UploadController {

    private final StorageService storage;
    private final RateLimiter limiter = new RateLimiter(60, Duration.ofMinutes(10));

    public UploadController(StorageService storage) {
        this.storage = storage;
    }

    @PostMapping("/api/uploads")
    public Map<String, String> upload(@AuthenticationPrincipal AuthUser me, @RequestParam("file") MultipartFile file) {
        limiter.check("u" + me.id(), "Too many uploads. Wait a few minutes.");
        return Map.of("url", storage.store(file));
    }
}
