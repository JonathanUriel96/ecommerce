package com.portafolio.E_Commerce.E_Commerce.auth;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public final class AccountPrincipal implements UserDetails {
    private final Long id;
    private final String username;
    private final String name;
    private final String email;
    private final String passwordHash;
    private final AccountRole role;
    private final boolean active;

    private AccountPrincipal(Account account) {
        this.id = account.getId();
        this.username = account.getUsername();
        this.name = account.getName();
        this.email = account.getEmail();
        this.passwordHash = account.getPasswordHash();
        this.role = account.getRole();
        this.active = account.isActive();
    }

    public static AccountPrincipal from(Account account) {
        return new AccountPrincipal(account);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() { return passwordHash; }

    @Override
    public String getUsername() { return username; }

    @Override
    public boolean isEnabled() { return active; }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return active; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public AccountRole getRole() { return role; }
}
