package com.portafolio.E_Commerce.E_Commerce.Order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateOrderRequest(
        @NotBlank
        @Size(max = 120)
        String customerName,

        @NotBlank
        @Email
        @Size(max = 254)
        String customerEmail,

        @NotBlank
        @Size(max = 500)
        String shippingAddress,

        @NotEmpty
        @Size(max = 50)
        List<@Valid OrderItemRequest> items
) {
}
