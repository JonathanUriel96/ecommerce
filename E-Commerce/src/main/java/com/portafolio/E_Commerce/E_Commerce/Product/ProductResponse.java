package com.portafolio.E_Commerce.E_Commerce.Product;

import java.math.BigDecimal;

public record ProductResponse(
        Long id,
        String name,
        String model,
        String description,
        BigDecimal price,
        Integer stock
) {
    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getModel(),
                product.getDescription(),
                product.getPrice(),
                product.getStock()
        );
    }
}
