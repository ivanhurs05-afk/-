#!/usr/bin/env python3
"""Собирает сайт школы так, чтобы он открывался с корня домена (без /shkola/ в адресе).
Запуск из корня репозитория:  python3 deploy/pack_school.py
Результат: deploy/school-site/ (папка для загрузки на хостинг) и deploy/school-site.zip
"""
import os, re, shutil, zipfile, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'shkola')
OUT = os.path.join(ROOT, 'deploy', 'school-site')
subprocess.check_call([sys.executable, os.path.join(SRC, 'build.py')], cwd=ROOT)
shutil.rmtree(OUT, ignore_errors=True)
SKIP = {'build.py', 'content.json', 'content.demo.json', 'GOALS.md', 'legal', '_demo', '__pycache__'}
def ignore(d, names): return [n for n in names if n in SKIP]
shutil.copytree(SRC, OUT, ignore=ignore)
os.makedirs(os.path.join(OUT, 'assets'))
shutil.copytree(os.path.join(ROOT, 'assets', 'fonts'), os.path.join(OUT, 'assets', 'fonts'))
for f in ('fonts.css',): shutil.copy(os.path.join(ROOT, 'assets', f), os.path.join(OUT, 'assets', f))
shutil.copy(os.path.join(ROOT, 'common.js'), os.path.join(OUT, 'common.js'))
n = 0
for d, _, files in os.walk(OUT):
    for f in files:
        if not f.endswith('.html'): continue
        p = os.path.join(d, f); s = open(p, encoding='utf-8').read(); o = s
        s = s.replace('../../../assets/', '../../assets/').replace('../../../common.js', '../../common.js')
        s = s.replace('"../assets/', '"assets/').replace('"../common.js', '"common.js')
        if s != o: open(p, 'w', encoding='utf-8').write(s); n += 1
open(os.path.join(OUT, 'robots.txt'), 'w').write('User-agent: *\nDisallow: /\n')  # страницы под рекламу не индексируем
zp = os.path.join(ROOT, 'deploy', 'school-site.zip')
if os.path.exists(zp): os.remove(zp)
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, _, files in os.walk(OUT):
        for f in files:
            full = os.path.join(d, f); z.write(full, os.path.relpath(full, OUT))
print('pages rewritten:', n, '->', zp)
