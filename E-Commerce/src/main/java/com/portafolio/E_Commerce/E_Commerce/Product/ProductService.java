package com.portafolio.E_Commerce.E_Commerce.Product;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Page<Product> findAll(Pageable pageable) {
        return productRepository.findAllByActiveTrue(pageable);
    }

    public Optional<Product> findById(Long id) {
        return productRepository.findByIdAndActiveTrue(id);
    }

    @Transactional
    public Product create(ProductRequest request) {
        Product product = new Product(
                request.name(),
                request.model(),
                request.category(),
                request.description(),
                request.price(),
                request.stock()
        );
        return productRepository.save(product);
    }

    @Transactional
    public Optional<Product> update(Long id, ProductRequest request) {
        return productRepository.findByIdAndActiveTrue(id)
                .map(product -> {
                    product.setName(request.name());
                    product.setModel(request.model());
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
