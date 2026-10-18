package com.portafolio.E_Commerce.E_Commerce.Product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank
        @Size(max = 150)
        String name,

        @Size(max = 120)
        String model,

        ProductCategory category,

        @Size(max = 5_000)
        String description,

        @NotNull
        @DecimalMin("0.01")
        @Digits(integer = 8, fraction = 2)
        BigDecimal price,

        @NotNull
        @Min(0)
        Integer stock
) {
    public ProductRequest {
        if (category == null) {
            category = ProductCategory.OTHER;
        }
    }
}
