package com.portafolio.E_Commerce.E_Commerce.Product;

import java.math.BigDecimal;
import java.util.List;

public record ProductResponse(
        Long id,
        String name,
        String model,
        String imageUrl,
        List<String> imageUrls,
        ProductCategory category,
        String shortDescription,
        String description,
        BigDecimal price,
        Integer stock
) {
    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getModel(),
                product.getImageUrl(),
                product.getImageUrls(),
                product.getCategory(),
                product.getShortDescription(),
                product.getDescription(),
                product.getPrice(),
                product.getStock()
        );
    }
}
