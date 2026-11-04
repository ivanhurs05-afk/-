<?php
/**
 * COVERCAP — общие функции: конфиг, база заявок (SQLite), резервная очередь, уведомления.
 * Требования: PHP 7.4+ с pdo_sqlite и mbstring (есть на типовом хостинге Рег.ру / Beget / Timeweb).
 */
declare(strict_types=1);

const CC_ROOT = __DIR__ . '/..';

const CC_STATUSES = [
    'new'        => 'Новая',
    'contacted'  => 'Контакт установлен',
    'qualified'  => 'Квалифицирована',
    'quote_sent' => 'Расчёт отправлен',
    'agreed'     => 'Согласована',
    'paid'       => 'Оплачена',
    'shipped'    => 'Отгружена',
    'rejected'   => 'Отказ',
];
const CC_REQUEST_TYPES = ['quote' => 'Расчёт', 'trial' => 'Пробный заказ', 'repeat' => 'Повторный заказ', 'resale' => 'Для перепродажи'];
const CC_SIZES  = ['d80' => 'Д80', 'd90' => 'Д90', 'help' => 'Нужна помощь'];
const CC_COLORS = ['black' => 'Чёрный', 'white' => 'Белый', 'red' => 'Красный', 'undecided' => 'Не определился'];

function cc_cfg(): array
{
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $file = CC_ROOT . '/private/config.php';
    $cfg = is_file($file) ? (array)require $file : [];
    $cfg += [
        'data_dir'        => CC_ROOT . '/data',
        'site_url'        => 'https://covercap.ru',
        'notify_email'    => '',
        'mail_from'       => 'no-reply@covercap.ru',
        'telegram_token'  => '',
        'telegram_chat'   => '',
        'consent_version' => 'consent-v1-draft',
        'ip_salt'         => 'change-me',
        'rate_limit'      => 5,     // заявок с одного IP
        'rate_window'     => 600,   // за 10 минут
        'users'           => [],    // логин => ['hash' => password_hash(...), 'role' => 'admin'|'manager']
        'fail_test'       => false, // true — имитировать сбой хранилища (для приёмочного теста)
    ];
    return $cfg;
}

function cc_db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $dir = cc_cfg()['data_dir'];
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    $pdo = new PDO('sqlite:' . $dir . '/leads.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
    $pdo->exec('CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id TEXT NOT NULL UNIQUE,
        submission_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT \'new\',
        request_type TEXT, prev_order TEXT,
        size TEXT, color TEXT, qty INTEGER, qty_unknown INTEGER DEFAULT 0,
        contact_method TEXT NOT NULL, contact TEXT NOT NULL,
        name TEXT, company TEXT, city TEXT, comment TEXT,
        consent_at TEXT NOT NULL, consent_version TEXT NOT NULL,
        placement TEXT, page TEXT,
        first_source TEXT, last_source TEXT,
        utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
        referrer TEXT, landing TEXT, yclid TEXT, ym_client_id TEXT,
        ip_hash TEXT,
        manager TEXT, manager_note TEXT, refusal_reason TEXT,
        order_id TEXT, paid_amount REAL, refund_amount REAL, paid_at TEXT, qualified_at TEXT,
        notify_status TEXT
    )');
    $pdo->exec('CREATE INDEX IF NOT EXISTS leads_created ON leads(created_at)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS leads_ip ON leads(ip_hash, created_at)');
    return $pdo;
}

function cc_now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }

function cc_new_lead_id(): string
{
    $alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    $s = '';
    for ($i = 0; $i < 5; $i++) $s .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    return 'CC-' . gmdate('ymd') . '-' . $s;
}

function cc_ip_hash(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return substr(hash('sha256', cc_cfg()['ip_salt'] . '|' . $ip), 0, 32);
}

function cc_str($v, int $max): string
{
    if (!is_string($v) && !is_numeric($v)) return '';
    $v = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string)$v) ?? '');
    return mb_substr($v, 0, $max);
}

/** Источник для отчёта: utm_source / домен реферера / «Не определён». Никаких подстановок «реклама». */
function cc_source_label(?array $touch): string
{
    if (!$touch) return 'Не определён';
    if (!empty($touch['utm_source'])) {
        return cc_str($touch['utm_source'], 60) . (!empty($touch['utm_medium']) ? ' / ' . cc_str($touch['utm_medium'], 40) : '');
    }
    if (!empty($touch['yclid'])) return 'yandex / cpc (yclid)';
    if (!empty($touch['referrer'])) {
        $h = parse_url((string)$touch['referrer'], PHP_URL_HOST);
        if ($h) return preg_replace('/^www\./', '', $h) . ' / referral';
    }
    return 'Прямой заход';
}

/* ---------- Резервная очередь: если база недоступна, заявка не теряется ---------- */

function cc_queue_file(): string { return cc_cfg()['data_dir'] . '/queue.jsonl'; }

function cc_queue_put(array $row): bool
{
    $dir = cc_cfg()['data_dir'];
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    $fh = @fopen(cc_queue_file(), 'ab');
    if (!$fh) return false;
    $ok = flock($fh, LOCK_EX)
        && fwrite($fh, json_encode($row, JSON_UNESCAPED_UNICODE) . "\n") !== false
        && fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    return (bool)$ok;
}

