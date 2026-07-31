<?php

declare(strict_types=1);

$config = require __DIR__ . '/../../private/config.php';

function jsonResponse(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function readJsonBody(): array
{
    $body = file_get_contents('php://input');
    $data = json_decode($body ?: '', true);
    return is_array($data) ? $data : [];
}

function database(array $config): PDO
{
    return new PDO($config['db_dsn'], $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function sha384(string $value): string
{
    return hash('sha384', $value);
}

function p24Request(array $config, string $path, array $payload): array
{
    $curl = curl_init($config['p24_base_url'] . $path);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Basic ' . base64_encode($config['p24_merchant_id'] . ':' . $config['p24_api_key']),
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 20,
    ]);

    $response = curl_exec($curl);
    $curlError = curl_error($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    $data = json_decode(is_string($response) ? $response : '', true);
    if ($curlError || $status < 200 || $status >= 300 || !is_array($data) || (int) ($data['responseCode'] ?? -1) !== 0) {
        throw new RuntimeException('Przelewy24 request failed: ' . ($curlError ?: ($data['error'] ?? 'HTTP ' . $status)));
    }
    return $data;
}

function products(): array
{
    return [
        'basic' => ['name' => 'Kości rytmiczne — Zestaw podstawowy', 'amount' => 2999],
        'expanded' => ['name' => 'Kości rytmiczne — Zestaw rozszerzony', 'amount' => 4999],
        'collector' => ['name' => 'Kości rytmiczne — Edycja kolekcjonerska', 'amount' => 9999],
    ];
}

function sendPurchaseNotification(array $config, array $order): bool
{
    $subject = 'Potwierdzona płatność: zamówienie ' . $order['p24_order_id'];
    $message = "Przelewy24 potwierdziło płatność.\n\n"
        . "Produkt: {$order['product_name']}\n"
        . "Kwota: " . number_format(((int) $order['amount']) / 100, 2, ',', ' ') . " PLN\n"
        . "Kupujący: {$order['customer_name']} ({$order['customer_email']})\n"
        . "Sesja: {$order['session_id']}\n"
        . "Numer zamówienia P24: {$order['p24_order_id']}";
    $headers = [
        'From: ' . $config['mail_from_name'] . ' <' . $config['mail_from'] . '>',
        'Content-Type: text/plain; charset=UTF-8',
    ];

    return mail($config['notification_email'], $subject, $message, implode("\r\n", $headers));
}
