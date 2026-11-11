<?php
/**
 * COVERCAP — админка: заявки, статусы, отчёт, выгрузки, редактирование цен/контактов/каталога.
 * Пользователи и пароли — в private/config.php (см. private/config.sample.php).
 */
declare(strict_types=1);
require __DIR__ . '/../api/lib.php';

header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

session_name('cc_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => !empty($_SERVER['HTTPS']), 'httponly' => true, 'samesite' => 'Strict']);
session_start();

$cfg = cc_cfg();
$CONTENT_FILE = CC_ROOT . '/content.json';

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16)); return $_SESSION['csrf']; }
function csrf_ok(): bool { return hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['csrf'] ?? '')); }
function user(): ?array { return $_SESSION['user'] ?? null; }
function is_admin(): bool { return (user()['role'] ?? '') === 'admin'; }
function redirect(string $q): void { header('Location: ?' . $q, true, 303); exit; }
function flash(string $m): void { $_SESSION['flash'] = $m; }
function fmt_dt(?string $iso): string {
    if (!$iso) return '—';
    $d = new DateTime($iso); $d->setTimezone(new DateTimeZone('Asia/Novosibirsk'));
    return $d->format('d.m.Y H:i');
}

/* ---------- Вход ---------- */
if (isset($_GET['logout'])) { session_destroy(); redirect(''); }

if (!user()) {
    $err = '';
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        $login = (string)($_POST['login'] ?? ''); $pass = (string)($_POST['password'] ?? '');
        $u = $cfg['users'][$login] ?? null;
        if ($u && password_verify($pass, $u['hash'])) {
            session_regenerate_id(true);
            $_SESSION['user'] = ['login' => $login, 'role' => $u['role'] ?? 'manager'];
            redirect('');
        }
        sleep(2); // замедление перебора
        $err = 'Неверный логин или пароль.';
    }
    page_head('Вход');
    echo '<main class="login"><h1>COVERCAP</h1>';
    if (!$cfg['users']) echo '<p class="warn">Пользователи не настроены. Создайте <code>private/config.php</code> по образцу <code>config.sample.php</code>.</p>';
    if ($err) echo '<p class="warn">' . h($err) . '</p>';
    echo '<form method="post"><label>Логин<input name="login" autocomplete="username" required></label>'
       . '<label>Пароль<input type="password" name="password" autocomplete="current-password" required></label>'
       . '<button>Войти</button></form></main>';
    page_foot(); exit;
}

/* ---------- Проверка сервера ---------- */
function server_checks(): array
{
    $cfg = cc_cfg();
    $dir = $cfg['data_dir'];
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    $probe = $dir . '/.write-test';
    $writable = @file_put_contents($probe, '1') !== false;
    if ($writable) @unlink($probe);
    $content = CC_ROOT . '/content.json';
    return [
        ['PHP 7.4 или новее', version_compare(PHP_VERSION, '7.4.0', '>='), 'Сейчас ' . PHP_VERSION . '. Версия выбирается в панели хостинга.'],
        ['Расширение pdo_sqlite (база заявок)', extension_loaded('pdo_sqlite'), 'Включается в панели хостинга в настройках PHP.'],
        ['Расширение mbstring', extension_loaded('mbstring'), 'Включается в настройках PHP.'],
        ['Папка data/ доступна для записи', $writable, 'Права 750 или 755 на папку data/.'],
        ['Файл content.json доступен для записи', is_writable($content), 'Нужно, чтобы цены и контакты сохранялись из админки. Права 640 или 644.'],
        ['Отправка почты (mail)', function_exists('mail'), 'На Рег.ру включена по умолчанию.'],
        ['Почта для уведомлений указана', (bool)$cfg['notify_email'], 'Параметр notify_email в private/config.php.'],
        ['Сайт открыт по HTTPS', !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'Выпустите бесплатный SSL в панели Рег.ру и включите редирект в .htaccess.'],
    ];
}

