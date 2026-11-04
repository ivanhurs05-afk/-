#!/usr/bin/env python3
"""Сборка посадочных страниц ЦКО МИЭТ из одного шаблона.
Запуск из корня репозитория:  python3 cko/build.py
Страницы появятся в cko/<раздел>/<страница>/index.html, каталог в cko/index.html."""
import json, os, html
ROOT = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(ROOT, 'content.json'), encoding='utf-8'))
e = html.escape

SUBJ = {  # slug: (название, "по чему" для заголовка, значок)
  'matematika': ('Математика', 'математике'), 'russkiy': ('Русский язык', 'русскому языку'),
  'angliyskiy': ('Английский', 'английскому языку'), 'fizika': ('Физика', 'физике'),
  'himiya': ('Химия', 'химии'), 'biologiya': ('Биология', 'биологии'),
  'istoriya': ('История', 'истории'), 'obshchestvoznanie': ('Обществознание', 'обществознанию'),
}
PAGES = []
for exam, grades in (('ege', '10–11 класс'), ('oge', '8–9 класс')):
    for s in SUBJ:
        n, dat = SUBJ[s]; X = {'ege': 'ЕГЭ', 'oge': 'ОГЭ'}[exam]
        PAGES.append(dict(path=f'{exam}/{s}', group=X, name=f'{n}', aud=grades, subj=n, grade='11 класс' if exam == 'ege' else '9 класс',
            h1=(f'Подготовка к {X} по {dat}', 'в мини-группах', ''),
            lead=f'Бесплатное открытое занятие: посмотрите, как всё устроено, и узнайте уровень ребёнка. Занятия проходят очно в ЦКО МИЭТ.',
            title=f'Подготовка к {X} по {dat}'))
PAGES += [
 dict(path='angliyskiy/shkolnikam', group='Английский', name='Английский для школьников', aud='Школьники', subj='Английский', grade='5 класс',
      h1=('Английский язык для', 'школьников', 'в мини-группах'), lead='Бесплатное открытое занятие: познакомьтесь с форматом и узнайте уровень ребёнка. Занятия проходят очно в ЦКО МИЭТ.', title='Английский язык для школьников'),
 dict(path='angliyskiy/detyam', group='Английский', name='Английский для детей', aud='1–4 класс', subj='Английский', grade='3 класс',
      h1=('Английский язык для', 'детей 1–4 классов', ''), lead='Бесплатное открытое занятие: посмотрите, как проходят уроки для младших школьников. Занятия проходят очно в ЦКО МИЭТ.', title='Английский язык для детей'),
 dict(path='angliyskiy/razgovornyy', group='Английский', name='Разговорный английский', aud='По уровню', subj='Английский', grade='7 класс',
      h1=('Разговорный', 'английский', 'по вашему уровню'), lead='Бесплатное открытое занятие: определим уровень и подскажем подходящую группу. Занятия проходят очно в ЦКО МИЭТ.', title='Разговорный английский'),
 dict(path='angliyskiy/dlya-raboty', group='Английский', name='Английский для работы', aud='Взрослые', subj='Английский', grade='',
      h1=('Английский язык', 'для работы', ''), lead='Бесплатное открытое занятие: определим уровень и цели. Занятия проходят очно в ЦКО МИЭТ.', title='Английский язык для работы'),
 dict(path='matematika/shkolnikam', group='Школьная программа', name='Математика для школьников', aud='5–8 класс', subj='Математика', grade='6 класс',
      h1=('Математика для', 'школьников 5–8 классов', ''), lead='Бесплатное открытое занятие: посмотрите, как всё устроено, и узнайте уровень ребёнка. Занятия проходят очно в ЦКО МИЭТ.', title='Математика для школьников'),
 dict(path='russkiy/shkolnikam', group='Школьная программа', name='Русский язык для школьников', aud='5–8 класс', subj='Русский язык', grade='6 класс',
      h1=('Русский язык для', 'школьников 5–8 классов', ''), lead='Бесплатное открытое занятие: посмотрите, как всё устроено, и узнайте уровень ребёнка. Занятия проходят очно в ЦКО МИЭТ.', title='Русский язык для школьников'),
]
SUBJECTS = ['Математика', 'Русский язык', 'Английский', 'Физика', 'Химия', 'Биология', 'История', 'Обществознание', 'Информатика']
GRADES = ['1 класс', '2 класс', '3 класс', '4 класс', '5 класс', '6 класс', '7 класс', '8 класс', '9 класс', '10 класс', '11 класс']
PHONES = [('+7 (499) 735-32-65', '+74997353265'), ('+7 (916) 062-04-09', '+79160620409')]
VK = 'https://vk.com/cko_miet'
SITE = 'mietcenter.ru'
BASE = 'https://ivanhurs05-afk.github.io/-/cko/'
LOGO = '<span class="logo">ЦКО МИЭТ<i></i></span>'
CORE = [('Математика', 'ege/matematika', 'a'), ('Русский язык', 'ege/russkiy', 'b'), ('Английский', 'ege/angliyskiy', 'c'), ('Физика', 'ege/fizika', 'd')]
ICON = {'a': '<svg viewBox="0 0 24 24"><path d="M4 19V5m0 14h16M7 15l4-5 3 3 5-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'b': '<b>А</b>', 'c': '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
        'd': '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="4" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" fill="none" stroke="currentColor" stroke-width="2"/></svg>'}

