<?php

declare(strict_types=1);

/**
 * IMPORTANT: Move this file OUTSIDE public_html before production deployment.
 * Each sample value below is intentionally invalid and MUST be replaced.
 */
return [
    'p24_base_url' => 'https://sandbox.przelewy24.pl', // Replace with https://secure.przelewy24.pl in production.
    'p24_merchant_id' => '123456', // REPLACE: Przelewy24 merchant ID.
    'p24_pos_id' => '123456', // REPLACE: Przelewy24 POS ID.
    'p24_api_key' => 'example-p24-api-key-replace-me', // REPLACE: Przelewy24 REST API key.
    'p24_crc' => 'example-p24-crc-replace-me', // REPLACE: Przelewy24 CRC key.
    'p24_status_url' => 'https://YOUR-DOMAIN.example/api/status.php', // REPLACE: Public HTTPS webhook URL reachable by Przelewy24.
    'frontend_url' => 'https://YOUR-DOMAIN.example', // REPLACE: Public URL of the React application.

    'db_dsn' => 'mysql:host=localhost;dbname=YOUR_DATABASE;charset=utf8mb4', // REPLACE: MySQL DSN from hosting panel.
    'db_user' => 'YOUR_DATABASE_USER', // REPLACE: MySQL user.
    'db_password' => 'example-db-password-replace-me', // REPLACE: MySQL password.

    'notification_email' => 'lukkotecki@gmail.com', // Change only if purchase notifications should go elsewhere.
    'mail_from' => 'shop@YOUR-DOMAIN.example', // REPLACE: Existing sender address at your domain.
    'mail_from_name' => 'Kości rytmiczne',
];
