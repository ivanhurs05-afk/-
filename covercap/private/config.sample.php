<?php
/**
 * Скопируйте в private/config.php и заполните. config.php не коммитится (см. .gitignore).
 * Хэш пароля:  php -r 'echo password_hash("ваш-пароль", PASSWORD_DEFAULT), PHP_EOL;'
 */
return [
    'site_url'        => 'https://covercap.ru',
    'notify_email'    => '',                    // рабочая почта для уведомлений о заявках
    'mail_from'       => 'no-reply@covercap.ru',
    'telegram_token'  => '',                    // необязательно: в Telegram уходит только номер заявки и ссылка
    'telegram_chat'   => '',
    'consent_version' => 'consent-v1-draft',    // менять при каждой правке текста согласия
    'ip_salt'         => 'замените-на-случайную-строку',
    'rate_limit'      => 5,
    'rate_window'     => 600,
    'users' => [
        // 'ivan'  => ['hash' => '$2y$10$...', 'role' => 'admin'],    // заявки + цены и контент
        // 'maxim' => ['hash' => '$2y$10$...', 'role' => 'admin'],
        // 'manager' => ['hash' => '$2y$10$...', 'role' => 'manager'], // только заявки
    ],
    // Для приёмочного теста «сбой интеграции»: true — база недоступна (заявка уходит в резервную очередь),
    // 'total' — недоступно всё (форма должна показать ошибку и сохранить введённые данные). В работе — false.
    'fail_test'       => false,
];
