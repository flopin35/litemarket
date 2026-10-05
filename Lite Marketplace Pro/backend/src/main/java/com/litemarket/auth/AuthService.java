package com.litemarket.auth;

import com.litemarket.auth.AuthDtos.AuthResponse;
import com.litemarket.auth.AuthDtos.ChangePasswordRequest;
import com.litemarket.auth.AuthDtos.MeView;
import com.litemarket.auth.AuthDtos.SignupRequest;
import com.litemarket.common.ApiException;
import com.litemarket.common.Slugs;
import com.litemarket.common.Tokens;
import com.litemarket.config.AppProperties;
import com.litemarket.mail.Mailer;
import com.litemarket.plan.PlanService;
import com.litemarket.store.Store;
import com.litemarket.store.StoreRepository;
import com.litemarket.store.StoreService;
import com.litemarket.user.Role;
import com.litemarket.user.User;
import com.litemarket.user.UserRepository;
import com.litemarket.user.UserStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

/**
 * Sign up, log in, refresh, log out and password reset.
 *
 * Access tokens are short-lived JWTs sent as "Authorization: Bearer". Refresh tokens are random,
 * stored hashed, kept in an HttpOnly cookie and rotated on every use. Presenting an already-used
 * refresh token revokes all of that user's sessions (stolen-token protection).
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    /** What the controller needs: the JSON body plus the raw refresh token for the cookie. */
    public record Session(AuthResponse response, String refreshToken) {}

    private final UserRepository users;
    private final StoreRepository stores;
    private final StoreService storeService;
    private final PlanService plans;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordResetTokenRepository resetTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AppProperties props;
    private final Mailer mailer;

    public AuthService(UserRepository users, StoreRepository stores, StoreService storeService, PlanService plans,
                       RefreshTokenRepository refreshTokens, PasswordResetTokenRepository resetTokens,
                       PasswordEncoder encoder, JwtService jwt, AppProperties props, Mailer mailer) {
        this.users = users;
        this.stores = stores;
        this.storeService = storeService;
        this.plans = plans;
        this.refreshTokens = refreshTokens;
        this.resetTokens = resetTokens;
        this.encoder = encoder;
        this.jwt = jwt;
        this.props = props;
        this.mailer = mailer;
    }

    public static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public Session signup(SignupRequest req) {
        String email = normalizeEmail(req.email());
        if (users.existsByEmail(email)) {
            throw ApiException.conflict("There is already an account with that email. Log in instead.");
        }
        String phone = Slugs.cleanPhone(req.whatsapp(), props.brand().defaultCountryCode());
        if (phone.length() < 9 || phone.length() > 15) {
            throw ApiException.badRequest("Please enter your WhatsApp number, like 024 123 4567.");
        }
        String storeName = Slugs.clean(req.storeName());
        if (storeName == null) throw ApiException.badRequest("Please give your store a name.");

        boolean first = users.count() == 0;
        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(req.password()));
        u.setFullName(Slugs.clean(req.fullName()));
        u.setRole(first ? Role.ADMIN : Role.SELLER);
        users.save(u);

        Store s = new Store();
        s.setOwner(u);
        s.setName(storeName);
        s.setSlug(storeService.uniqueSlug(storeName));
        s.setWhatsapp(phone);
        s.setCurrency(plans.currency());
        s.setAbout("Order on WhatsApp or pay online. We reply fast!");
        stores.save(s);

        log.info("New {} account: {} ({})", u.getRole(), email, s.getSlug());
        mailer.send(email, "Welcome to " + props.brand().name(),
                "Hi " + storeName + ",\n\nYour shop is live at " + storeService.shopUrl(s)
                        + "\nAdd your products and share the link with your customers.\n\n" + props.brand().name());
        return startSession(u);
    }

    @Transactional
    public Session login(String rawEmail, String password) {
        String email = normalizeEmail(rawEmail);
        Optional<User> found = users.findByEmail(email);
        if (found.isEmpty() || !encoder.matches(password, found.get().getPasswordHash())) {
            throw ApiException.unauthorized("That email and password don't match.");
        }
        User u = found.get();
        if (u.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.forbidden("This account is suspended. Contact " + props.brand().supportEmail() + ".");
        }
        u.setLastLoginAt(Instant.now());
        return startSession(u);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Session refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw ApiException.unauthorized("Please log in.");
        }
        RefreshToken token = refreshTokens.findByTokenHash(Tokens.sha256Hex(rawRefreshToken))
                .orElseThrow(() -> ApiException.unauthorized("Please log in."));
        Instant now = Instant.now();
        if (token.getRevokedAt() != null) {
            // A used token came back: someone may have copied it. End every session for this user.
            revokeAll(token.getUser().getId());
            throw ApiException.unauthorized("Your session ended. Please log in again.");
        }
        if (!token.isActive(now)) {
            throw ApiException.unauthorized("Your session ended. Please log in again.");
        }
        User u = token.getUser();
        if (u.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.forbidden("This account is suspended.");
        }
        token.setRevokedAt(now);
        return startSession(u);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
        refreshTokens.findByTokenHash(Tokens.sha256Hex(rawRefreshToken))
                .ifPresent(t -> t.setRevokedAt(Instant.now()));
    }

    /** Always succeeds from the outside, so nobody can probe which emails have accounts. */
    @Transactional
    public void forgotPassword(String rawEmail) {
        users.findByEmail(normalizeEmail(rawEmail)).ifPresent(u -> {
            String raw = Tokens.randomUrlToken(32);
            PasswordResetToken t = new PasswordResetToken();
            t.setUser(u);
            t.setTokenHash(Tokens.sha256Hex(raw));
            t.setExpiresAt(Instant.now().plus(Duration.ofMinutes(30)));
            resetTokens.save(t);
            String link = props.web().base() + "/reset-password?token=" + raw;
            mailer.send(u.getEmail(), "Reset your " + props.brand().name() + " password",
                    "Someone asked to reset your password. If it was you, open this link within 30 minutes:\n\n"
                            + link + "\n\nIf it wasn't you, you can ignore this email.");
        });
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        PasswordResetToken t = resetTokens.findByTokenHash(Tokens.sha256Hex(rawToken == null ? "" : rawToken))
                .orElseThrow(() -> ApiException.badRequest("This reset link is not valid. Ask for a new one."));
        if (t.getUsedAt() != null || !t.getExpiresAt().isAfter(Instant.now())) {
            throw ApiException.badRequest("This reset link has expired. Ask for a new one.");
        }
        t.setUsedAt(Instant.now());
        User u = t.getUser();
        u.setPasswordHash(encoder.encode(newPassword));
        revokeAll(u.getId());
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest req) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.unauthorized("Please log in."));
        if (!encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("Your current password isn't right.");
        }
        u.setPasswordHash(encoder.encode(req.newPassword()));
    }

    @Transactional(readOnly = true)
    public MeView me(Long userId) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.unauthorized("Please log in."));
        return meView(u);
    }

    private MeView meView(User u) {
        Store s = stores.findByOwnerId(u.getId()).orElse(null);
        return new MeView(u.getId(), u.getEmail(), u.getFullName(), u.getRole().name(),
                s == null ? null : storeService.view(s),
                s == null ? null : plans.view(s));
    }

    private Session startSession(User u) {
        String raw = Tokens.randomUrlToken(32);
        RefreshToken rt = new RefreshToken();
        rt.setUser(u);
        rt.setTokenHash(Tokens.sha256Hex(raw));
        rt.setExpiresAt(Instant.now().plus(Duration.ofDays(props.security().refreshTokenDays())));
        refreshTokens.save(rt);
        String access = jwt.issue(u.getId(), u.getEmail(), u.getRole().name());
        return new Session(new AuthResponse(access, jwt.ttlSeconds(), meView(u)), raw);
    }

    private void revokeAll(Long userId) {
        Instant now = Instant.now();
        for (RefreshToken t : refreshTokens.findByUserIdAndRevokedAtIsNull(userId)) {
            t.setRevokedAt(now);
        }
    }
}
