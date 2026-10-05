package com.litemarket.common;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fixed-window rate limiter kept in memory. Good for a single API instance; swap for Redis
 * (same interface) when you run several instances behind a load balancer.
 */
public class RateLimiter {

    private record Window(long startMillis, int count) {}

    private final int limit;
    private final long windowMillis;
    private final Clock clock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimiter(int limit, Duration window) {
        this(limit, window, Clock.systemUTC());
    }

    public RateLimiter(int limit, Duration window, Clock clock) {
        this.limit = limit;
        this.windowMillis = window.toMillis();
        this.clock = clock;
    }

    /** Returns true if this call is allowed for key, false if the key is over its limit. */
    public boolean tryAcquire(String key) {
        long now = clock.millis();
        if (windows.size() > 50_000) {
            windows.entrySet().removeIf(e -> now - e.getValue().startMillis() >= windowMillis);
        }
        Window w = windows.compute(key, (k, old) -> {
            if (old == null || now - old.startMillis() >= windowMillis) return new Window(now, 1);
            return new Window(old.startMillis(), old.count() + 1);
        });
        return w.count() <= limit;
    }

    /** Throws a 429 ApiException when over the limit. */
    public void check(String key, String message) {
        if (!tryAcquire(key)) throw ApiException.tooManyRequests(message);
    }

    public void reset(String key) {
        windows.remove(key);
    }
}
