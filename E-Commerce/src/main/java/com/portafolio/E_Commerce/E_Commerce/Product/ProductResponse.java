package com.portafolio.E_Commerce.E_Commerce.Product;

import java.math.BigDecimal;

public record ProductResponse(
        Long id,
        String name,
        String model,
        ProductCategory category,
        String description,
        BigDecimal price,
        Integer stock
) {
    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getModel(),
                product.getCategory(),
                product.getDescription(),
                product.getPrice(),
                product.getStock()
        );
    }
}
