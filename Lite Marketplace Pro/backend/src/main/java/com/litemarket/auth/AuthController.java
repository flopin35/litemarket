package com.litemarket.auth;

import com.litemarket.auth.AuthDtos.AuthResponse;
import com.litemarket.auth.AuthDtos.ChangePasswordRequest;
import com.litemarket.auth.AuthDtos.ForgotRequest;
import com.litemarket.auth.AuthDtos.LoginRequest;
import com.litemarket.auth.AuthDtos.MeView;
import com.litemarket.auth.AuthDtos.MessageResponse;
import com.litemarket.auth.AuthDtos.ResetRequest;
import com.litemarket.auth.AuthDtos.SignupRequest;
import com.litemarket.common.RateLimiter;
import com.litemarket.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
public class AuthController {

    public static final String REFRESH_COOKIE = "lm_refresh";

    private final AuthService auth;
    private final AppProperties props;
    private final RateLimiter loginLimiter = new RateLimiter(8, Duration.ofMinutes(10));
    private final RateLimiter signupLimiter = new RateLimiter(5, Duration.ofHours(1));
    private final RateLimiter forgotLimiter = new RateLimiter(5, Duration.ofHours(1));

    public AuthController(AuthService auth, AppProperties props) {
        this.auth = auth;
        this.props = props;
    }

    @PostMapping("/api/auth/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest req, HttpServletRequest http) {
        signupLimiter.check(http.getRemoteAddr(), "Too many sign-ups from your network. Try again later.");
        return withCookie(auth.signup(req));
    }

    @PostMapping("/api/auth/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        String key = http.getRemoteAddr() + "|" + AuthService.normalizeEmail(req.email());
        loginLimiter.check(key, "Too many tries. Wait 10 minutes and try again.");
        AuthService.Session session = auth.login(req.email(), req.password());
        loginLimiter.reset(key);
        return withCookie(session);
    }

    @PostMapping("/api/auth/refresh")
    public ResponseEntity<AuthResponse> refresh(@CookieValue(name = REFRESH_COOKIE, required = false) String token) {
        return withCookie(auth.refresh(token));
    }

    @PostMapping("/api/auth/logout")
    public ResponseEntity<MessageResponse> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String token) {
        auth.logout(token);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .body(new MessageResponse("Logged out"));
    }

    @PostMapping("/api/auth/forgot-password")
    public MessageResponse forgot(@Valid @RequestBody ForgotRequest req, HttpServletRequest http) {
        forgotLimiter.check(http.getRemoteAddr(), "Too many requests. Try again later.");
        auth.forgotPassword(req.email());
        return new MessageResponse("If that email has an account, a reset link is on its way.");
    }

    @PostMapping("/api/auth/reset-password")
    public MessageResponse reset(@Valid @RequestBody ResetRequest req) {
        auth.resetPassword(req.token(), req.password());
        return new MessageResponse("Your password has been changed. You can log in now.");
    }

    @GetMapping("/api/me")
    public MeView me(@AuthenticationPrincipal AuthUser me) {
        return auth.me(me.id());
    }

    @PutMapping("/api/me/password")
    public MessageResponse changePassword(@AuthenticationPrincipal AuthUser me,
                                          @Valid @RequestBody ChangePasswordRequest req) {
        auth.changePassword(me.id(), req);
        return new MessageResponse("Password changed.");
    }

    private ResponseEntity<AuthResponse> withCookie(AuthService.Session session) {
        Duration maxAge = Duration.ofDays(props.security().refreshTokenDays());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(session.refreshToken(), maxAge).toString())
                .body(session.response());
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(props.security().secureCookies())
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(maxAge)
                .build();
    }
}
