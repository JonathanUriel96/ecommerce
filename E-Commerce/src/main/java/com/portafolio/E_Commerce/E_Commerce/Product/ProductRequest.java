package com.portafolio.E_Commerce.E_Commerce.Product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank
        @Size(max = 150)
        String name,

        @Size(max = 120)
        String model,

        @Size(max = 2048)
        @URL(protocol = "https")
        String imageUrl,

        ProductCategory category,

        @Size(max = 280)
        String shortDescription,

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