def opt(items, sel=None): return ''.join(f'<option{" selected" if i == sel else ""}>{e(i)}</option>' for i in items)

def has(k): return bool(C.get(k))

def nav_items():
    n = [('Предметы', '#predmety')]
    if has('results'): n.append(('Результаты', '#results'))
    n.append(('Оплата', '#oplata'))
    if has('teachers'): n.append(('Преподаватели', '#teachers'))
    if has('reviews'): n.append(('Отзывы', '#reviews'))
    n.append(('Вопросы', '#faq'))
    return n

def form(fid, pg, final=False):
    t = 'Записаться' if final else 'Бесплатное открытое занятие'
    return f'''<form class="fcard" id="{fid}" data-form novalidate>
  <p class="fcard__top">Позвоните нам или оставьте заявку</p>
  <p class="fcard__sub">Перезвоним в течение рабочего дня</p>
  <div class="msgr"><a class="msg" href="tel:{PHONES[0][1]}">Позвонить</a><a class="msg" href="{VK}" target="_blank" rel="noopener">ВКонтакте</a></div>
  <p class="or"><span>или</span></p>
  <h3>{t}</h3>
  <label>Имя родителя<input name="name" autocomplete="name" placeholder="Как к вам обращаться" required></label>
  <label>Предмет<select name="subject">{opt(SUBJECTS, pg['subj'])}</select></label>
  <label>Класс ребёнка<select name="grade">{opt(GRADES + ['Взрослый'], pg['grade'] or 'Взрослый')}</select></label>
  <label>Телефон<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required></label>
  <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
  <label class="agree"><input type="checkbox" name="agree" required><span>Я родитель или законный представитель и согласен на обработку персональных данных (<a href="../../consent.html" target="_blank" rel="noopener">согласие</a>, <a href="../../privacy.html" target="_blank" rel="noopener">политика</a>)</span></label>
  <button class="btn btn--lg" type="submit">Записаться бесплатно</button>
  <p class="fstatus" role="status" aria-live="polite" hidden></p>
</form>'''

