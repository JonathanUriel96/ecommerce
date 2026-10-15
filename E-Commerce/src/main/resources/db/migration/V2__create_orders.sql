CREATE TABLE customer_orders (
                                 id BIGINT NOT NULL AUTO_INCREMENT,
                                 customer_name VARCHAR(120) NOT NULL,
                                 customer_email VARCHAR(254) NOT NULL,
                                 shipping_address VARCHAR(500) NOT NULL,
                                 status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                                 total DECIMAL(12, 2) NOT NULL,
                                 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 PRIMARY KEY (id),
                                 INDEX idx_customer_orders_created_at (created_at)
);

CREATE TABLE order_items (
                             id BIGINT NOT NULL AUTO_INCREMENT,
                             order_id BIGINT NOT NULL,
                             product_id BIGINT NOT NULL,
                             product_name VARCHAR(150) NOT NULL,
                             unit_price DECIMAL(10, 2) NOT NULL,
                             quantity INT NOT NULL,
                             PRIMARY KEY (id),
                             CONSTRAINT fk_order_items_order
                                 FOREIGN KEY (order_id) REFERENCES customer_orders(id),
                             CONSTRAINT fk_order_items_product
                                 FOREIGN KEY (product_id) REFERENCES products(id),
                             CONSTRAINT chk_order_items_quantity
                                 CHECK (quantity > 0)
);