package com.portafolio.E_Commerce.E_Commerce;

import com.portafolio.E_Commerce.E_Commerce.Product.Product;
import com.portafolio.E_Commerce.E_Commerce.Product.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ECommerceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @BeforeEach
    void clearProducts() {
        productRepository.deleteAll();
    }

    @Test
    void productListIsPublicAndPaginated() throws Exception {
        productRepository.save(new Product("Mug", "Ceramic", new BigDecimal("12.50"), 5));

        mockMvc.perform(get("/api/products").param("page", "0").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Mug"))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void requestedPageSizeIsCappedAtOneHundred() throws Exception {
        mockMvc.perform(get("/api/products").param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.size").value(100));
    }

    @Test
    void creatingAProductRequiresAdminAndReturnsCreated() throws Exception {
        String body = """
                {"name":"Cup","description":"Steel cup","price":9.99,"stock":8}
                """;

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/products")
                        .header("Authorization", adminAuthorization())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("Cup"));
    }

    @Test
    void invalidProductRequestReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/products")
                        .header("Authorization", adminAuthorization())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Cup","description":"Steel cup","price":0,"stock":8}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatingAProductRequiresAdminAndReturnsUpdatedProduct() throws Exception {
        Product product = productRepository.save(
                new Product("Mug", "Ceramic", new BigDecimal("12.50"), 5));

        mockMvc.perform(put("/api/products/{id}", product.getId())
                        .header("Authorization", adminAuthorization())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Travel mug","description":"Steel","price":15.00,"stock":4}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Travel mug"))
                .andExpect(jsonPath("$.price").value(15.0));
    }

    @Test
    void deletingAProductSoftDeletesIt() throws Exception {
        Product product = productRepository.save(
                new Product("Mug", "Ceramic", new BigDecimal("12.50"), 5));

        mockMvc.perform(delete("/api/products/{id}", product.getId())
                        .header("Authorization", adminAuthorization()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/products/{id}", product.getId()))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty());
    }

    private String adminAuthorization() {
        String credentials = "test-admin:test-password";
        String encoded = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        return "Basic " + encoded;
    }
}