if (($_GET['view'] ?? '') === 'check') {
    page_head('Проверка сервера');
    echo '<main><h1>Проверка сервера</h1><div class="scroll"><table><tbody>';
    foreach (server_checks() as $c) {
        echo '<tr><td>' . ($c[1] ? '✅' : '❌') . '</td><td><b>' . h($c[0]) . '</b>' . ($c[1] ? '' : '<br><span class="hint">' . h($c[2]) . '</span>') . '</td></tr>';
    }
    echo '</tbody></table></div><p class="hint">Всё зелёное — можно отправить тестовую заявку с сайта и проверить, что она пришла сюда и на почту.</p></main>';
    page_foot(); exit;
}

/* ---------- База ---------- */
try { $db = cc_db(); $flushed = cc_queue_flush(); }
catch (Throwable $e) { page_head('Ошибка'); echo '<main><p class="warn">База заявок недоступна: проверьте права на папку data/. Заявки при этом сохраняются в резервную очередь (' . cc_queue_count() . ' шт.).</p></main>'; page_foot(); exit; }

$view = $_GET['view'] ?? 'leads';

/* ---------- Выгрузки ---------- */
if (isset($_GET['export'])) {
    $kind = $_GET['export'];
    header('Content-Type: text/csv; charset=utf-8');
    if ($kind === 'metrika') {
        // Офлайн-конверсии для Метрики: ClientId,Target,DateTime,Price,Currency.
        // Строки детерминированы (одно событие на заявку), повторная загрузка не задваивает оплату.
        header('Content-Disposition: attachment; filename="covercap-offline-conversions-' . date('Y-m-d') . '.csv"');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['ClientId', 'Target', 'DateTime', 'Price', 'Currency']);
        $rows = $db->query("SELECT * FROM leads WHERE ym_client_id IS NOT NULL AND ym_client_id <> ''")->fetchAll();
        foreach ($rows as $r) {
            if ($r['qualified_at']) fputcsv($out, [$r['ym_client_id'], 'qualified_lead', strtotime($r['qualified_at']), '', '']);
            if ($r['paid_at'] && $r['paid_amount'] > 0) {
                $net = (float)$r['paid_amount'] - (float)$r['refund_amount'];
                fputcsv($out, [$r['ym_client_id'], 'order_paid', strtotime($r['paid_at']), number_format(max($net, 0), 2, '.', ''), 'RUB']);
            }
        }
        exit;
    }
    header('Content-Disposition: attachment; filename="covercap-leads-' . date('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF"); // BOM для Excel
    $rows = $db->query('SELECT * FROM leads ORDER BY id DESC')->fetchAll();
    $cols = $rows ? array_keys($rows[0]) : ['lead_id'];
    $cols = array_values(array_diff($cols, ['ip_hash', 'submission_id']));
    fputcsv($out, $cols, ';');
    foreach ($rows as $r) { fputcsv($out, array_map(static function ($c) use ($r) { return $r[$c]; }, $cols), ';'); }
    exit;
}

/* ---------- Сохранение ---------- */
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if (!csrf_ok()) { http_response_code(400); exit('CSRF'); }
    $act = $_POST['act'] ?? '';

    if ($act === 'lead') {
        $id = (string)$_POST['lead_id'];
        $cur = $db->prepare('SELECT * FROM leads WHERE lead_id = ?'); $cur->execute([$id]); $cur = $cur->fetch();
        if (!$cur) redirect('');
        $status = array_key_exists($_POST['status'] ?? '', CC_STATUSES) ? $_POST['status'] : $cur['status'];
        $num = static function ($v) { $v = str_replace([' ', ','], ['', '.'], (string)$v); return $v === '' ? null : (is_numeric($v) ? round((float)$v, 2) : null); };
        $paid = $num($_POST['paid_amount'] ?? '');
        $refund = $num($_POST['refund_amount'] ?? '');
        $qualifiedAt = $cur['qualified_at'];
        if (!$qualifiedAt && in_array($status, ['qualified', 'quote_sent', 'agreed', 'paid', 'shipped'], true)) $qualifiedAt = cc_now();
        $paidAt = $cur['paid_at'];
        if (!$paidAt && $paid && in_array($status, ['paid', 'shipped'], true)) $paidAt = cc_now();
        if ($status === 'rejected' && trim((string)($_POST['refusal_reason'] ?? '')) === '') {
            flash('Для отказа укажите причину.'); redirect('view=lead&id=' . rawurlencode($id));
        }
        $db->prepare('UPDATE leads SET status=?, manager=?, manager_note=?, refusal_reason=?, order_id=?, paid_amount=?, refund_amount=?, paid_at=?, qualified_at=?, updated_at=? WHERE lead_id=?')
           ->execute([$status, cc_str($_POST['manager'] ?? '', 60), cc_str($_POST['manager_note'] ?? '', 2000), cc_str($_POST['refusal_reason'] ?? '', 300),
                      cc_str($_POST['order_id'] ?? '', 60), $paid, $refund, $paidAt, $qualifiedAt, cc_now(), $id]);
        flash('Заявка ' . $id . ' сохранена.');
        redirect('view=lead&id=' . rawurlencode($id));
    }
    if ($act === 'renotify') {
        $id = (string)$_POST['lead_id'];
        $r = $db->prepare('SELECT * FROM leads WHERE lead_id = ?'); $r->execute([$id]); $r = $r->fetch();
        if ($r) { $s = cc_notify($r); $db->prepare('UPDATE leads SET notify_status=? WHERE lead_id=?')->execute([$s, $id]); flash('Уведомление: ' . $s); }
        redirect('view=lead&id=' . rawurlencode($id));
    }
    if ($act === 'settings' && is_admin()) {
        $list = cc_str($_POST['notify_email'] ?? '', 200);
        if (!cc_valid_emails($list)) { flash('Проверьте адрес: нужен email, несколько — через запятую.'); redirect('view=settings'); }
        $file = $cfg['data_dir'] . '/settings.json';
        $all = is_file($file) ? (json_decode((string)file_get_contents($file), true) ?: []) : [];
        $all['notify_email'] = $list;
        file_put_contents($file, json_encode($all, JSON_UNESCAPED_UNICODE), LOCK_EX);
        @chmod($file, 0640);
        flash('Сохранено. Новые заявки будут приходить на ' . $list . '.');
        redirect('view=settings');
    }
    if ($act === 'password') {
        $login = user()['login'];
        $cur = (string)($_POST['current'] ?? ''); $new = (string)($_POST['new'] ?? '');
        if (!password_verify($cur, $cfg['users'][$login]['hash'] ?? '')) { flash('Текущий пароль неверный.'); redirect('view=password'); }
        if (mb_strlen($new) < 10) { flash('Новый пароль — не короче 10 символов.'); redirect('view=password'); }
        $file = $cfg['data_dir'] . '/users.json';
        $all = is_file($file) ? (json_decode((string)file_get_contents($file), true) ?: []) : [];
        $all[$login] = password_hash($new, PASSWORD_DEFAULT);
        file_put_contents($file, json_encode($all), LOCK_EX);
        @chmod($file, 0640);
        flash('Пароль изменён.');
        redirect('view=password');
    }
    if ($act === 'content' && is_admin()) {
        $c = json_decode((string)file_get_contents($CONTENT_FILE), true) ?: [];
        $p = $_POST;
        foreach (['phone', 'phone_display', 'email', 'hours', 'instagram'] as $k) $c['contacts'][$k] = cc_str($p['contacts'][$k] ?? '', 120);
        $c['contacts']['instagram'] = ltrim($c['contacts']['instagram'], '@');
        $c['contacts']['show_instagram'] = !empty($p['contacts']['show_instagram']);
        foreach (['seller_name', 'inn', 'ogrn', 'address'] as $k) $c['legal'][$k] = cc_str($p['legal'][$k] ?? '', 300);
        $c['proposal_pdf'] = cc_str($p['proposal_pdf'] ?? '', 300);
        $c['photos_temporary'] = !empty($p['photos_temporary']);
        $c['metrika']['counter_id'] = preg_replace('/\D/', '', (string)($p['metrika_id'] ?? ''));
        foreach (['vat', 'volume_condition', 'min_order', 'delivery'] as $k) $c['prices'][$k] = cc_str($p['prices'][$k] ?? '', 200);
        $date = (string)($p['prices']['actual_date'] ?? '');
        $c['prices']['actual_date'] = preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : '';
        foreach (['d80', 'd90'] as $sku) {
            $a = str_replace([' ', ','], ['', '.'], (string)($p['prices']['items'][$sku] ?? ''));
            $c['prices']['items'][$sku]['amount'] = ($a !== '' && is_numeric($a) && (float)$a > 0) ? round((float)$a, 2) : null;
            $st = $p['catalog'][$sku]['status'] ?? 'available';
            $c['catalog'][$sku]['status'] = in_array($st, ['available', 'pending', 'hidden'], true) ? $st : 'available';
            foreach (['black', 'white', 'red'] as $col) {
                $v = $p['catalog'][$sku]['colors'][$col] ?? 'hidden';
                $c['catalog'][$sku]['colors'][$col] = in_array($v, ['available', 'pending', 'hidden'], true) ? $v : 'hidden';
            }
        }
        $c['prices']['publish'] = !empty($p['prices']['publish']);
        if ($c['prices']['publish'] && !$c['prices']['actual_date']) {
            $c['prices']['publish'] = false;
            flash('Цены не опубликованы: укажите дату актуальности.');
        } else {
            flash('Сохранено. Сайт обновится при следующей загрузке страницы.');
        }
        $c['updated_at'] = date('Y-m-d');
        $bdir = $cfg['data_dir'] . '/backups'; if (!is_dir($bdir)) @mkdir($bdir, 0750, true);
        @copy($CONTENT_FILE, $bdir . '/content-' . date('Ymd-His') . '-' . user()['login'] . '.json');
        $tmp = $CONTENT_FILE . '.tmp';
        file_put_contents($tmp, json_encode($c, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", LOCK_EX);
        rename($tmp, $CONTENT_FILE);
        redirect('view=content');
    }
    redirect('');
}

/* ---------- Страницы ---------- */
function page_head(string $title): void
{
    echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<meta name="robots" content="noindex,nofollow"><title>' . h($title) . ' — COVERCAP</title><link rel="stylesheet" href="admin.css"></head><body>';
    if (user()) {
        $v = $_GET['view'] ?? 'leads';
        $a = static function ($k, $t) use ($v) { return '<a href="?view=' . $k . '"' . ($v === $k ? ' aria-current="page"' : '') . '>' . $t . '</a>'; };
        echo '<header><b>COVERCAP</b><nav>' . $a('leads', 'Заявки') . $a('report', 'Отчёт') . (is_admin() ? $a('content', 'Цены и контент') . $a('settings', 'Почта заявок') : '') . $a('check', 'Проверка сервера') . $a('password', 'Пароль')
           . '</nav><span class="me">' . h(user()['login']) . ' · <a href="?logout=1">Выйти</a></span></header>';
        if (!empty($_SESSION['flash'])) { echo '<p class="flash">' . h($_SESSION['flash']) . '</p>'; unset($_SESSION['flash']); }
    }
}
function page_foot(): void { echo '</body></html>'; }

if ($view === 'lead') {
    $st = $db->prepare('SELECT * FROM leads WHERE lead_id = ?'); $st->execute([(string)($_GET['id'] ?? '')]); $r = $st->fetch();
    page_head($r ? $r['lead_id'] : 'Не найдена');
    if (!$r) { echo '<main><p>Заявка не найдена.</p></main>'; page_foot(); exit; }
    $contactHref = $r['contact_method'] === 'email' ? 'mailto:' . $r['contact'] : 'tel:' . preg_replace('/[^\d+]/', '', $r['contact']);
    echo '<main><p><a href="?view=leads">← Все заявки</a></p><h1>' . h($r['lead_id']) . ' <span class="badge s-' . h($r['status']) . '">' . h(CC_STATUSES[$r['status']] ?? $r['status']) . '</span></h1>';
    echo '<div class="cols"><section><h2>Запрос</h2><dl>';
    $rows = [
        'Создана' => fmt_dt($r['created_at']),
        'Тип' => CC_REQUEST_TYPES[$r['request_type']] ?? $r['request_type'],
        'Предыдущий заказ' => $r['prev_order'] ?: null,
        'Вариант' => (CC_SIZES[$r['size']] ?? '—') . ', ' . (CC_COLORS[$r['color']] ?? '—'),
        'Количество' => $r['qty'] ? number_format((int)$r['qty'], 0, ',', ' ') . ' шт.' : ($r['qty_unknown'] ? 'Пока не знает' : '—'),
        'Имя' => $r['name'] ?: '—', 'Компания' => $r['company'] ?: '—', 'Город' => $r['city'] ?: '—',
        'Комментарий' => $r['comment'] ?: '—',
    ];
    foreach ($rows as $k => $v) if ($v !== null) echo '<dt>' . h($k) . '</dt><dd>' . nl2br(h($v)) . '</dd>';
    echo '<dt>Контакт</dt><dd><a href="' . h($contactHref) . '">' . h($r['contact']) . '</a></dd></dl>';
    echo '<h2>Источник</h2><dl>';
    foreach (['Последний источник' => $r['last_source'], 'Первый источник' => $r['first_source'], 'Кнопка' => $r['placement'], 'Страница входа' => $r['landing'],
              'Реферер' => $r['referrer'], 'utm_campaign' => $r['utm_campaign'], 'utm_content' => $r['utm_content'], 'utm_term' => $r['utm_term'],
              'yclid' => $r['yclid'], 'ClientID Метрики' => $r['ym_client_id']] as $k => $v) if ($v) echo '<dt>' . h($k) . '</dt><dd>' . h($v) . '</dd>';
    echo '<dt>Согласие</dt><dd>' . h(fmt_dt($r['consent_at'])) . ', ' . h($r['consent_version']) . '</dd>';
    echo '<dt>Уведомление</dt><dd>' . h($r['notify_status']) . ' <form method="post" class="inline"><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="act" value="renotify"><input type="hidden" name="lead_id" value="' . h($r['lead_id']) . '"><button class="small">Отправить ещё раз</button></form></dd></dl></section>';

    echo '<section><h2>Работа с заявкой</h2><form method="post" class="stack"><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="act" value="lead"><input type="hidden" name="lead_id" value="' . h($r['lead_id']) . '">';
    echo '<label>Статус<select name="status">';
    foreach (CC_STATUSES as $k => $t) echo '<option value="' . $k . '"' . ($k === $r['status'] ? ' selected' : '') . '>' . h($t) . '</option>';
    echo '</select></label>';
    echo '<label>Ответственный<input name="manager" value="' . h($r['manager'] ?: user()['login']) . '"></label>';
    echo '<label>Причина отказа<input name="refusal_reason" value="' . h($r['refusal_reason']) . '" placeholder="обязательно при статусе «Отказ»"></label>';
    echo '<label>Номер заказа (order_id)<input name="order_id" value="' . h($r['order_id']) . '"></label>';
    echo '<div class="row"><label>Получено оплат, ₽<input name="paid_amount" inputmode="decimal" value="' . h($r['paid_amount']) . '"></label>';
    echo '<label>Возвраты, ₽<input name="refund_amount" inputmode="decimal" value="' . h($r['refund_amount']) . '"></label></div>';
    echo '<p class="hint">Дата оплаты фиксируется автоматически при статусе «Оплачена»/«Отгружена» и сумме больше нуля: ' . h(fmt_dt($r['paid_at'])) . '</p>';
    echo '<label>Заметка менеджера<textarea name="manager_note" rows="4">' . h($r['manager_note']) . '</textarea></label>';
    echo '<button>Сохранить</button></form></section></div></main>';
    page_foot(); exit;
}

if ($view === 'settings' && is_admin()) {
    page_head('Почта заявок');
    echo '<main><h1>Почта для заявок</h1><p class="hint">На этот адрес приходит письмо о каждой новой заявке: имя, телефон, вариант и источник. Все заявки остаются и в админке. Нужна российская почта (Яндекс, Mail.ru).</p>'
       . '<form method="post" class="stack" style="max-width:520px"><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="act" value="settings">'
       . '<label>Адрес (или несколько через запятую)<input name="notify_email" type="text" value="' . h($cfg['notify_email']) . '" required></label>'
       . '<button>Сохранить</button></form>'
       . '<h2>Проверить доставку</h2><p class="hint">Отправьте с сайта тестовую заявку: письмо придёт на этот адрес. Если его нет во «Входящих», загляните в «Спам» и отметьте письмо «Не спам».</p></main>';
    page_foot(); exit;
}

if ($view === 'password') {
    page_head('Пароль');
    echo '<main><h1>Смена пароля</h1><form method="post" class="stack" style="max-width:420px"><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="act" value="password">'
       . '<label>Текущий пароль<input type="password" name="current" autocomplete="current-password" required></label>'
       . '<label>Новый пароль (от 10 символов)<input type="password" name="new" autocomplete="new-password" minlength="10" required></label>'
       . '<button>Сменить пароль</button></form></main>';
    page_foot(); exit;
}

if ($view === 'report') {
    $days = (int)($_GET['days'] ?? 7);
    $since = $days > 0 ? gmdate('Y-m-d\TH:i:s\Z', time() - $days * 86400) : '0000';
    $st = $db->prepare("SELECT last_source AS src,
        COUNT(*) AS leads,
        SUM(CASE WHEN status IN ('qualified','quote_sent','agreed','paid','shipped') THEN 1 ELSE 0 END) AS qualified,
        SUM(CASE WHEN status IN ('quote_sent','agreed','paid','shipped') THEN 1 ELSE 0 END) AS quotes,
        SUM(CASE WHEN status IN ('paid','shipped') THEN 1 ELSE 0 END) AS paid,
        SUM(CASE WHEN status IN ('paid','shipped') THEN COALESCE(paid_amount,0) - COALESCE(refund_amount,0) ELSE 0 END) AS money
        FROM leads WHERE created_at >= ? GROUP BY last_source ORDER BY leads DESC");
    $st->execute([$since]); $rows = $st->fetchAll();
    $rej = $db->prepare("SELECT refusal_reason, COUNT(*) n FROM leads WHERE status='rejected' AND created_at >= ? GROUP BY refusal_reason ORDER BY n DESC");
    $rej->execute([$since]); $rej = $rej->fetchAll();
    page_head('Отчёт');
    echo '<main><h1>Отчёт: источник → оплата</h1><p class="tabs">Период: ';
    foreach ([7 => '7 дней', 30 => '30 дней', 0 => 'всё время'] as $d => $t) echo '<a href="?view=report&days=' . $d . '"' . ($d === $days ? ' aria-current="page"' : '') . '>' . $t . '</a> ';
    echo '</p><div class="scroll"><table><thead><tr><th>Источник</th><th>Заявки</th><th>Квалиф.</th><th>Расчёты</th><th>Оплачены</th><th>Получено, ₽ (за вычетом возвратов)</th></tr></thead><tbody>';
    $tot = ['leads' => 0, 'qualified' => 0, 'quotes' => 0, 'paid' => 0, 'money' => 0];
    foreach ($rows as $r) {
        foreach ($tot as $k => $_) $tot[$k] += $r[$k];
        echo '<tr><td>' . h($r['src']) . '</td><td>' . (int)$r['leads'] . '</td><td>' . (int)$r['qualified'] . '</td><td>' . (int)$r['quotes'] . '</td><td>' . (int)$r['paid'] . '</td><td>' . number_format((float)$r['money'], 2, ',', ' ') . '</td></tr>';
    }
    echo '</tbody><tfoot><tr><th>Итого</th><th>' . $tot['leads'] . '</th><th>' . $tot['qualified'] . '</th><th>' . $tot['quotes'] . '</th><th>' . $tot['paid'] . '</th><th>' . number_format((float)$tot['money'], 2, ',', ' ') . '</th></tr></tfoot></table></div>';
    echo '<h2>Причины отказов</h2>' . ($rej ? '<ul>' . implode('', array_map(static function ($x) { return '<li>' . h($x['refusal_reason'] ?: '—') . ': ' . (int)$x['n'] . '</li>'; }, $rej)) . '</ul>' : '<p>Нет.</p>');
    echo '<p class="hint">Источник — по последнему известному касанию; «Не определён»/«Прямой заход», если меток не было. Расходы и маржа сюда не входят: добавляются только по фактическим данным.</p>';
    echo '<p><a class="btn" href="?export=csv">Все заявки, CSV</a> <a class="btn" href="?export=metrika">Офлайн-конверсии для Метрики, CSV</a></p></main>';
    page_foot(); exit;
}

if ($view === 'content' && is_admin()) {
    $c = json_decode((string)file_get_contents($CONTENT_FILE), true) ?: [];
    $v = static function (string $path) use ($c) { $x = $c; foreach (explode('.', $path) as $k) $x = $x[$k] ?? ''; return h(is_scalar($x) ? $x : ''); };
    $sel = static function (string $name, string $cur, array $opts) {
        $s = '<select name="' . $name . '">'; foreach ($opts as $k => $t) $s .= '<option value="' . $k . '"' . ($k === $cur ? ' selected' : '') . '>' . $t . '</option>'; return $s . '</select>';
    };
    $stOpts = ['available' => 'доступно', 'pending' => 'уточняется', 'hidden' => 'скрыто'];
    page_head('Цены и контент');
    echo '<main><h1>Цены и контент</h1><form method="post" class="stack wide"><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="act" value="content">';

    echo '<fieldset><legend>Цены</legend><p class="hint">Пока цена не утверждена письменно — не публикуйте. Без отметки «Публиковать» и даты актуальности сайт показывает «Цена по запросу».</p>';
    echo '<label class="check"><input type="checkbox" name="prices[publish]" value="1"' . (!empty($c['prices']['publish']) ? ' checked' : '') . '> Публиковать цены</label>';
    echo '<div class="row"><label>KISS Д80, ₽/шт.<input name="prices[items][d80]" inputmode="decimal" value="' . $v('prices.items.d80.amount') . '"></label>';
    echo '<label>KISS Д90, ₽/шт.<input name="prices[items][d90]" inputmode="decimal" value="' . $v('prices.items.d90.amount') . '"></label>';
    echo '<label>Дата актуальности<input type="date" name="prices[actual_date]" value="' . $v('prices.actual_date') . '"></label></div>';
    echo '<div class="row"><label>Для какого объёма действует<input name="prices[volume_condition]" value="' . $v('prices.volume_condition') . '" placeholder="например, от 1 коробки"></label>';
    echo '<label>НДС<input name="prices[vat]" value="' . $v('prices.vat') . '" placeholder="например, без НДС"></label></div>';
    echo '<div class="row"><label>Минимальный заказ<input name="prices[min_order]" value="' . $v('prices.min_order') . '"></label>';
    echo '<label>Доставка<input name="prices[delivery]" value="' . $v('prices.delivery') . '" placeholder="включена / не включена / по расчёту"></label></div></fieldset>';

    echo '<fieldset><legend>Каталог: доступные сочетания</legend><p class="hint">Отмечайте только сочетания, которые подтвердил поставщик.</p><div class="scroll"><table><thead><tr><th></th><th>Карточка</th><th>Чёрный</th><th>Белый</th><th>Красный</th></tr></thead><tbody>';
    foreach (['d80' => 'Д80', 'd90' => 'Д90'] as $sku => $t) {
        echo '<tr><th>' . $t . '</th><td>' . $sel("catalog[$sku][status]", (string)($c['catalog'][$sku]['status'] ?? 'available'), $stOpts) . '</td>';
        foreach (['black', 'white', 'red'] as $col) echo '<td>' . $sel("catalog[$sku][colors][$col]", (string)($c['catalog'][$sku]['colors'][$col] ?? 'hidden'), $stOpts) . '</td>';
        echo '</tr>';
    }
    echo '</tbody></table></div></fieldset>';

    echo '<fieldset><legend>Контакты</legend><div class="row"><label>Телефон (для ссылки)<input name="contacts[phone]" value="' . $v('contacts.phone') . '" placeholder="+79130000000"></label>';
    echo '<label>Телефон (как показать)<input name="contacts[phone_display]" value="' . $v('contacts.phone_display') . '" placeholder="+7 913 000-00-00"></label></div>';
    echo '<div class="row"><label>Рабочая почта<input type="email" name="contacts[email]" value="' . $v('contacts.email') . '"></label>';
    echo '<label>Часы работы<input name="contacts[hours]" value="' . $v('contacts.hours') . '" placeholder="Пн–Пт, 10:00–19:00 (Нск)"></label></div>';
    echo '<div class="row"><label>Instagram<input name="contacts[instagram]" value="' . $v('contacts.instagram') . '"></label>';
    echo '<label class="check"><input type="checkbox" name="contacts[show_instagram]" value="1"' . (!empty($c['contacts']['show_instagram']) ? ' checked' : '') . '> Показывать Instagram на сайте</label></div></fieldset>';

    echo '<fieldset><legend>Реквизиты продавца (подвал)</legend><div class="row"><label>Наименование<input name="legal[seller_name]" value="' . $v('legal.seller_name') . '" placeholder="ИП Иванов Иван Иванович"></label>';
    echo '<label>ИНН<input name="legal[inn]" value="' . $v('legal.inn') . '"></label><label>ОГРН / ОГРНИП<input name="legal[ogrn]" value="' . $v('legal.ogrn') . '"></label></div>';
    echo '<label>Адрес<input name="legal[address]" value="' . $v('legal.address') . '"></label></fieldset>';

    echo '<fieldset><legend>Прочее</legend><label>Ссылка на PDF коммерческого предложения<input name="proposal_pdf" value="' . $v('proposal_pdf') . '" placeholder="files/covercap-kp.pdf"></label>';
    echo '<label>Номер счётчика Яндекс Метрики<input name="metrika_id" inputmode="numeric" value="' . $v('metrika.counter_id') . '"></label>';
    echo '<label class="check"><input type="checkbox" name="photos_temporary" value="1"' . (!empty($c['photos_temporary']) ? ' checked' : '') . '> Показывать пометку «Временное фото»</label></fieldset>';
    echo '<button>Сохранить</button></form></main>';
    page_foot(); exit;
}

/* Список заявок */
$filter = array_key_exists($_GET['status'] ?? '', CC_STATUSES) ? $_GET['status'] : '';
$q = 'SELECT lead_id, created_at, status, request_type, size, color, qty, qty_unknown, contact, company, city, last_source, manager FROM leads';
$st = $filter ? $db->prepare($q . ' WHERE status = ? ORDER BY id DESC LIMIT 500') : $db->prepare($q . ' ORDER BY id DESC LIMIT 500');
$st->execute($filter ? [$filter] : []);
$rows = $st->fetchAll();
$counts = $db->query('SELECT status, COUNT(*) n FROM leads GROUP BY status')->fetchAll(PDO::FETCH_KEY_PAIR);

page_head('Заявки');
echo '<main><h1>Заявки</h1>';
if ($flushed) echo '<p class="flash">Из резервной очереди перенесено заявок: ' . (int)$flushed . '</p>';
if (cc_queue_count()) echo '<p class="warn">В резервной очереди ' . cc_queue_count() . ' заявок — база была недоступна. Проверьте права на папку data/.</p>';
echo '<p class="tabs"><a href="?view=leads"' . (!$filter ? ' aria-current="page"' : '') . '>Все (' . array_sum($counts) . ')</a> ';
foreach (CC_STATUSES as $k => $t) echo '<a href="?view=leads&status=' . $k . '"' . ($filter === $k ? ' aria-current="page"' : '') . '>' . h($t) . ' (' . (int)($counts[$k] ?? 0) . ')</a> ';
echo '</p><div class="scroll"><table><thead><tr><th>Заявка</th><th>Дата</th><th>Статус</th><th>Запрос</th><th>Контакт</th><th>Компания / город</th><th>Источник</th><th>Ответств.</th></tr></thead><tbody>';
foreach ($rows as $r) {
    echo '<tr><td><a href="?view=lead&id=' . rawurlencode($r['lead_id']) . '">' . h($r['lead_id']) . '</a></td><td>' . h(fmt_dt($r['created_at'])) . '</td>'
       . '<td><span class="badge s-' . h($r['status']) . '">' . h(CC_STATUSES[$r['status']] ?? $r['status']) . '</span></td>'
       . '<td>' . h(CC_REQUEST_TYPES[$r['request_type']] ?? '') . ': ' . h(CC_SIZES[$r['size']] ?? '') . ', ' . h(CC_COLORS[$r['color']] ?? '') . ($r['qty'] ? ', ' . (int)$r['qty'] . ' шт.' : '') . '</td>'
       . '<td>' . h($r['contact']) . '</td><td>' . h(trim($r['company'] . ' ' . $r['city'])) . '</td><td>' . h($r['last_source']) . '</td><td>' . h($r['manager']) . '</td></tr>';
}
if (!$rows) echo '<tr><td colspan="8">Заявок пока нет.</td></tr>';
echo '</tbody></table></div><p><a class="btn" href="?export=csv">Выгрузить CSV</a></p></main>';
page_foot();
