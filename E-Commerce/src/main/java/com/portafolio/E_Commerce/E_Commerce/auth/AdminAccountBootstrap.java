package com.portafolio.E_Commerce.E_Commerce.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminAccountBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminAccountBootstrap.class);

    private final AccountRepository accounts;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String password;

    public AdminAccountBootstrap(
            AccountRepository accounts,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.username:}") String username,
            @Value("${app.admin.password:}") String password
    ) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
        this.username = username;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (username.isBlank() || password.isBlank()) {
            log.warn("No initial administrator created. Configure ADMIN_USERNAME and ADMIN_PASSWORD.");
            return;
        }
        if (accounts.existsByUsernameIgnoreCase(username)) {
            return;
        }
        accounts.save(new Account(username.trim().toLowerCase(), username.trim(), null,
                passwordEncoder.encode(password), AccountRole.ADMIN));
        log.info("Created initial administrator account '{}'.", username);
    }
}
