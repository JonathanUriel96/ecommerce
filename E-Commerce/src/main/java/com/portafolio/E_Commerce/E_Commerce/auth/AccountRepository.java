package com.portafolio.E_Commerce.E_Commerce.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findFirstByUsernameIgnoreCaseOrEmailIgnoreCase(String username, String email);
    Optional<Account> findFirstByEmailIgnoreCase(String email);
    Optional<Account> findByGoogleSubject(String googleSubject);
    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmailIgnoreCase(String email);
}
