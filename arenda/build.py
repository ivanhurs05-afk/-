#!/usr/bin/env python3
"""Сборка сайта «Моя Аренда»: python3 arenda/build.py  ->  arenda/index.html, privacy.html, consent.html"""
import os, html
ROOT = os.path.dirname(os.path.abspath(__file__))
METRIKA_ID = 0          # номер счётчика Метрики; 0 = счётчика нет, баннер cookie не показывается
BRAND = 'Моя Аренда'
TG = 'MoyArenda_ru'
e = html.escape
LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#12A8ED"/><path d="M14 31 32 16l18 15v17a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z" fill="#fff"/><rect x="27" y="35" width="10" height="15" rx="2" fill="#12A8ED"/></svg>'
def ic(p): return f'<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">{p}</svg></span>'
I = dict(
 globe='<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
 home='<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-6h6v6"/>',
 coins='<circle cx="9" cy="9" r="6"/><path d="M15 9.5a6 6 0 1 1-5.5 8"/><path d="M9 6.5v5M7.5 8h3"/>',
 family='<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2 20c0-3.5 2.7-6 6-6s6 2.5 6 6M14.5 15c2.8-.6 7 .8 7 5"/>')
FORM_BODY = '''<input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
  <label class="agree"><input type="checkbox" name="agree" required><span>Я согласен на обработку персональных данных (<a href="consent.html" target="_blank" rel="noopener">согласие</a>, <a href="privacy.html" target="_blank" rel="noopener">политика</a>)</span></label>'''

def quiz():
    def opts(name, items, one=False):
        return f'<div class="opts{" opts--1" if one else ""}">' + ''.join(f'<label class="opt"><input type="radio" name="{name}" value="{e(v)}" required>{e(v)}</label>' for v in items) + '</div>'
    return f'''<form class="qcard" id="calc" data-form data-kind="calc" novalidate>
  <h2>Рассчитайте арендный доход</h2><p class="qsub">3 коротких вопроса, затем посчитаем и расскажем, сколько может приносить ваша квартира.</p>
  <div class="qprog" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i></div>
  <div class="qstep is-on" data-step="1"><p class="qq">Сколько комнат в квартире?</p>{opts("rooms", ["Студия", "1 комната", "2 комнаты", "3 и больше"])}</div>
  <div class="qstep" data-step="2"><p class="qq">Что сейчас с квартирой?</p>{opts("status", ["Пустует", "Сейчас сдаётся сам", "Только купил, планирую сдавать", "Живу в другом городе или стране"], True)}</div>
  <div class="qstep" data-step="3"><p class="qq">В каком состоянии квартира?</p>{opts("state", ["Нужен ремонт", "Жилая, обычное состояние", "Свежий ремонт или новая"], True)}</div>
  <div class="qstep" data-step="4"><p class="qq">Куда отправить расчёт?</p>
    <label class="f">Имя<input name="name" autocomplete="name" placeholder="Как к вам обращаться" required></label>
    <label class="f">Телефон<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required></label>
    {FORM_BODY}
    <button class="btn btn--lg" type="submit">Получить расчёт дохода</button><p class="fstatus" role="status" aria-live="polite" hidden></p></div>
  <button class="qback" type="button" hidden>← Назад</button>
</form>'''

def consult():
    return f'''<form class="fcard" id="consult" data-form data-kind="consult" novalidate>
  <h2>Бесплатная консультация</h2><p class="qsub">Ответим на вопросы и подскажем, подойдёт ли вам сдача квартиры под управление.</p>
  <label class="f">Имя<input name="name" autocomplete="name" placeholder="Как к вам обращаться" required></label>
  <label class="f">Телефон<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required></label>
  <label class="f">Вопрос (необязательно)<input name="note" placeholder="Например: живу в другом городе"></label>
  {FORM_BODY}
  <button class="btn btn--lg" type="submit">Записаться на консультацию</button><p class="fstatus" role="status" aria-live="polite" hidden></p>
</form>'''

FAQ = [
 ('Чем вы отличаетесь от риелтора?', 'Риелтор, как правило, помогает найти арендатора и оформить сделку, дальше собственник занимается квартирой сам. «Моя Аренда» берёт на себя сдачу квартиры под ключ и управление арендой: вы не ищете жильцов и не решаете вопросы аренды самостоятельно.'),
 ('Я живу в другом городе или за границей. Это нормально?', 'Да. Собственнику не нужно быть в Новосибирске: консультация проходит по телефону или видеосвязи, а квартирой занимаемся мы.'),
 ('Как узнать, сколько принесёт моя квартира?', 'Ответьте на три вопроса в форме расчёта и оставьте телефон. Мы оценим арендный доход по вашей квартире и расскажем результат на консультации.'),
 ('Сколько стоят ваши услуги?', 'Условия зависят от квартиры и договора. Назовём точную стоимость на консультации после оценки, без скрытых платежей и сюрпризов в договоре.'),
 ('Что происходит после заявки?', 'Мы связываемся с вами, уточняем детали, считаем арендный доход и проводим консультацию: по телефону, по видеосвязи или лично. Если решите работать с нами, заключаем договор.'),
 ('В каких городах вы работаете?', 'Сейчас принимаем квартиры в Новосибирске.')]

