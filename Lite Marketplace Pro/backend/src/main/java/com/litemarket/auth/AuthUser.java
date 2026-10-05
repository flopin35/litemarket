package com.litemarket.auth;

import com.litemarket.user.Role;

/** The logged-in user, taken from a verified access token. Use with @AuthenticationPrincipal. */
public record AuthUser(Long id, String email, Role role) {

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
