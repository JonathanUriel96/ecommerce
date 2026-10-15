package com.portafolio.E_Commerce.E_Commerce.auth;

import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.AuthResponse;
import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.AuthProvidersResponse;
import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.CreateStaffRequest;
import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.LoginRequest;
import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.RegisterRequest;
import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final boolean googleEnabled;
    private final String googleAuthorizationUrl;

    public AuthController(
            AuthService authService,
            @Value("${app.auth.google.enabled:false}") boolean googleEnabled,
            @Value("${app.auth.google.authorization-url:http://localhost:8080/oauth2/authorization/google}") String googleAuthorizationUrl) {
        this.authService = authService;
        this.googleEnabled = googleEnabled;
        this.googleAuthorizationUrl = googleAuthorizationUrl;
    }

    @GetMapping("/providers")
    public AuthProvidersResponse providers() {
        return new AuthProvidersResponse(googleEnabled, googleEnabled ? googleAuthorizationUrl : null);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.registerCustomer(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse currentUser(@AuthenticationPrincipal AccountPrincipal principal) {
        return UserResponse.from(principal);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader(name = "Authorization", required = false) String authorization) {
        if (authorization != null && authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            authService.logout(authorization.substring(7).trim());
        }
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createStaff(@Valid @RequestBody CreateStaffRequest request) {
        return authService.createStaffAccount(request);
    }
}
