package com.portafolio.E_Commerce.E_Commerce.auth;

import com.portafolio.E_Commerce.E_Commerce.auth.AuthDtos.AuthResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Configuration
@ConditionalOnProperty(prefix = "app.auth.google", name = "enabled", havingValue = "true")
public class GoogleOAuth2Config {

    @Bean
    ClientRegistrationRepository googleClientRegistrationRepository(
            @Value("${app.auth.google.client-id:}") String clientId,
            @Value("${app.auth.google.client-secret:}") String clientSecret) {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            throw new IllegalStateException(
                    "Google OAuth está habilitado, pero falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET.");
        }

        ClientRegistration google = CommonOAuth2Provider.GOOGLE.getBuilder("google")
                .clientId(clientId)
                .clientSecret(clientSecret)
                .scope("openid", "profile", "email")
                .build();
        return new InMemoryClientRegistrationRepository(google);
    }

    @Bean
    @Order(1)
    SecurityFilterChain googleOAuthSecurity(
            HttpSecurity http,
            AuthenticationSuccessHandler googleAuthenticationSuccessHandler,
            AuthenticationFailureHandler googleAuthenticationFailureHandler) throws Exception {
        return http
                .securityMatcher("/oauth2/**", "/login/oauth2/**")
                .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
                .oauth2Login(oauth -> oauth
                        .successHandler(googleAuthenticationSuccessHandler)
                        .failureHandler(googleAuthenticationFailureHandler))
                .build();
    }

    @Bean
    AuthenticationSuccessHandler googleAuthenticationSuccessHandler(
            AuthService authService,
            @Value("${app.auth.google.frontend-url:http://localhost:5174}") String frontendUrl) {
        return (request, response, authentication) -> {
            OAuth2User googleUser = (OAuth2User) authentication.getPrincipal();
            Object verifiedClaim = googleUser.getAttributes().get("email_verified");
            boolean emailVerified = Boolean.TRUE.equals(verifiedClaim)
                    || "true".equalsIgnoreCase(String.valueOf(verifiedClaim));
            String subject = stringClaim(googleUser, "sub");
            String email = stringClaim(googleUser, "email");
            String name = stringClaim(googleUser, "name");

            try {
                AuthResponse auth = authService.loginWithGoogle(subject, email, emailVerified, name);
                response.sendRedirect(frontendRedirect(frontendUrl, "oauth_token=" + auth.token()));
            } catch (ResponseStatusException rejectedAccount) {
                String error = rejectedAccount.getStatusCode() == HttpStatus.FORBIDDEN
                        ? "google_customer_only" : "google_login_failed";
                response.sendRedirect(frontendRedirect(frontendUrl, "oauth_error=" + error));
            }
        };
    }

    @Bean
    AuthenticationFailureHandler googleAuthenticationFailureHandler(
            @Value("${app.auth.google.frontend-url:http://localhost:5174}") String frontendUrl) {
        return (request, response, exception) -> response.sendRedirect(
                frontendRedirect(frontendUrl, "oauth_error=google_login_failed"));
    }

    private static String stringClaim(OAuth2User user, String name) {
        Object value = user.getAttributes().get(name);
        return value == null ? null : value.toString();
    }

    private static String frontendRedirect(String frontendUrl, String fragment) {
        return UriComponentsBuilder.fromUriString(frontendUrl)
                .replacePath("/")
                .replaceQuery(null)
                .fragment(fragment)
                .build()
                .toUriString();
    }
}
