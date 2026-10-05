package com.litemarket.auth;

import com.litemarket.store.StoreDtos.PlanView;
import com.litemarket.store.StoreDtos.StoreView;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {}

    public record SignupRequest(
            @NotBlank @Email @Size(max = 190) String email,
            @NotBlank @Size(min = 8, max = 100, message = "must be at least 8 characters") String password,
            @NotBlank @Size(max = 80) String storeName,
            @NotBlank @Size(max = 30) String whatsapp,
            @Size(max = 120) String fullName) {}

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

    public record ForgotRequest(@NotBlank @Email String email) {}

    public record ResetRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 100, message = "must be at least 8 characters") String password) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 100, message = "must be at least 8 characters") String newPassword) {}

    public record MeView(Long id, String email, String fullName, String role, StoreView store, PlanView plan) {}

    public record AuthResponse(String accessToken, long expiresIn, MeView me) {}

    public record MessageResponse(String message) {}
}