def optional_blocks():
    out = ''
    if has('results'):
        cards = ''.join(f'<article class="card res"><b>{e(r.get("big",""))}</b><p>{e(r.get("text",""))}</p><span>{e(r.get("who",""))}</span></article>' for r in C['results'])
        out += f'<section class="sec sec--blue" id="results"><div class="wrap"><p class="tag tag--lime">РЕЗУЛЬТАТЫ</p><h2>Результаты учеников</h2><div class="grid3">{cards}</div></div></section>'
    if has('teachers'):
        cards = ''.join(f'<article class="card tch">' + (f'<img src="{e(t["photo"])}" alt="{e(t["name"])}" loading="lazy">' if t.get('photo') else '') + f'<div><span class="tag tag--lime">{e(t.get("role",""))}</span><h3>{e(t["name"])}</h3><p>{e(t.get("text",""))}</p></div></article>' for t in C['teachers'])
        out += f'<section class="sec" id="teachers"><div class="wrap"><p class="tag tag--cyan">КТО УЧИТ</p><h2>Преподаватели</h2><div class="grid2">{cards}</div></div></section>'
    if has('reviews'):
        cards = ''.join(f'<article class="card rev"><p>«{e(r["text"])}»</p><span>{e(r.get("author",""))}</span></article>' for r in C['reviews'])
        out += f'<section class="sec sec--soft" id="reviews"><div class="wrap"><p class="tag tag--lime">РОДИТЕЛЯМ</p><h2>Отзывы родителей</h2><div class="grid2">{cards}</div></div></section>'
    return out

def prices_block():
    if has('prices'):
        rows = ''.join(f'<article class="card price"><h3>{e(p["title"])}</h3><p class="price__sum">{e(p["price"])}</p><p>{e(p.get("note",""))}</p></article>' for p in C['prices'])
        body = f'<div class="grid3">{rows}</div><p class="note">{e(C.get("price_note",""))}</p>'
    else:
        body = '<div class="card payc"><div><h3>Стоимость назовём по телефону</h3><p>Она зависит от предмета, класса и формата занятий. Оставьте заявку или позвоните: подскажем и подберём группу.</p></div><a class="btn" href="#zapis">Узнать стоимость</a></div>'
    perks = '<ul class="perks"><li>Мини-группы</li><li>Оплата частями</li><li>Материнский капитал</li><li>Налоговый вычет</li></ul>'
    g = f'<div class="guar"><b>{e(C["guarantee"])}</b></div>' if has('guarantee') else ''
    return f'<section class="sec sec--soft" id="oplata"><div class="wrap"><p class="tag tag--lime">ОПЛАТА</p><h2>Всё честно и сразу</h2><p class="sub">Условия оплаты ЦКО МИЭТ.</p>{perks}{body}{g}</div></section>'

FAQ = [
 ('Как проходят занятия?', 'Занятия проходят очно в ЦКО МИЭТ в мини-группах. Подробности о расписании и преподавателе расскажем при записи.'),
 ('Что такое бесплатное открытое занятие?', 'Это знакомство с центром: можно прийти, посмотреть, как всё устроено, и задать вопросы. Дату и время подскажем после заявки.'),
 ('Сколько стоит обучение?', 'Стоимость зависит от предмета, класса и формата. Назовём её по телефону или после заявки.'),
 ('Можно ли оплатить частями или материнским капиталом?', 'Да, в центре доступны оплата частями, оплата материнским капиталом и налоговый вычет. Детали и документы уточнит администратор.'),
 ('С какого класса и по каким предметам вы берёте?', 'Подскажем при записи: напишите класс и предмет в заявке, и мы подберём группу.'),
]

