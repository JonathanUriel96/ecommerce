package com.portafolio.E_Commerce.E_Commerce.Order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CustomerOrderRepository
        extends JpaRepository<CustomerOrder, Long> {
    Page<CustomerOrder> findByCustomerUserIdOrderByCreatedAtDesc(Long customerUserId, Pageable pageable);
}
