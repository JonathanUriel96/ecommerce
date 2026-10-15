package com.portafolio.E_Commerce.E_Commerce.Order;

import jakarta.validation.constraints.NotNull;

public record OrderStatusUpdateRequest(@NotNull OrderStatus status) {
}