def page():
    faq = ''.join(f'<details{" open" if i == 0 else ""}><summary>{e(q)}</summary><p>{e(a)}</p></details>' for i, (q, a) in enumerate(FAQ))
    who = [('globe', 'Живёте в другом городе или стране', 'Квартира в Новосибирске, а вы далеко. Не нужно искать жильцов и ездить на показы.'),
           ('home', 'Одна квартира, нет времени и опыта', 'Боитесь ошибиться с арендатором или не хотите разбираться в аренде самостоятельно.'),
           ('coins', 'Инвестор с 2–3 квартирами', 'Хотите получать пассивный доход, а не заниматься сдачей каждой квартиры лично.'),
           ('family', 'Семья с семейной ипотекой', 'Купили квартиру, но не готовы сами заниматься её сдачей.')]
    whoh = ''.join(f'<article class="card rv">{ic(I[k])}<h3>{e(t)}</h3><p>{e(d)}</p></article>' for k, t, d in who)
    steps = [('Заявка', 'Отвечаете на три вопроса и оставляете телефон.'), ('Оценка квартиры', 'Считаем, какой арендный доход может приносить ваша квартира.'),
             ('Консультация', 'Обсуждаем результат по телефону, видеосвязи или на личной встрече.'), ('Договор и старт', 'Если всё устраивает, заключаем договор и начинаем сдавать квартиру.')]
    steph = ''.join(f'<li class="rv"><h3>{e(t)}</h3><p>{e(d)}</p></li>' for t, d in steps)
    ck = lambda t: f'<li><i>✓</i><span>{t}</span></li>'
    cx = lambda t: f'<li><i>–</i><span>{t}</span></li>'
    return f'''<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{BRAND} — сдача квартиры в аренду под ключ в Новосибирске</title>
<meta name="description" content="Управление арендой квартир в Новосибирске под ключ. Рассчитаем арендный доход вашей квартиры. Подходит, если вы живёте в другом городе или не хотите сдавать сами.">
<meta name="robots" content="noindex">
<meta property="og:title" content="{BRAND} — сдача квартиры в аренду под ключ"><meta property="og:type" content="website">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="../assets/fonts/ffb0f3eb29.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/fonts.css"><link rel="stylesheet" href="arenda.css">
</head><body>
<header class="top"><div class="wrap top__in">
  <a href="#" class="brand" aria-label="{BRAND}">{LOGO}{BRAND}</a>
  <nav class="top__nav" aria-label="Разделы"><a href="#what">Что это</a><a href="#for">Кому подходит</a><a href="#how">Как работает</a><a href="#faq">Вопросы</a></nav>
  <a class="btn btn--sm" href="#calc" data-goal="click_cta">Рассчитать доход</a>
</div></header>
<main>
<section class="hero"><div class="wrap hero__grid">
  <div>
    <p class="badge">Новосибирск · долгосрочная аренда</p>
    <h1>Сдадим вашу квартиру в аренду <span class="hl">под ключ</span></h1>
    <p class="lead">Вы получаете доход от квартиры, а поиском арендатора и заботами об аренде занимаемся мы. Не нужно быть в городе и разбираться в этом самому.</p>
    <ul class="chips"><li>Рассчитаем арендный доход</li><li>Можно жить в другом городе</li><li>Консультация бесплатно</li></ul>
  </div>
  {quiz()}
</div></section>

<section class="sec" id="what"><div class="wrap">
  <p class="tag">Что это</p><h2>Это не риелтор. Это управление арендой</h2>
  <p class="sub">Многие думают, что мы просто ищем арендатора за комиссию. На самом деле мы ведём сдачу квартиры под ключ как управляющая компания.</p>
  <div class="cmp">
    <div class="cmp__c rv"><h3>Обычный риелтор</h3><p class="who">Разовая услуга</p><ul>{cx("Как правило, находит арендатора и оформляет сделку")}{cx("Дальше собственник занимается квартирой сам")}{cx("Нужно быть на связи и решать вопросы с жильцами")}</ul></div>
    <div class="cmp__c cmp__c--us rv"><h3>{BRAND}</h3><p class="who">Управление под ключ</p><ul>{ck("Сдаём квартиру в долгосрочную аренду и ведём её дальше")}{ck("Собственнику не нужно заниматься арендой самому")}{ck("Можно жить в другом городе или стране")}</ul></div>
  </div>
</div></section>

<section class="sec sec--sky" id="for"><div class="wrap">
  <p class="tag">Кому подходит</p><h2>Для тех, кто хочет доход без хлопот</h2>
  <div class="grid4">{whoh}</div>
</div></section>

<section class="sec" id="how"><div class="wrap">
  <p class="tag">Как это работает</p><h2>От заявки до договора за четыре шага</h2>
  <ol class="steps">{steph}</ol>
</div></section>

<section class="sec sec--sky"><div class="wrap">
  <div class="tg rv"><div><h2>Пишем про аренду в Telegram</h2><p>Полезные материалы для собственников: как сдавать квартиру и на что обращать внимание. Уже 500 подписчиков.</p></div>
  <a class="btn" href="https://t.me/{TG}" target="_blank" rel="noopener" data-goal="click_telegram">@{TG}</a></div>
</div></section>

<section class="sec" id="faq"><div class="wrap wrap--narrow">
  <p class="tag">Вопросы</p><h2>Что обычно спрашивают</h2><div class="faq">{faq}</div>
</div></section>

<section class="final" id="final"><div class="wrap final__grid">
  <div><h2>Узнайте, сколько принесёт ваша квартира</h2>
  <p class="sub">Оставьте телефон, и мы свяжемся с вами, ответим на вопросы и подскажем, как лучше сдавать.</p>
  <ul><li>Бесплатная консультация</li><li>Можно по телефону или видеосвязи</li><li>Подойдёт, даже если вы живёте в другом городе</li></ul></div>
  {consult()}
</div></section>
</main>

<footer class="foot"><div class="wrap">
  <div class="foot__grid">
    <div><a class="brand" href="#">{LOGO}{BRAND}</a><span>Управление арендой квартир в Новосибирске</span></div>
    <div><b>Разделы</b><a href="#what">Что это</a><a href="#for">Кому подходит</a><a href="#how">Как работает</a><a href="#faq">Вопросы</a></div>
    <div><b>Связь</b><a href="https://t.me/{TG}" target="_blank" rel="noopener">Telegram @{TG}</a><span data-legal-row="email"><a href="#" data-legal="email"></a></span></div>
  </div>
  <div class="req"><span data-legal-row="status" data-legal="status"></span> <b data-legal="name"></b> <span data-legal-row="inn">ИНН <span data-legal="inn"></span></span> <span data-legal-row="ogrnip">ОГРНИП <span data-legal="ogrnip"></span></span> <span data-legal-row="address" data-legal="address"></span>
  <p><a href="privacy.html">Политика конфиденциальности</a> · <a href="consent.html">Согласие на обработку персональных данных</a> · <a href="#" data-cookie-settings>Настройки cookie</a></p></div>
</div></footer>
{cookie("")}
<div class="mbar" id="mbar"><a class="btn" href="#calc" data-goal="click_cta">Рассчитать доход</a></div>
<script>window.METRIKA_ID_OVERRIDE = {METRIKA_ID};</script>
<script src="legal.js"></script><script src="../common.js"></script><script src="arenda.js"></script>
</body></html>'''