def render(pg):
    X = pg['h1']
    lic = f'<p>Образовательная лицензия: {e(C["license"])}</p>' if has('license') else ''
    nav = ''.join(f'<a href="{h}">{t}</a>' for t, h in nav_items())
    phone = ''.join(f'<a href="tel:{p[1]}">{p[0]}</a>' for p in PHONES)
    ticker = ''.join(f'<span>{e(s)}</span><i></i>' for s in SUBJECTS[:8]) * 2
    core = ''.join(f'<a class="card subj" href="../../{p}/"><span class="ico ico--{c}">{ICON[c]}</span><h3>{n}</h3><p>ЕГЭ, ОГЭ и школьная программа</p></a>' for n, p, c in CORE)
    faq = ''.join(f'<details{" open" if i == 0 else ""}><summary>{e(q)}</summary><p>{e(a)}</p></details>' for i, (q, a) in enumerate(FAQ))
    pills = ''.join(f'<li class="pill{" pill--on" if i == 0 else ""}">{t}</li>' for i, t in enumerate(['Бесплатное открытое занятие', 'Мини-группы', 'Очно в ЦКО МИЭТ', pg['aud']]))
    stats = f'<div class="stat"><b>0 ₽</b><span>открытое занятие в ЦКО МИЭТ</span></div><div class="stat"><b>{e(pg["aud"])}</b><span>{e(pg["group"])}, {e(pg["name"])}</span></div>'
    return f'''<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(pg["title"])} — ЦКО МИЭТ</title>
<meta name="description" content="{e(pg["title"])} в ЦКО МИЭТ: очные занятия в мини-группах, бесплатное открытое занятие. Оплата частями, материнский капитал, налоговый вычет.">
<meta name="robots" content="noindex">
<meta property="og:title" content="{e(pg["title"])} — ЦКО МИЭТ"><meta property="og:type" content="website">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<link rel="preload" href="../../../assets/fonts/ffb0f3eb29.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../../../assets/fonts.css"><link rel="stylesheet" href="../../cko.css">
<script>document.documentElement.classList.add('js');</script>
</head><body>
<header class="top"><div class="wrap top__in">
  <a href="../../" class="brand" aria-label="ЦКО МИЭТ">{LOGO}</a>
  <nav class="top__nav" aria-label="Разделы">{nav}</nav>
  <div class="top__r"><div class="top__ph">{phone}</div><a class="btn btn--sm" href="#zapis">Бесплатное занятие</a></div>
</div></header>
<main>
<section class="hero"><div class="wrap hero__grid">
  <div class="hero__txt">
    <p class="badge">ПЕРВОЕ ЗАНЯТИЕ БЕСПЛАТНО</p>
    <h1>{e(X[0])} <span class="hl">{e(X[1])}</span> {e(X[2])}</h1>
    <p class="lead">{e(pg["lead"])}</p>
    <ul class="pills">{pills}</ul>
    <div class="stats">{stats}</div>
  </div>
  {form("zapis", pg)}
</div></section>
<div class="ticker" aria-hidden="true"><div class="ticker__in">{ticker}</div></div>

<section class="sec" id="about"><div class="wrap about">
  <div><p class="tag tag--cyan">О ЦЕНТРЕ</p><h2>Центр компьютерного обучения МИЭТ</h2>
  <p class="sub">Очные занятия для детей и подростков в мини-группах. Начните с бесплатного открытого занятия: придёте, посмотрите, как всё устроено, и решите вместе с нами.</p>
  <ul class="ticks"><li>Очные занятия в мини-группах</li><li>Бесплатное открытое занятие</li><li>Оплата частями, материнский капитал, налоговый вычет</li></ul></div>
  <button class="photo" type="button" data-full="../../img/building.webp"><img src="../../img/building.webp" alt="Здание МИЭТ" width="1179" height="663" loading="lazy"><span>МИЭТ</span></button>
</div></section>

<section class="sec sec--soft" id="predmety"><div class="wrap">
  <p class="tag tag--lime">ПРЕДМЕТЫ</p><h2>Ведём почти всю школьную программу</h2>
  <div class="grid4">{core}</div>
  <p class="more">✓ Ещё химия, биология, история, обществознание, информатика. Подготовка к ЕГЭ и ОГЭ, школьная программа. <a href="../../">Все страницы →</a></p>
</div></section>

{optional_blocks()}
{prices_block()}

<section class="sec" id="faq"><div class="wrap wrap--narrow">
  <p class="tag tag--sky">ВОПРОСЫ</p><h2>Что обычно спрашивают</h2><div class="faq">{faq}</div>
</div></section>

<section class="final" id="final"><div class="wrap final__grid">
  <div class="final__txt">
    <h2>Запишите ребёнка на <span class="hl">бесплатное</span> занятие</h2>
    <p class="final__sub">Ничего не платите и ничего не обещаете. Просто посмотрите, как всё устроено.</p>
    <ul class="fticks"><li>Узнаете уровень ребёнка</li><li>Познакомитесь с форматом занятий</li><li>Узнаете стоимость и условия оплаты</li></ul>
    <p class="steps_t">Что будет после заявки</p>
    <ol class="fsteps"><li>Перезвоним в течение рабочего дня</li><li>Подберём группу и удобное время</li><li>Проведём занятие — платить не нужно</li></ol>
  </div>
  {form("final-form", pg, True)}
</div></section>
</main>

<footer class="foot"><div class="wrap">
  <div class="foot__grid">
    <div><div class="brand">{LOGO}</div><p class="foot__d">Центр компьютерного обучения МИЭТ. Очные занятия для детей и подростков в мини-группах. Подготовка к ЕГЭ и ОГЭ, школьная программа, английский.</p></div>
    <div><b>Разделы</b>{"".join(f'<a href="{h}">{t}</a>' for t, h in nav_items())}</div>
    <div><b>Контакты</b>{phone}<a href="{VK}" target="_blank" rel="noopener">ВКонтакте</a><a href="https://{SITE}" target="_blank" rel="noopener">{SITE}</a><span data-legal-row="email"><a href="#" data-legal="email"></a></span></div>
  </div>
  <div class="req"><span data-legal-row="name" data-legal="name"></span> <span data-legal-row="status" data-legal="status"></span> <span data-legal-row="inn">ИНН <span data-legal="inn"></span></span> <span data-legal-row="ogrnip">ОГРНИП <span data-legal="ogrnip"></span></span> <span data-legal-row="address" data-legal="address"></span>
    <p><a href="../../privacy.html">Политика конфиденциальности</a> · <a href="../../consent.html">Согласие на обработку персональных данных</a> · <a href="#" data-cookie-settings>Настройки cookie</a></p>{lic}</div>
</div></footer>
<div class="cookie" id="cookie" role="dialog" aria-label="Файлы cookie" hidden>
  <p>Сайт использует файлы cookie и сервис «Яндекс Метрика» для статистики и улучшения работы, в том числе запись действий на странице. Вы можете отказаться. Подробнее: <a href="../../privacy.html#cookies-info">политика обработки персональных данных</a>.</p>
  <div class="cookie__btns"><button class="btn btn--sm" type="button" data-cookie="yes">Принять</button><button class="btn btn--sm btn--ghost" type="button" data-cookie="no">Отклонить</button></div>
</div>
<div class="mbar" id="mbar"><a class="btn btn--ghost" href="tel:{PHONES[0][1]}">Позвонить</a><a class="btn" href="#zapis">Записаться</a></div>
<script>window.METRIKA_ID_OVERRIDE = 103512796;</script>
<script src="../../legal.js"></script><script src="../../../common.js"></script><script src="../../cko.js"></script>
</body></html>'''

def catalog():
    groups = {}
    for p in PAGES: groups.setdefault(p['group'], []).append(p)
    blocks = ''.join(f'<h2>{e(g)}</h2><div class="grid4">' + ''.join(f'<a class="card subj" href="{p["path"]}/"><h3>{e(p["name"])}</h3><p>{e(p["aud"])}</p></a>' for p in ps) + '</div>' for g, ps in groups.items())
    return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Посадочные страницы ЦКО МИЭТ</title><meta name="robots" content="noindex">
<link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../assets/fonts.css"><link rel="stylesheet" href="cko.css"></head><body>
<header class="top"><div class="wrap top__in"><span class="brand">{LOGO}</span></div></header>
<main class="sec"><div class="wrap"><p class="tag tag--lime">КАТАЛОГ</p><h1 class="cat__h">Посадочные страницы под Яндекс Директ ({len(PAGES)})</h1>{blocks}</div></main></body></html>'''

if __name__ == '__main__':
    for p in PAGES:
        d = os.path.join(ROOT, p['path']); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(render(p))
    open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(catalog())
    print('pages:', len(PAGES))
    for k in ('license', 'address'):
        if not C.get(k): print('ВНИМАНИЕ: не заполнено', k, '(content.json)')
