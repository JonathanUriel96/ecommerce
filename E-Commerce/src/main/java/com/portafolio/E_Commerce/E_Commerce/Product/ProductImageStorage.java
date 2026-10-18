package com.portafolio.E_Commerce.E_Commerce.Product;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Set;

@Service
public class ProductImageStorage {

    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final String cloudinaryUrl;

    public ProductImageStorage(@Value("${app.cloudinary.url:}") String cloudinaryUrl) {
        this.cloudinaryUrl = cloudinaryUrl;
    }

    public String upload(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecciona una imagen para el producto.");
        }
        if (image.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "La imagen no puede superar 5 MB.");
        }
        if (!ALLOWED_IMAGE_TYPES.contains(image.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usa una imagen JPG, PNG o WEBP.");
        }
        if (!StringUtils.hasText(cloudinaryUrl)) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "El almacenamiento de imágenes no está configurado en el servidor."
            );
        }

        try {
            Cloudinary cloudinary = new Cloudinary(cloudinaryUrl);
            Map<?, ?> result = cloudinary.uploader().upload(
                    image.getBytes(),
                    ObjectUtils.asMap("folder", "ecommerce/products", "resource_type", "image")
            );
            Object secureUrl = result.get("secure_url");
            if (secureUrl instanceof String url && StringUtils.hasText(url)) {
                return url;
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "El almacenamiento no devolvió la URL de la imagen.");
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo guardar la imagen en el almacenamiento.", exception);
        }
    }
}
