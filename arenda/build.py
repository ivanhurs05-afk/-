#!/usr/bin/env python3
"""Сборка сайта «Моя Аренда»: python3 arenda/build.py  ->  arenda/index.html, privacy.html, consent.html"""
import os, html, json
ROOT = os.path.dirname(os.path.abspath(__file__))
METRIKA_ID = 0          # номер счётчика Метрики; 0 = счётчика нет, баннер cookie не показывается
BRAND = 'Моя Аренда'
TG = 'MoyArenda_ru'
e = html.escape
REVIEWS = [r for r in json.load(open(os.path.join(ROOT, 'reviews.json'), encoding='utf-8')) if r['name'] != 'Аня Лудан']  # отзыв арендатора не берём: сайт для собственников
LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#12A8ED"/><path d="M14 31 32 16l18 15v17a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z" fill="#fff"/><rect x="27" y="35" width="10" height="15" rx="2" fill="#12A8ED"/></svg>'
FORM_BODY = '''<input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
  <label class="agree"><input type="checkbox" name="agree" required><span>Согласен на обработку персональных данных (<a href="consent.html" target="_blank" rel="noopener">согласие</a>, <a href="privacy.html" target="_blank" rel="noopener">политика</a>)</span></label>'''

def quiz():
    def opts(name, items, one=False):
        return f'<div class="opts{" opts--1" if one else ""}">' + ''.join(f'<label class="opt"><input type="radio" name="{name}" value="{e(v)}" required>{e(v)}</label>' for v in items) + '</div>'
    return f'''<form class="qcard" id="calc" data-form data-kind="calc" novalidate>
  <h2>Сколько принесёт ваша квартира</h2><p class="qsub">Ответьте на три вопроса. Мы посчитаем и свяжемся с вами.</p>
  <div class="qprog" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i></div>
  <div class="qstep is-on" data-step="1"><p class="qq">Сколько комнат?</p>{opts("rooms", ["Студия", "1 комната", "2 комнаты", "3 и больше"])}</div>
  <div class="qstep" data-step="2"><p class="qq">Что сейчас с квартирой?</p>{opts("status", ["Пустует", "Сдаю сам", "Только купил, хочу сдавать", "Живу в другом городе или стране"], True)}</div>
  <div class="qstep" data-step="3"><p class="qq">В каком она состоянии?</p>{opts("state", ["Нужен ремонт", "Жилая, обычное состояние", "Свежий ремонт или новая"], True)}</div>
  <div class="qstep" data-step="4"><p class="qq">Куда отправить расчёт?</p>
    <label class="f">Имя<input name="name" autocomplete="name" placeholder="Как к вам обращаться" required></label>
    <label class="f">Телефон<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required></label>
    {FORM_BODY}
    <button class="btn btn--lg" type="submit">Получить расчёт</button><p class="fstatus" role="status" aria-live="polite" hidden></p></div>
  <button class="qback" type="button" hidden>← Назад</button>
</form>'''

def consult():
    return f'''<form class="qcard" id="consult" data-form data-kind="consult" novalidate>
  <h2>Остались вопросы?</h2><p class="qsub">Оставьте телефон. Позвоним и ответим.</p>
  <label class="f">Имя<input name="name" autocomplete="name" placeholder="Как к вам обращаться" required></label>
  <label class="f">Телефон<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required></label>
  <label class="f">Вопрос, если есть<input name="note" placeholder="Например: живу в другой стране"></label>
  {FORM_BODY}
  <button class="btn btn--lg" type="submit">Перезвоните мне</button><p class="fstatus" role="status" aria-live="polite" hidden></p>
</form>'''

FAQ = [
 ('Чем вы отличаетесь от риелтора?', 'Риелтор обычно находит арендатора и оформляет сделку, после этого собственник остаётся с квартирой сам. Мы ведём квартиру всё время аренды: общаемся с жильцами, следим за платежами, решаем поломки.'),
 ('Я живу в другом городе или за границей. Это нормально?', 'Да, большинство задач не требуют вашего присутствия. Консультация проходит по телефону или видеосвязи, договор можно подписать удалённо.'),
 ('Как узнать, сколько принесёт моя квартира?', 'Ответьте на три вопроса в форме выше и оставьте телефон. Мы оценим арендную плату по вашей квартире и расскажем, что можно улучшить.'),
 ('Сколько стоят ваши услуги?', 'Это процент от арендной платы: 10% за одну квартиру (но не меньше 4 000 ₽) и 9%, если квартир три и больше (но не меньше 3 500 ₽). Точную сумму назовём после оценки.'),
 ('А если жильцы испортят имущество?', 'Все квартиры мы страхуем через АльфаСтрахование на 1 млн ₽: от пожара, залива, ущерба соседям и кражи. Ущерб имуществу компенсируем за 48 часов, до 100 000 ₽. При заливе или пожаре выплата до 600 000 ₽. Условия расскажем на консультации.'),
 ('Что будет после заявки?', 'Мы позвоним, уточним детали по квартире и посчитаем арендный доход. Дальше консультация по телефону, видеосвязи или лично. Если решите работать с нами, подпишем договор.'),
 ('В каких городах работаете?', 'Сейчас принимаем квартиры только в Новосибирске.')]

