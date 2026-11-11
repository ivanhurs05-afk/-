<?php
/**
 * Приём заявки на расчёт.
 * Порядок: проверка → запись в базу (или резервную очередь) → ответ с lead_id → уведомления.
 * Успех возвращается ТОЛЬКО после надёжного сохранения. Повтор той же отправки не создаёт дубль.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

header('X-Robots-Tag: noindex');
$isJson = stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false;

function fail(string $code, int $http, array $fields = []): void
{
    global $isJson;
    if ($isJson) { cc_json(['ok' => false, 'error' => $code, 'fields' => $fields], $http); exit; }
    // Без JavaScript: простая страница с объяснением и ссылкой назад
    http_response_code($http);
    header('Content-Type: text/html; charset=utf-8');
    $msg = $code === 'rate_limited' ? 'Слишком много отправок подряд. Подождите несколько минут.'
         : ($fields ? 'Проверьте поля: имя, телефон и согласие на обработку данных обязательны.'
         : 'Не удалось подтвердить отправку. Повторите попытку.');
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
       . '<title>Заявка не отправлена — COVERCAP</title><body style="font:17px/1.6 system-ui;max-width:560px;margin:40px auto;padding:0 16px">'
       . '<h1>Заявка не отправлена</h1><p>' . htmlspecialchars($msg) . '</p><p><a href="javascript:history.back()">Вернуться к форме</a></p></body>';
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('method_not_allowed', 405);
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 20000) fail('too_large', 413);

$in = $isJson ? json_decode((string)file_get_contents('php://input'), true) : $_POST;
if (!is_array($in)) fail('bad_request', 400);
$meta = $in['meta'] ?? [];
if (is_string($meta)) $meta = json_decode($meta, true) ?: [];
if (!is_array($meta)) $meta = [];

// Ловушка для ботов
if (cc_str($in['website'] ?? '', 200) !== '') fail('spam', 400);

/* ---------- Серверная проверка (те же правила, что в браузере) ---------- */
$errors = [];
$method = ($in['contact_method'] ?? 'phone') === 'email' ? 'email' : 'phone';
$contact = cc_str($in['contact'] ?? '', 120);
if ($contact === '') {
    $errors[] = 'contact';
} elseif ($method === 'email') {
    if (!filter_var($contact, FILTER_VALIDATE_EMAIL)) $errors[] = 'contact';
} else {
    $digits = preg_replace('/\D/', '', $contact);
    if (!preg_match('/^[+\d][\d\s()\-.]*$/', $contact) || strlen($digits) < 10 || strlen($digits) > 15) $errors[] = 'contact';
}
if (mb_strlen(cc_str($in['name'] ?? '', 80)) < 2) $errors[] = 'name';
$consent = in_array($in['consent'] ?? '', ['1', 'on', 1, true], true);
if (!$consent) $errors[] = 'consent';

$qtyUnknown = in_array($in['qty_unknown'] ?? '', ['1', 'on', 1, true], true);
$qtyRaw = cc_str($in['qty'] ?? '', 12);
$qty = null;
if ($qtyRaw !== '' && !$qtyUnknown) {
    if (!preg_match('/^[1-9]\d{0,7}$/', $qtyRaw)) $errors[] = 'qty'; else $qty = (int)$qtyRaw;
}
if ($errors) fail('validation', 422, $errors);

$type  = array_key_exists($in['request_type'] ?? '', CC_REQUEST_TYPES) ? $in['request_type'] : 'quote';
$size  = array_key_exists($in['size'] ?? '', CC_SIZES) ? $in['size'] : 'help';
$color = array_key_exists($in['color'] ?? '', CC_COLORS) ? $in['color'] : 'undecided';

$submission = cc_str($in['submission_id'] ?? '', 64);
if (!preg_match('/^[A-Za-z0-9\-]{8,64}$/', $submission)) {
    // Без JS идентификатора нет: строим его из содержимого, чтобы двойной клик не дал две заявки
    $submission = 'nojs-' . substr(hash('sha256', cc_ip_hash() . '|' . $contact . '|' . gmdate('YmdH')), 0, 40);
}

/* ---------- Источник ---------- */
$last  = is_array($meta['last_touch'] ?? null) ? $meta['last_touch'] : null;
$first = is_array($meta['first_touch'] ?? null) ? $meta['first_touch'] : null;
$t = $last ?: [];
$placementAllowed = ['header', 'hero', 'catalog', 'price', 'footer', 'mobile_bar', 'repeat', 'popup'];
$placement = in_array($meta['placement'] ?? ($in['placement'] ?? ''), $placementAllowed, true) ? ($meta['placement'] ?? $in['placement']) : 'unknown';
$ymClient = preg_match('/^\d{5,30}$/', (string)($meta['ym_client_id'] ?? '')) ? (string)$meta['ym_client_id'] : null;

