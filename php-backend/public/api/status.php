<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed.'], 405);
}

$payload = readJsonBody();
$sessionId = (string) ($payload['sessionId'] ?? '');
$orderId = (int) ($payload['orderId'] ?? 0);
$amount = (int) ($payload['amount'] ?? 0);
$currency = (string) ($payload['currency'] ?? '');
$webhookMerchantId = (int) ($payload['merchantId'] ?? 0);
$webhookPosId = (int) ($payload['posId'] ?? 0);

if ($sessionId === '' || $orderId <= 0 || $amount <= 0 || $currency !== 'PLN'
    || $webhookMerchantId !== (int) $config['p24_merchant_id']
    || $webhookPosId !== (int) $config['p24_pos_id']) {
    jsonResponse(['error' => 'Invalid payment notification.'], 400);
}

try {
    $db = database($config);
    $findOrder = $db->prepare('SELECT * FROM orders WHERE session_id = :session_id LIMIT 1');
    $findOrder->execute(['session_id' => $sessionId]);
    $order = $findOrder->fetch();

    if (!$order || (int) $order['amount'] !== $amount || $order['currency'] !== $currency) {
        jsonResponse(['error' => 'Unknown or invalid order.'], 400);
    }

    $sign = sha384(implode('|', [$sessionId, $orderId, $amount, $currency, $config['p24_crc']]));
    p24Request($config, '/api/v1/transaction/verify', [
        'merchantId' => (int) $config['p24_merchant_id'],
        'posId' => (int) $config['p24_pos_id'],
        'sessionId' => $sessionId,
        'amount' => $amount,
        'currency' => $currency,
        'orderId' => $orderId,
        'sign' => $sign,
    ]);

    if ($order['payment_status'] !== 'paid') {
        $markPaid = $db->prepare(
            'UPDATE orders SET payment_status = "paid", p24_order_id = :order_id, paid_at = CURRENT_TIMESTAMP WHERE session_id = :session_id'
        );
        $markPaid->execute(['order_id' => $orderId, 'session_id' => $sessionId]);
        $order['payment_status'] = 'paid';
        $order['p24_order_id'] = $orderId;
    }

    if (!(bool) $order['notification_sent']) {
        if (sendPurchaseNotification($config, $order)) {
            $markNotified = $db->prepare('UPDATE orders SET notification_sent = 1, notification_sent_at = CURRENT_TIMESTAMP WHERE session_id = :session_id');
            $markNotified->execute(['session_id' => $sessionId]);
        } else {
            error_log('Order ' . $sessionId . ' was paid, but the notification e-mail could not be sent.');
        }
    }

    jsonResponse(['status' => 'success']);
} catch (Throwable $exception) {
    error_log('P24 status error: ' . $exception->getMessage());
    jsonResponse(['error' => 'Payment verification failed.'], 400);
}