def page():
    faq = ''.join(f'<details{" open" if i == 0 else ""}><summary>{e(q)}</summary><p>{e(a)}</p></details>' for i, (q, a) in enumerate(FAQ))
    who = [('beach', 'Живёте в другом городе или стране', 'Квартира в Новосибирске, а вы далеко. Ездить на показы и искать жильцов не придётся.'),
           ('desk', 'Одна квартира и нет времени', 'Не хотите разбираться в аренде или боитесь ошибиться с арендатором.'),
           ('investor', 'Две-три квартиры', 'Хотите получать доход, а не заниматься каждой квартирой лично.'),
           ('family', 'Купили квартиру в семейную ипотеку', 'Платите ипотеку и не готовы сами сдавать квартиру.')]
    whoh = ''.join(f'<figure><img src="img/{k}.webp" alt="" width="720" height="540" loading="lazy"><figcaption><b>{e(t)}</b><span>{e(d)}</span></figcaption></figure>' for k, t, d in who)
    svc = [('Оценка и объявления', 'Оцениваем квартиру по рыночной цене, делаем фото и размещаем объявление на всех площадках.'),
           ('Проверка жильцов', 'Отбираем арендаторов и проверяем, нет ли у них долгов у приставов.'),
           ('Показы и договор', 'Сами показываем квартиру, заселяем и выселяем. Договор составляют юристы.'),
           ('Платежи и осмотры', 'Следим, чтобы аренду платили каждый месяц. Раз в три месяца осматриваем квартиру и присылаем фотоотчёт.'),
           ('Связь с жильцами', 'Все бытовые вопросы решаем сами, пока жильцы живут в квартире.'),
           ('Ремонт и обслуживание', 'Вызываем мастера, если что-то сломалось: сантехника, электрика. После выезда жильцов готовим квартиру к новому заселению.')]
    svch = ''.join(f'<div><h3>{e(t)}</h3><p>{e(d)}</p></div>' for t, d in svc)
    ins = [('Ущерб имуществу', 'Жильцы сломали технику или мебель. Компенсируем за 48 часов.', 'до 100 000 ₽'),
           ('Залив', 'Покрываем ремонт, замену имущества и компенсацию соседям.', 'до 600 000 ₽'),
           ('Пожар', 'Покрываем ремонт и восстановление имущества.', 'до 600 000 ₽')]
    insh = ''.join(f'<div class="row"><b>{e(t)}</b><span>{e(d)}</span><em>{e(a)}</em></div>' for t, d, a in ins)
    steps = [('Заявка', 'Вы отвечаете на три вопроса и оставляете телефон.'),
             ('Оценка', 'Считаем, сколько может приносить квартира.'),
             ('Консультация', 'Обсуждаем результат по телефону, видеосвязи или лично.'),
             ('Договор', 'Если всё устраивает, подписываем договор и начинаем искать жильцов.')]
    steph = ''.join(f'<li><b>{e(t)}</b><span>{e(d)}</span></li>' for t, d in steps)
    revh = ''.join(f'<blockquote><p>{e(r["text"])}</p><footer>{e(r["name"])}, {e(r["date"])} · <a href="{e(r["url"])}" target="_blank" rel="noopener">читать на 2ГИС</a></footer></blockquote>' for r in REVIEWS)
    return f'''<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{BRAND} — управление арендой квартир в Новосибирске</title>
<meta name="description" content="Сдаём квартиры в Новосибирске в долгосрочную аренду и ведём их под ключ: жильцы, платежи, ремонт, страховка. Рассчитаем, сколько принесёт ваша квартира.">
<meta name="robots" content="noindex">
<meta property="og:title" content="{BRAND} — управление арендой квартир"><meta property="og:type" content="website">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="../assets/fonts/ffb0f3eb29.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/fonts.css"><link rel="stylesheet" href="arenda.css">
</head><body>
<header class="top"><div class="wrap top__in">
  <a href="#" class="brand" aria-label="{BRAND}">{LOGO}{BRAND}</a>
  <nav class="top__nav" aria-label="Разделы"><a href="#what">Отличия</a><a href="#services">Услуги</a><a href="#insurance">Страховка</a><a href="#price">Стоимость</a><a href="#reviews">Отзывы</a><a href="#faq">Вопросы</a></nav>
  <a class="btn btn--sm" href="#calc" data-goal="click_cta">Рассчитать доход</a>
</div></header>
<main>
<section class="hero"><div class="wrap hero__grid">
  <div>
    <h1>Сдаём квартиры в Новосибирске и управляем арендой</h1>
    <p class="lead">Находим жильцов, проверяем их, заселяем и дальше ведём квартиру сами: платежи, поломки, осмотры. Вам остаются арендная плата и отчёты. Жить в Новосибирске для этого не нужно.</p>
    <p class="hero__facts">Работаем с 2023 года · 30+ квартир в управлении · оценка 5.0 на 2ГИС · 95% собственников продлили договор</p>
  </div>
  {quiz()}
</div></section>

<section class="sec" id="what"><div class="wrap what">
  <div>
    <h2>Чем мы отличаемся от риелтора</h2>
    <p class="sub">Многие принимают нас за риелторов, но работа устроена иначе. Риелтор ищет арендатора и оформляет сделку. Мы остаёмся с квартирой и ведём её, пока она сдаётся.</p>
    <table class="cmp"><thead><tr><th></th><th>Риелтор</th><th>{BRAND}</th></tr></thead><tbody>
      <tr><th>Что делает</th><td>Находит арендатора, оформляет сделку</td><td>Находит жильцов и ведёт квартиру всё время аренды</td></tr>
      <tr><th>Общение с жильцами</th><td>Собственник</td><td>Мы</td></tr>
      <tr><th>Поломки и ремонт</th><td>Собственник</td><td>Мы вызываем мастера</td></tr>
      <tr><th>Приезжать в город</th><td>Часто нужно</td><td>Не нужно</td></tr>
    </tbody></table>
    <p class="note">В таблице обычная схема работы риелтора, у отдельных специалистов она может отличаться.</p>
  </div>
  <img class="what__img" src="img/living.webp" alt="Женщина с планшетом на диване в светлой комнате" width="900" height="666" loading="lazy">
</div></section>

<section class="sec sec--sky" id="for"><div class="wrap">
  <h2>Кому мы нужны</h2>
  <div class="who">{whoh}</div>
</div></section>

<section class="sec" id="services"><div class="wrap">
  <h2>Что входит в управление</h2>
  <div class="svc">{svch}</div>
</div></section>

<section class="sec sec--sky" id="insurance"><div class="wrap narrow">
  <h2>Страховка</h2>
  <p class="sub">Все квартиры мы страхуем через АльфаСтрахование на 1 млн ₽: от пожара, залива, ущерба соседям и кражи. Если жильцы что-то испортили, вы не остаётесь с этим один на один.</p>
  <div class="ins">{insh}</div>
  <p class="note">Выплаты указаны в рублях на один страховой случай. Подробные условия расскажем на консультации.</p>
</div></section>

<section class="sec" id="how"><div class="wrap narrow">
  <h2>Как начать</h2>
  <ol class="steps">{steph}</ol>
</div></section>

<section class="sec sec--sky" id="price"><div class="wrap narrow">
  <h2>Сколько это стоит</h2>
  <p class="sub">Платите процент от арендной платы.</p>
  <div class="ins">
    <div class="row"><b>Одна квартира</b><span>Но не меньше 4 000 ₽ в месяц</span><em>10%</em></div>
    <div class="row"><b>Три квартиры и больше</b><span>Но не меньше 3 500 ₽ за каждую</span><em>9%</em></div>
  </div>
  <p class="note">Точную сумму назовём после оценки вашей квартиры. <a href="#calc" data-goal="click_cta">Посчитать</a></p>
</div></section>

<section class="sec" id="reviews"><div class="wrap">
  <h2>Отзывы собственников</h2>
  <p class="sub">Отзывы с 2ГИС. Каждый можно прочитать целиком по ссылке.</p>
  <div class="revs">{revh}</div>
</div></section>

<section class="sec sec--sky" id="faq"><div class="wrap narrow">
  <h2>Вопросы и ответы</h2><div class="faq">{faq}</div>
</div></section>

<section class="sec final" id="final"><div class="wrap final__grid">
  <div>
    <h2>Посчитаем, сколько можно получать с вашей квартиры</h2>
    <p class="sub">Оставьте заявку, и мы оценим квартиру и расскажем, как всё будет устроено. Если вы живёте не в Новосибирске, это не мешает: консультация проходит по телефону или видеосвязи.</p>
    <p class="tgline">Пишем про аренду в Telegram: <a href="https://t.me/{TG}" target="_blank" rel="noopener" data-goal="click_telegram">@{TG}</a>, там 500 подписчиков.</p>
  </div>
  {consult()}
</div></section>
</main>

<footer class="foot"><div class="wrap">
  <div class="foot__grid">
    <div><a class="brand" href="#">{LOGO}{BRAND}</a><span>Управление арендой квартир в Новосибирске</span></div>
    <div><a href="https://t.me/{TG}" target="_blank" rel="noopener">Telegram @{TG}</a><span data-legal-row="email"><a href="#" data-legal="email"></a></span></div>
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
<main class="sec"><div class="wrap narrow legal">{body}</div></main>
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