def cookie(pre):
    return f'''<div class="cookie" id="cookie" role="dialog" aria-label="Файлы cookie" hidden>
  <p>Сайт использует файлы cookie и сервис «Яндекс Метрика» для статистики и улучшения работы, в том числе запись действий на странице. Вы можете отказаться. Подробнее: <a href="{pre}privacy.html#cookies-info">политика обработки персональных данных</a>.</p>
  <div class="cookie__btns"><button class="btn btn--sm" type="button" data-cookie="yes">Принять</button><button class="btn btn--sm btn--ghost" type="button" data-cookie="no">Отклонить</button></div>
</div>'''

def legal_page(name, title):
    body = open(os.path.join(ROOT, name + '.main.html'), encoding='utf-8').read()
    return f'''<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)} — {BRAND}</title><meta name="robots" content="noindex">
<link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../assets/fonts.css"><link rel="stylesheet" href="arenda.css">
</head><body>
<header class="top"><div class="wrap top__in"><a href="./" class="brand" aria-label="На главную">{LOGO}{BRAND}</a><a class="btn btn--sm btn--ghost" href="./">← На главную</a></div></header>
<main class="sec"><div class="wrap wrap--narrow legal">{body}</div></main>
<footer class="foot"><div class="wrap"><div class="req"><span data-legal-row="status" data-legal="status"></span> <b data-legal="name"></b> <span data-legal-row="inn">ИНН <span data-legal="inn"></span></span> <span data-legal-row="ogrnip">ОГРНИП <span data-legal="ogrnip"></span></span> <span data-legal-row="address" data-legal="address"></span>
<p><a href="privacy.html">Политика конфиденциальности</a> · <a href="consent.html">Согласие на обработку персональных данных</a> · <a href="#" data-cookie-settings>Настройки cookie</a></p></div></div></footer>
{cookie("")}
<script>window.METRIKA_ID_OVERRIDE = {METRIKA_ID};</script>
<script src="legal.js"></script><script src="../common.js"></script>
</body></html>'''

if __name__ == '__main__':
    open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(page())
    for n, t in (('privacy', 'Политика обработки персональных данных'), ('consent', 'Согласие на обработку персональных данных')):
        open(os.path.join(ROOT, n + '.html'), 'w', encoding='utf-8').write(legal_page(n, t))
    print('ok')
    if not METRIKA_ID: print('ВНИМАНИЕ: METRIKA_ID не задан: счётчик не подключён')
