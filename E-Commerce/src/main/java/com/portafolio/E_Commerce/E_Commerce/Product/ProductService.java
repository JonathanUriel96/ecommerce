package com.portafolio.E_Commerce.E_Commerce.Product;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductImageStorage productImageStorage;

    public ProductService(ProductRepository productRepository, ProductImageStorage productImageStorage) {
        this.productRepository = productRepository;
        this.productImageStorage = productImageStorage;
    }

    public Page<Product> findAll(Pageable pageable) {
        return productRepository.findAllByActiveTrue(pageable);
    }

    public Optional<Product> findById(Long id) {
        return productRepository.findByIdAndActiveTrue(id);
    }

    @Transactional
    public Product create(ProductRequest request) {
        return saveNewProduct(request, request.imageUrl());
    }

    @Transactional
    public Product create(ProductRequest request, MultipartFile image) {
        return saveNewProduct(request, productImageStorage.upload(image));
    }

    private Product saveNewProduct(ProductRequest request, String imageUrl) {
        Product product = new Product(
                request.name(),
                request.model(),
                request.category(),
                request.description(),
                request.price(),
                request.stock()
        );
        product.setImageUrl(imageUrl);
        return productRepository.save(product);
    }

    @Transactional
    public Optional<Product> updateImage(Long id, MultipartFile image) {
        return productRepository.findByIdAndActiveTrue(id)
                .map(product -> {
                    product.setImageUrl(productImageStorage.upload(image));
                    return product;
                });
    }

    @Transactional
    public Optional<Product> update(Long id, ProductRequest request) {
        return productRepository.findByIdAndActiveTrue(id)
                .map(product -> {
                    product.setName(request.name());
                    product.setModel(request.model());
                    if (request.imageUrl() != null) {
                        product.setImageUrl(request.imageUrl());
                    }
                    product.setCategory(request.category());
                    product.setDescription(request.description());
                    product.setPrice(request.price());
                    product.setStock(request.stock());
                    return product;
                });
    }

    @Transactional
    public boolean delete(Long id) {
        return productRepository.findByIdAndActiveTrue(id)
                .map(product -> {
                    product.setActive(false);
                    return true;
                })
                .orElse(false);
    }
}
