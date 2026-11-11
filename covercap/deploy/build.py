#!/usr/bin/env python3
"""Собирает архив сайта COVERCAP для загрузки на хостинг (Рег.ру и любой другой с PHP).

    python3 covercap/deploy/build.py --domain covercap.ru --out /путь/к/папке

Что делает:
  * копирует сайт без архива v1, служебных и тестовых файлов;
  * подставляет домен в адреса страниц, карту сайта, robots.txt и .htaccess;
  * создаёт private/config.php: случайная «соль», пароль администратора (печатается один раз),
    почта для уведомлений из content.json;
  * упаковывает всё в covercap-<домен>.zip — его содержимое кладётся в корень сайта.
"""
import argparse, json, os, re, secrets, shutil, string, subprocess, sys, tempfile, zipfile

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # папка covercap/
SKIP_DIRS = {'v1', 'deploy', 'data'}
SKIP_FILES = {'README.md', '.gitignore', 'config.php'}
TEXT_EXT = {'.html', '.xml', '.txt', '.php', '.js', '.json', '.css', '.htaccess'}


def php_hash(password: str) -> str:
    """bcrypt-хэш через PHP, если он есть, иначе через Python bcrypt."""
    try:
        out = subprocess.run(['php', '-r', 'echo password_hash($argv[1], PASSWORD_DEFAULT);', password],
                             capture_output=True, text=True, check=True)
        return out.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        import bcrypt  # pip install bcrypt
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode().replace('$2b$', '$2y$', 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--domain', required=True, help='домен без https://, например covercap.ru')
    ap.add_argument('--out', required=True, help='куда положить zip')
    ap.add_argument('--login', default='ivan', help='логин администратора')
    a = ap.parse_args()
    domain = a.domain.strip().lower().removeprefix('https://').removeprefix('http://').strip('/')
    if not re.fullmatch(r'[a-z0-9.-]+\.[a-zа-я0-9-]{2,}', domain):
        sys.exit('Неверный домен: ' + domain)

    content = json.load(open(os.path.join(SRC, 'content.json'), encoding='utf-8'))
    email = (content.get('contacts') or {}).get('email', '')

    work = tempfile.mkdtemp()
    site = os.path.join(work, 'site')
    for root, dirs, files in os.walk(SRC):
        rel = os.path.relpath(root, SRC)
        top = rel.split(os.sep)[0]
        if top in SKIP_DIRS:
            continue
        dirs[:] = [d for d in dirs if not (rel == '.' and d in SKIP_DIRS)]
        os.makedirs(os.path.join(site, rel), exist_ok=True)
        for f in files:
            if f in SKIP_FILES:
                continue
            src, dst = os.path.join(root, f), os.path.join(site, rel, f)
            ext = os.path.splitext(f)[1] or f
            if ext in TEXT_EXT or f == '.htaccess':
                t = open(src, encoding='utf-8').read().replace('covercap.ru', domain)
                open(dst, 'w', encoding='utf-8').write(t)
            else:
                shutil.copy2(src, dst)

    # Пустая папка для базы заявок, закрытая от веба
    os.makedirs(os.path.join(site, 'data'), exist_ok=True)
    shutil.copy2(os.path.join(SRC, 'data', '.htaccess'), os.path.join(site, 'data', '.htaccess'))

    # Боевой конфиг
    alphabet = string.ascii_letters + string.digits
    password = ''.join(secrets.choice(alphabet) for _ in range(14))
    cfg = """<?php
// Создано сборщиком deploy/build.py. Файл закрыт от веба (private/.htaccess).
return [
    'site_url'        => 'https://%(d)s',
    'notify_email'    => '%(email)s',
    'mail_from'       => 'no-reply@%(d)s',
    'telegram_token'  => '',
    'telegram_chat'   => '',
    'consent_version' => 'consent-2026-11-05',
    'ip_salt'         => '%(salt)s',
    'rate_limit'      => 5,
    'rate_window'     => 600,
    'users' => [
        '%(login)s' => ['hash' => '%(hash)s', 'role' => 'admin'],
    ],
    'fail_test'       => false,
];
""" % dict(d=domain, email=email, salt=secrets.token_hex(16), login=a.login, hash=php_hash(password))
    open(os.path.join(site, 'private', 'config.php'), 'w', encoding='utf-8').write(cfg)

    os.makedirs(a.out, exist_ok=True)
    zpath = os.path.join(a.out, 'covercap-%s.zip' % domain)
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(site):
            for f in files:
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, site))
    shutil.rmtree(work)
    print('Архив:', zpath)
    print('Админка: https://%s/admin/  логин: %s  пароль: %s' % (domain, a.login, password))


if __name__ == '__main__':
    main()
