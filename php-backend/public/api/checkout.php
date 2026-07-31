<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed.'], 405);
}

$input = readJsonBody();
$productId = (string) ($input['productId'] ?? '');
$customerName = trim((string) ($input['customerName'] ?? ''));
$customerEmail = trim((string) ($input['customerEmail'] ?? ''));
$paymentMethod = (string) ($input['paymentMethod'] ?? '');
$availableProducts = products();

if (!isset($availableProducts[$productId]) || $customerName === '' || !filter_var($customerEmail, FILTER_VALIDATE_EMAIL) || !in_array($paymentMethod, ['blik', 'bank-transfer'], true)) {
    jsonResponse(['error' => 'Podaj produkt, imię, poprawny adres e-mail i metodę płatności.'], 400);
}

$product = $availableProducts[$productId];
$sessionId = bin2hex(random_bytes(16));
$currency = 'PLN';
$sign = sha384(implode('|', [$sessionId, $config['p24_merchant_id'], $product['amount'], $currency, $config['p24_crc']]));

try {
    $registration = p24Request($config, '/api/v1/transaction/register', [
        'merchantId' => (int) $config['p24_merchant_id'],
        'posId' => (int) $config['p24_pos_id'],
        'sessionId' => $sessionId,
        'amount' => $product['amount'],
        'currency' => $currency,
        'description' => $product['name'],
        'email' => $customerEmail,
        'client' => $customerName,
        'country' => 'PL',
        'language' => 'pl',
        'urlReturn' => $config['frontend_url'] . '/?payment=returned',
        'urlStatus' => $config['p24_status_url'],
        'sign' => $sign,
    ]);

    $db = database($config);
    $statement = $db->prepare(
        'INSERT INTO orders (session_id, product_id, product_name, amount, currency, customer_name, customer_email, payment_method, payment_status)\n'
        . 'VALUES (:session_id, :product_id, :product_name, :amount, :currency, :customer_name, :customer_email, :payment_method, "pending")'
    );
    $statement->execute([
        'session_id' => $sessionId,
        'product_id' => $productId,
        'product_name' => $product['name'],
        'amount' => $product['amount'],
        'currency' => $currency,
        'customer_name' => $customerName,
        'customer_email' => $customerEmail,
        'payment_method' => $paymentMethod,
    ]);

    $token = $registration['data']['token'] ?? null;
    if (!is_string($token) || $token === '') {
        throw new RuntimeException('Przelewy24 did not return a payment token.');
    }

    jsonResponse(['redirectUrl' => $config['p24_base_url'] . '/trnRequest/' . rawurlencode($token)], 201);
} catch (Throwable $exception) {
    error_log('P24 checkout error: ' . $exception->getMessage());
    jsonResponse(['error' => 'Nie udało się utworzyć płatności. Spróbuj ponownie później.'], 502);
}
