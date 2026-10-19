CREATE TABLE product_gallery_images (
    product_id BIGINT NOT NULL,
    image_order INT NOT NULL,
    image_url VARCHAR(2048) NOT NULL,
    PRIMARY KEY (product_id, image_order),
    CONSTRAINT fk_product_gallery_images_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
