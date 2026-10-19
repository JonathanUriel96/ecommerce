package com.portafolio.E_Commerce.E_Commerce.Product;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 120)
    private String model;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductCategory category = ProductCategory.OTHER;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "short_description", length = 280)
    private String shortDescription;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_gallery_images", joinColumns = @JoinColumn(name = "product_id"))
    @OrderColumn(name = "image_order")
    @Column(name = "image_url", nullable = false, length = 2048)
    private List<String> additionalImageUrls = new ArrayList<>();

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer stock;

    @Column(nullable = false)
    private boolean active = true;

    protected Product() {
        // Constructor requerido por JPA
    }

    public Product(String name, String description, BigDecimal price, Integer stock) {
        this(name, null, ProductCategory.OTHER, description, price, stock);
    }

    public Product(String name, String model, String description, BigDecimal price, Integer stock) {
        this(name, model, ProductCategory.OTHER, description, price, stock);
    }

    public Product(String name, String model, ProductCategory category, String description, BigDecimal price, Integer stock) {
        this.name = name;
        this.model = model;
        this.category = category == null ? ProductCategory.OTHER : category;
        this.description = description;
        this.price = price;
        this.stock = stock;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public ProductCategory getCategory() {
        return category;
    }

    public void setCategory(ProductCategory category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
    }

    public List<String> getImageUrls() {
        List<String> imageUrls = new ArrayList<>();
        if (imageUrl != null && !imageUrl.isBlank()) {
            imageUrls.add(imageUrl);
        }
        for (String additionalImageUrl : additionalImageUrls) {
            if (additionalImageUrl != null && !additionalImageUrl.isBlank() && !imageUrls.contains(additionalImageUrl)) {
                imageUrls.add(additionalImageUrl);
            }
        }
        return imageUrls;
    }

    public List<String> getAdditionalImageUrls() {
        return additionalImageUrls;
    }

    public void addAdditionalImageUrl(String imageUrl) {
        if (imageUrl != null && !imageUrl.isBlank() && !getImageUrls().contains(imageUrl)) {
            additionalImageUrls.add(imageUrl);
        }
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