$now = cc_now();
$row = [
    'lead_id'         => cc_new_lead_id(),
    'submission_id'   => $submission,
    'created_at'      => $now,
    'updated_at'      => $now,
    'status'          => 'new',
    'request_type'    => $type,
    'prev_order'      => $type === 'repeat' ? cc_str($in['prev_order'] ?? '', 40) : '',
    'size'            => $size,
    'color'           => $color,
    'qty'             => $qty,
    'qty_unknown'     => $qtyUnknown ? 1 : 0,
    'contact_method'  => $method,
    'contact'         => $contact,
    'name'            => cc_str($in['name'] ?? '', 80),
    'company'         => cc_str($in['company'] ?? '', 120),
    'city'            => cc_str($in['city'] ?? '', 80),
    'comment'         => cc_str($in['comment'] ?? '', 1000),
    'consent_at'      => $now,
    'consent_version' => cc_cfg()['consent_version'],
    'placement'       => $placement,
    'page'            => cc_str($meta['page'] ?? '/', 200),
    'first_source'    => $first ? cc_source_label($first) : 'Не определён',
    'last_source'     => cc_source_label($last),
    'utm_source'      => cc_str($t['utm_source'] ?? '', 200),
    'utm_medium'      => cc_str($t['utm_medium'] ?? '', 200),
    'utm_campaign'    => cc_str($t['utm_campaign'] ?? '', 200),
    'utm_content'     => cc_str($t['utm_content'] ?? '', 200),
    'utm_term'        => cc_str($t['utm_term'] ?? '', 200),
    'referrer'        => cc_str($t['referrer'] ?? '', 300),
    'landing'         => cc_str($t['landing'] ?? '', 300),
    'yclid'           => cc_str($t['yclid'] ?? '', 100),
    'ym_client_id'    => $ymClient,
    'ip_hash'         => cc_ip_hash(),
    'notify_status'   => 'pending',
];

/* ---------- Сохранение ---------- */
$cfg = cc_cfg();
$stored = false; $isNew = false; $leadId = null;
try {
    if ($cfg['fail_test']) throw new RuntimeException('fail_test');
    $db = cc_db();
    cc_queue_flush();
    $existing = cc_find_submission($db, $submission);
    if ($existing) {
        $leadId = $existing['lead_id']; $stored = true; // повторная отправка той же формы
    } else {
        $st = $db->prepare('SELECT COUNT(*) FROM leads WHERE ip_hash = ? AND created_at > ?');
        $st->execute([$row['ip_hash'], gmdate('Y-m-d\TH:i:s\Z', time() - (int)$cfg['rate_window'])]);
        if ((int)$st->fetchColumn() >= (int)$cfg['rate_limit']) fail('rate_limited', 429);
        $isNew = cc_insert($db, $row);
        $saved = cc_find_submission($db, $submission);
        if (!$saved) throw new RuntimeException('not_saved');
        $leadId = $saved['lead_id']; $stored = true;
    }
} catch (Throwable $e) {
    if ($e->getMessage() === 'fail_test' && $cfg['fail_test'] === 'total') {
        $stored = false;
    } else {
        // База недоступна — пишем в резервную очередь; перенос в базу при следующем обращении.
        $stored = cc_queue_put($row);
        $isNew = $stored; $leadId = $row['lead_id'];
    }
    error_log('[covercap] storage fallback: ' . get_class($e)); // без персональных данных
}

if (!$stored) fail('storage_error', 503);

/* ---------- Ответ пользователю, затем уведомления ---------- */
if ($isJson) {
    cc_json(['ok' => true, 'lead_id' => $leadId, 'duplicate' => !$isNew]);
} else {
    header('Location: ../thanks/?lead=' . rawurlencode($leadId), true, 303);
}

if ($isNew) {
    if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
    $status = cc_notify(array_merge($row, ['lead_id' => $leadId]));
    try {
        $db = cc_db();
        $db->prepare('UPDATE leads SET notify_status = ? WHERE lead_id = ?')->execute([$status, $leadId]);
    } catch (Throwable $e) { /* заявка в очереди — статус уведомления обновится вручную */ }
}
