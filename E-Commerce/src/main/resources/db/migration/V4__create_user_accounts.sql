CREATE TABLE app_users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NULL,
    password_hash VARCHAR(100) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_app_users_username UNIQUE (username),
    CONSTRAINT uk_app_users_email UNIQUE (email),
    CONSTRAINT chk_app_users_role CHECK (user_role IN ('CUSTOMER', 'EMPLOYEE', 'ADMIN'))
);

ALTER TABLE customer_orders
    ADD COLUMN customer_user_id BIGINT NULL;

ALTER TABLE customer_orders
    ADD CONSTRAINT fk_customer_orders_user
        FOREIGN KEY (customer_user_id) REFERENCES app_users(id);

CREATE INDEX idx_customer_orders_user_created
    ON customer_orders (customer_user_id, created_at);
