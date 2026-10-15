package com.portafolio.E_Commerce.E_Commerce.Order;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

//Este record recibe el ID del producto y la cantidad solicitada.
// No recibe el precio: el backend lo consultará en la base de datos para calcular el total con el precio real.

public record OrderItemRequest(
        @NotNull
        @Positive
        Long productId,

        @NotNull
        @Min(1)
        @Max(100)
        Integer quantity
) {
}
