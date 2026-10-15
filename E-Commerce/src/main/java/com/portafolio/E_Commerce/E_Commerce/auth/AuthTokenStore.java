package com.portafolio.E_Commerce.E_Commerce.auth;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AuthTokenStore {
    private static final Duration TOKEN_LIFETIME = Duration.ofHours(12);
    private final ConcurrentHashMap<String, TokenEntry> activeTokens = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    public IssuedToken issue(AccountPrincipal principal) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expiresAt = Instant.now().plus(TOKEN_LIFETIME);
        activeTokens.put(token, new TokenEntry(principal, expiresAt));
        return new IssuedToken(token, expiresAt);
    }

    public AccountPrincipal authenticate(String token) {
        TokenEntry entry = activeTokens.get(token);
        if (entry == null) {
            return null;
        }
        if (Instant.now().isAfter(entry.expiresAt())) {
            activeTokens.remove(token, entry);
            return null;
        }
        return entry.principal();
    }

    public void revoke(String token) {
        if (token != null && !token.isBlank()) {
            activeTokens.remove(token);
        }
    }

    private record TokenEntry(AccountPrincipal principal, Instant expiresAt) {}
    public record IssuedToken(String value, Instant expiresAt) {}
}
