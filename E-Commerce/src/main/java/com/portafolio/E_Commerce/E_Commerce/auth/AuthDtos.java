package com.portafolio.E_Commerce.E_Commerce.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 10, max = 72) String password
    ) {}

    public record LoginRequest(
            @NotBlank @Size(max = 254) String identifier,
            @NotBlank @Size(max = 72) String password
    ) {}

    public record CreateStaffRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 100) String username,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 10, max = 72) String password,
            @NotNull AccountRole role
    ) {}

    public record UserResponse(Long id, String name, String username, String email, AccountRole role) {
        public static UserResponse from(Account account) {
            return new UserResponse(account.getId(), account.getName(), account.getUsername(),
                    account.getEmail(), account.getRole());
        }

        public static UserResponse from(AccountPrincipal principal) {
            return new UserResponse(principal.getId(), principal.getName(), principal.getUsername(),
                    principal.getEmail(), principal.getRole());
        }
    }

    public record AuthResponse(String token, String tokenType, Instant expiresAt, UserResponse user) {}

    public record AuthProvidersResponse(boolean googleEnabled, String googleAuthorizationUrl) {}
}
