-- Run this in phpMyAdmin before enabling production payments.
CREATE TABLE orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_id VARCHAR(64) NOT NULL,
    product_id VARCHAR(32) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    amount INT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'PLN',
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    payment_method ENUM('blik', 'bank-transfer') NOT NULL,
    payment_status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
    p24_order_id BIGINT UNSIGNED NULL,
    notification_sent TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL DEFAULT NULL,
    notification_sent_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY orders_session_id_unique (session_id),
    UNIQUE KEY orders_p24_order_id_unique (p24_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
