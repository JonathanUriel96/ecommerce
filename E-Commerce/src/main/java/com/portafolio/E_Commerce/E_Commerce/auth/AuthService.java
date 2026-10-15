package com.portafolio.E_Commerce.E_Commerce.auth;

import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.AuthResponse;
import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.CreateStaffRequest;
import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.LoginRequest;
import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.RegisterRequest;
import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {
    private final AccountRepository accounts;
    private final PasswordEncoder passwordEncoder;
    private final AuthTokenStore tokenStore;

    public AuthService(AccountRepository accounts, PasswordEncoder passwordEncoder, AuthTokenStore tokenStore) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
        this.tokenStore = tokenStore;
    }

    @Transactional
    public AuthResponse registerCustomer(RegisterRequest request) {
        String email = normalize(request.email());
        if (accounts.existsByEmailIgnoreCase(email) || accounts.existsByUsernameIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una cuenta con ese correo.");
        }
        Account account = accounts.save(new Account(email, request.name().trim(), email,
                passwordEncoder.encode(request.password()), AccountRole.CUSTOMER));
        return issueToken(AccountPrincipal.from(account));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String identifier = normalize(request.identifier());
        Account account = accounts.findFirstByUsernameIgnoreCaseOrEmailIgnoreCase(identifier, identifier)
                .filter(Account::isActive)
                .filter(found -> passwordEncoder.matches(request.password(), found.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Usuario/correo o contraseña incorrectos."));
        return issueToken(AccountPrincipal.from(account));
    }

    @Transactional
    public AuthResponse loginWithGoogle(String subject, String email, boolean emailVerified, String name) {
        if (subject == null || subject.isBlank() || subject.length() > 255
                || email == null || email.isBlank() || email.length() > 254
                || !email.contains("@") || !emailVerified) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Google no proporcionó una cuenta con correo verificado.");
        }

        String normalizedEmail = normalize(email);
        Account account = accounts.findByGoogleSubject(subject).orElse(null);
        if (account == null) {
            account = accounts.findFirstByEmailIgnoreCase(normalizedEmail).orElse(null);
            if (account != null) {
                if (account.getRole() != AccountRole.CUSTOMER) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "Google solo está habilitado para cuentas de cliente.");
                }
                if (!account.isActive()) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La cuenta está desactivada.");
                }
                if (account.getGoogleSubject() != null && !account.getGoogleSubject().equals(subject)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Ese correo ya está vinculado a otra cuenta de Google.");
                }
                account.setGoogleSubject(subject);
            } else {
                String safeName = name == null || name.isBlank()
                        ? normalizedEmail.substring(0, normalizedEmail.indexOf('@'))
                        : name.trim();
                if (safeName.length() > 120) {
                    safeName = safeName.substring(0, 120).trim();
                }
                account = new Account("google_" + UUID.randomUUID().toString().replace("-", ""),
                        safeName, normalizedEmail,
                        passwordEncoder.encode(UUID.randomUUID().toString() + UUID.randomUUID()),
                        AccountRole.CUSTOMER);
                account.setGoogleSubject(subject);
            }
            account = accounts.save(account);
        }

        if (!account.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La cuenta está desactivada.");
        }
        if (account.getRole() != AccountRole.CUSTOMER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Google solo está habilitado para cuentas de cliente.");
        }
        return issueToken(AccountPrincipal.from(account));
    }

    @Transactional
    public UserResponse createStaffAccount(CreateStaffRequest request) {
        if (request.role() == AccountRole.CUSTOMER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Las cuentas de clientes se crean desde el registro público.");
        }
        String username = normalize(request.username());
        String email = normalize(request.email());
        if (accounts.existsByUsernameIgnoreCase(username) || accounts.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El usuario o correo ya está registrado.");
        }
        Account account = accounts.save(new Account(username, request.name().trim(), email,
                passwordEncoder.encode(request.password()), request.role()));
        return UserResponse.from(account);
    }

    public void logout(String token) {
        tokenStore.revoke(token);
    }

    private AuthResponse issueToken(AccountPrincipal principal) {
        AuthTokenStore.IssuedToken issued = tokenStore.issue(principal);
        return new AuthResponse(issued.value(), "Bearer", issued.expiresAt(), UserResponse.from(principal));
    }

    private String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