/** Переносит заявки из очереди в базу. Дубли по submission_id не создаются. */
function cc_queue_flush(): int
{
    $file = cc_queue_file();
    if (!is_file($file) || filesize($file) === 0) return 0;
    $fh = @fopen($file, 'r+b');
    if (!$fh || !flock($fh, LOCK_EX)) return 0;
    $moved = 0; $left = [];
    try {
        $db = cc_db();
        while (($line = fgets($fh)) !== false) {
            $row = json_decode($line, true);
            if (!is_array($row)) continue;
            try { if (cc_insert($db, $row)) $moved++; }
            catch (Throwable $e) { $left[] = $line; }
        }
        ftruncate($fh, 0); rewind($fh);
        foreach ($left as $l) fwrite($fh, $l);
        fflush($fh);
    } catch (Throwable $e) {
        // база всё ещё недоступна — очередь остаётся как есть
    }
    flock($fh, LOCK_UN); fclose($fh);
    return $moved;
}

function cc_queue_count(): int
{
    $f = cc_queue_file();
    if (!is_file($f)) return 0;
    $n = 0; $fh = fopen($f, 'rb');
    while (fgets($fh) !== false) $n++;
    fclose($fh);
    return $n;
}

/** Вставка; true — новая запись, false — такая submission уже была. */
function cc_insert(PDO $db, array $row): bool
{
    if (cc_find_submission($db, $row['submission_id'])) return false;
    $cols = array_keys($row);
    $sql = 'INSERT OR IGNORE INTO leads (' . implode(',', $cols) . ') VALUES (:' . implode(',:', $cols) . ')';
    $st = $db->prepare($sql);
    for ($try = 0; $try < 3; $try++) {
        $st->execute($row);
        if ($st->rowCount() === 1) return true;
        if (cc_find_submission($db, $row['submission_id'])) return false; // параллельный дубль
        $row['lead_id'] = cc_new_lead_id();                               // совпал lead_id — крайне редко
    }
    throw new RuntimeException('lead_id collision');
}

function cc_find_submission(PDO $db, string $submissionId): ?array
{
    $st = $db->prepare('SELECT * FROM leads WHERE submission_id = ?');
    $st->execute([$submissionId]);
    $r = $st->fetch();
    return $r ?: null;
}

/* ---------- Уведомления ---------- */

function cc_notify(array $lead): string
{
    $cfg = cc_cfg();
    $res = [];
    $admin = rtrim($cfg['site_url'], '/') . '/admin/?view=lead&id=' . rawurlencode($lead['lead_id']);

    if ($cfg['notify_email']) {
        $lines = [
            'Новая заявка ' . $lead['lead_id'],
            '',
            'Тип: ' . (CC_REQUEST_TYPES[$lead['request_type']] ?? $lead['request_type']),
            'Вариант: ' . (CC_SIZES[$lead['size']] ?? '—') . ', ' . (CC_COLORS[$lead['color']] ?? '—'),
            'Количество: ' . ($lead['qty'] ? $lead['qty'] . ' шт.' : ($lead['qty_unknown'] ? 'пока не знает' : '—')),
            'Контакт (' . ($lead['contact_method'] === 'email' ? 'email' : 'телефон') . '): ' . $lead['contact'],
            'Имя: ' . ($lead['name'] ?: '—'),
            'Компания: ' . ($lead['company'] ?: '—'),
            'Город: ' . ($lead['city'] ?: '—'),
            $lead['prev_order'] ? 'Предыдущий заказ: ' . $lead['prev_order'] : null,
            'Комментарий: ' . ($lead['comment'] ?: '—'),
            '',
            'Источник: ' . $lead['last_source'] . ' (первый: ' . $lead['first_source'] . ')',
            'Кнопка: ' . $lead['placement'],
            '',
            'Карточка заявки: ' . $admin,
        ];
        $body = implode("\n", array_filter($lines, static function ($l) { return $l !== null; }));
        $subject = '=?UTF-8?B?' . base64_encode('Заявка ' . $lead['lead_id'] . ' — крышки KISS') . '?=';
        $headers = 'From: COVERCAP <' . $cfg['mail_from'] . ">\r\n"
            . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit";
        $res[] = @mail($cfg['notify_email'], $subject, $body, $headers) ? 'mail:ok' : 'mail:fail';
    }

    // В мессенджер — только номер заявки и ссылка в админку, без персональных данных.
    if ($cfg['telegram_token'] && $cfg['telegram_chat']) {
        $text = 'Новая заявка ' . $lead['lead_id'] . "\n" . $admin;
        $ctx = stream_context_create(['http' => [
            'method' => 'POST', 'timeout' => 5, 'ignore_errors' => true,
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => http_build_query(['chat_id' => $cfg['telegram_chat'], 'text' => $text, 'disable_web_page_preview' => 1]),
        ]]);
        $r = @file_get_contents('https://api.telegram.org/bot' . $cfg['telegram_token'] . '/sendMessage', false, $ctx);
        $res[] = ($r && strpos($r, '"ok":true') !== false) ? 'tg:ok' : 'tg:fail';
    }
    return $res ? implode(' ', $res) : 'none';
}

function cc_json(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
}
