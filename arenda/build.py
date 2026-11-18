#!/usr/bin/env python3
"""Сборка сайта «Моя Аренда»: python3 arenda/build.py  ->  arenda/index.html, privacy.html, consent.html"""
import os, html, json
ROOT = os.path.dirname(os.path.abspath(__file__))
METRIKA_ID = 0          # номер счётчика Метрики; 0 = счётчика нет, баннер cookie не показывается
BRAND = 'Моя Аренда'
TG = 'MoyArenda_ru'
e = html.escape
import hashlib, re
def _ver():
    h = hashlib.md5()
    for f in ('arenda.css', 'arenda.js', 'legal.js', '../common.js'):
        h.update(open(os.path.join(ROOT, f), 'rb').read())
    return h.hexdigest()[:8]
def bust(t):
    v = _ver()
    return re.sub(r'((?:arenda\.css|arenda\.js|legal\.js|common\.js))"', lambda m: m.group(1) + '?v=' + v + '"', t)
REVIEWS = [r for r in json.load(open(os.path.join(ROOT, 'reviews.json'), encoding='utf-8')) if r['name'] != 'Аня Лудан']  # отзыв арендатора не берём: сайт для собственников
LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#12A8ED"/><path d="M14 31 32 16l18 15v17a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z" fill="#fff"/><rect x="27" y="35" width="10" height="15" rx="2" fill="#12A8ED"/></svg>'
FORM_BODY = '''<input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
  <label class="agree"><input type="checkbox" name="agree" required><span>Согласен на обработку персональных данных (<a href="consent.html" target="_blank" rel="noopener">согласие</a>, <a href="privacy.html" target="_blank" rel="noopener">политика</a>)</span></label>'''

def quiz():
    def opts(name, items, one=False):
        return f'<div class="opts{" opts--1" if one else ""}">' + ''.join(f'<label class="opt"><input type="radio" name="{name}" value="{e(v)}" required>{e(v)}</label>' for v in items) + '</div>'
    return f'''<form class="qcard" id="calc" data-form data-kind="calc" novalidate>
  <h2>Три вопроса о квартире</h2><p class="qsub">Потом мы посчитаем и свяжемся с вами.</p>
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
  <h2>Перезвоним и ответим</h2><p class="qsub">Оставьте телефон, мы свяжемся с вами.</p>
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
    faq = ''.join(f'<details{" open" if i == 0 else ""}><summary><span>{e(q)}</span><i aria-hidden="true"></i></summary><p>{e(a)}</p></details>' for i, (q, a) in enumerate(FAQ))
    who = [('beach', 'Живёте в другом городе или стране', 'Квартира в Новосибирске, а вы далеко. Ездить на показы и искать жильцов не придётся.'),
           ('desk', 'Одна квартира и нет времени', 'Не хотите разбираться в аренде или боитесь ошибиться с арендатором.'),
           ('investor', 'Две-три квартиры', 'Хотите получать доход, а не заниматься каждой квартирой лично.'),
           ('family', 'Купили в семейную ипотеку', 'Платите ипотеку и не готовы сами сдавать квартиру.')]
    whoh = ''.join(f'<article class="tile"><img src="img/{k}.webp" alt="" width="720" height="540" loading="lazy"><div><h3>{e(t)}</h3><p>{e(d)}</p></div></article>' for k, t, d in who)
    ins = [('до 100 000 ₽', 'Ущерб имуществу', 'Жильцы сломали технику или мебель. Компенсируем за 48 часов.'),
           ('до 600 000 ₽', 'Залив', 'Покрываем ремонт, замену имущества и компенсацию соседям.'),
           ('до 600 000 ₽', 'Пожар', 'Покрываем ремонт и восстановление имущества.')]
    insh = ''.join(f'<article class="card"><b class="big">{e(a)}</b><h3>{e(t)}</h3><p>{e(d)}</p></article>' for a, t, d in ins)
    cmp_rows = [('Поиск жильцов', 'Находит арендатора', 'Находит и проверяет жильцов'),
                ('После заселения', 'Собственник остаётся с квартирой сам', 'Ведём квартиру всё время аренды'),
                ('Общение с жильцами', 'Собственник', 'Мы'),
                ('Поломки и ремонт', 'Собственник', 'Вызываем мастера'),
                ('Приезжать в город', 'Часто нужно', 'Не нужно')]
    cmph = ''.join(f'<div class="cmp__row"><div><small>{e(l)}</small><span class="no">{e(a)}</span></div><div><small>{e(l)}</small><span class="yes">{e(b)}</span></div></div>' for l, a, b in cmp_rows)
    revh = ''.join(f'<blockquote class="card"><p>{e(r["text"])}</p><footer><b>{e(r["name"])}</b><span>{e(r["date"])}</span><a href="{e(r["url"])}" target="_blank" rel="noopener">Читать на 2ГИС</a></footer></blockquote>' for r in REVIEWS)
    return f"""<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{BRAND} — управление арендой квартир в Новосибирске</title>
<meta name="description" content="Берём квартиры в Новосибирске в управление: находим и проверяем жильцов, следим за платежами, решаем поломки, страхуем на 1 млн ₽. Рассчитаем, сколько принесёт ваша квартира.">
<meta name="robots" content="noindex">
<meta property="og:title" content="{BRAND} — управление арендой квартир"><meta property="og:type" content="website">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="../assets/fonts/ffb0f3eb29.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/fonts.css"><link rel="stylesheet" href="arenda.css">
</head><body>
<header class="top"><div class="wrap top__in">
  <a href="#" class="brand" aria-label="{BRAND}">{LOGO}{BRAND}</a>
  <nav class="top__nav" aria-label="Разделы"><a href="#how">Как это работает</a><a href="#insurance">Страховка</a><a href="#compare">Сравнение</a><a href="#price">Стоимость</a><a href="#reviews">Отзывы</a><a href="#faq">Вопросы</a></nav>
  <a class="btn btn--sm" href="#calc" data-goal="click_cta">Рассчитать доход</a>
</div></header>
<main>
<section class="hero"><div class="wrap hero__grid">
  <div class="hero__txt">
    <p class="eyebrow">Управление арендой в Новосибирске</p>
    <h1>Возьмём вашу квартиру <span class="acc">в управление</span></h1>
    <p class="lead">Найдём жильцов, будем следить за платежами и решать вопросы с квартирой. Вам остаётся получать арендную плату. Жить в Новосибирске для этого необязательно.</p>
    <div class="hero__btns"><a class="btn" href="#calc" data-goal="click_cta">Рассчитать доход</a><a class="btn btn--grey" href="#final" data-goal="click_cta">Получить консультацию</a></div>
    <dl class="hero__facts">
      <div><dt>30+</dt><dd>квартир в управлении</dd></div>
      <div><dt>5.0</dt><dd>оценка на 2ГИС</dd></div>
      <div><dt>от 9%</dt><dd>от аренды за услугу</dd></div>
    </dl>
  </div>
  <div class="hero__vis">
    <img src="img/hero-v.webp" alt="Женщина с планшетом на диване в светлой комнате" width="700" height="876">
    <div class="float float--a"><i class="ok" aria-hidden="true"></i><div><b>Платёж получен</b><span>аренда за месяц</span></div></div>
    <div class="float float--b"><i class="shield" aria-hidden="true"></i><div><b>Страховка до 1 млн ₽</b><span>пожар, залив, ущерб</span></div></div>
    <div class="float float--c"><i class="doc" aria-hidden="true"></i><div><b>Фотоотчёт</b><span>после каждого осмотра</span></div></div>
  </div>
</div></section>

<section class="sec sec--grey" id="estimate"><div class="wrap calc">
  <div class="calc__txt">
    <h2>Сколько принесёт ваша квартира</h2>
    <p class="sub">Ответьте на три вопроса. Мы оценим арендную плату, подскажем, что можно улучшить, и расскажем, как всё будет устроено.</p>
    <ul class="ticks"><li>Рассчитываем по вашей квартире, а не по средней цифре</li><li>Консультация бесплатная, по телефону, видеосвязи или лично</li><li>Заявка ни к чему не обязывает, пока вы не подписали договор</li></ul>
  </div>
  <div class="calc__form">{quiz()}</div>
</div></section>

<section class="sec" id="how"><div class="wrap">
  <h2>Как это работает</h2>
  <p class="sub">Сдавайте квартиру без лишних забот, а мы займёмся всем остальным на каждом этапе.</p>
  <ol class="steps">
    <li><span class="num">1</span><h3>Оценим квартиру</h3><p>Считаем, какую арендную плату можно получать и как сдать выгоднее.</p></li>
    <li><span class="num">2</span><h3>Найдём и проверим жильцов</h3><p>Сделаем фото и разместим объявление на всех площадках. Проверим кандидатов, в том числе долги у приставов.</p></li>
    <li><span class="num">3</span><h3>Проведём показы и заселим</h3><p>Показываем квартиру, заселяем и выселяем жильцов сами. Приезжать вам не нужно.</p></li>
    <li><span class="num">4</span><h3>Составим договор</h3><p>Договор составляют юристы. Если всё устраивает, подписываем и начинаем работу.</p></li>
  </ol>
</div></section>

<section class="sec sec--grey" id="after"><div class="wrap">
  <h2>Мы рядом, пока квартира сдаётся</h2>
  <div class="bento">
    <article class="bcard bcard--acc"><h3>Следим за платежами</h3><p>Контролируем, чтобы аренду платили каждый месяц.</p></article>
    <article class="bcard"><h3>Страхуем квартиру</h3><p>На 1 млн ₽ через АльфаСтрахование. <a href="#insurance">Что покрывает страховка</a></p></article>
    <article class="bcard"><h3>Общаемся с жильцами сами</h3><p>Все бытовые вопросы решаем мы, а не вы.</p></article>
    <article class="bcard"><h3>Ремонт и обслуживание</h3><p>Вызываем мастера, если что-то сломалось. Раз в три месяца осматриваем квартиру и присылаем фотоотчёт.</p></article>
  </div>
</div></section>

<section class="sec" id="insurance"><div class="wrap">
  <h2>Что покрывает страховка</h2>
  <p class="sub">Все квартиры мы страхуем через АльфаСтрахование на 1 млн ₽: от пожара, залива, ущерба соседям и кражи. Если жильцы что-то испортили, вы не остаётесь с этим один на один.</p>
  <div class="cards3">{insh}</div>
  <p class="note">Суммы указаны на один страховой случай. Подробные условия расскажем на консультации.</p>
</div></section>

<section class="sec sec--grey" id="exp"><div class="wrap">
  <h2>Наш опыт</h2>
  <div class="bento bento--4">
    <article class="bcard bcard--acc"><b class="big">30+</b><p>квартир в управлении</p></article>
    <article class="bcard"><b class="big">3 года</b><p>на рынке долгосрочной аренды</p></article>
    <article class="bcard"><b class="big">5.0</b><p>оценка на 2ГИС</p></article>
    <article class="bcard"><b class="big">95%</b><p>собственников продлили с нами договор</p></article>
  </div>
</div></section>

<section class="sec" id="compare"><div class="wrap">
  <h2>Давайте сравним?</h2>
  <div class="cmp">
    <div class="cmp__head"><div class="cmp__h cmp__h--grey"><h3>Риелтор</h3><p>Обычная схема работы</p></div><div class="cmp__h cmp__h--acc"><h3>{BRAND}</h3><p>Ведём квартиру под ключ</p></div></div>
    {cmph}
  </div>
  <p class="note center">В таблице обычная схема работы риелтора. У отдельных специалистов она может отличаться.</p>
</div></section>

<section class="sec sec--grey" id="for"><div class="wrap">
  <h2>Кому мы нужны</h2>
  <div class="tiles">{whoh}</div>
</div></section>

<section class="sec" id="price"><div class="wrap">
  <h2>Сколько это стоит</h2>
  <p class="sub">Платите процент от арендной платы. Точную сумму назовём после оценки вашей квартиры.</p>
  <div class="cards2">
    <article class="card"><b class="big">10%</b><h3>Одна квартира</h3><p>От арендной платы, но не меньше 4 000 ₽ в месяц.</p></article>
    <article class="card"><b class="big">9%</b><h3>Три квартиры и больше</h3><p>От арендной платы, но не меньше 3 500 ₽ за каждую.</p></article>
  </div>
</div></section>

<section class="sec sec--grey" id="reviews"><div class="wrap">
  <h2>Что говорят собственники</h2>
  <p class="sub">Отзывы с 2ГИС. По ссылке можно прочитать каждый целиком.</p>
  <div class="revs">{revh}</div>
</div></section>

<section class="sec" id="final"><div class="wrap">
  <div class="cta">
    <h2>Узнайте, сколько принесёт ваша квартира</h2>
    <p class="sub">Оставьте телефон, и мы позвоним, ответим на вопросы и подскажем, как лучше сдавать. Если вы живёте не в Новосибирске, консультация проходит по телефону или видеосвязи.</p>
    <div class="cta__form">{consult()}</div>
    <p class="tgline">Пишем про аренду в Telegram: <a href="https://t.me/{TG}" target="_blank" rel="noopener" data-goal="click_telegram">@{TG}</a>, там 500 подписчиков.</p>
  </div>
</div></section>

<section class="sec sec--tight" id="faq"><div class="wrap narrow">
  <h2>Остались вопросы?</h2>
  <div class="faq">{faq}</div>
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
</body></html>"""

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
    open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(bust(page()))
    for n, t in (('privacy', 'Политика обработки персональных данных'), ('consent', 'Согласие на обработку персональных данных')):
        open(os.path.join(ROOT, n + '.html'), 'w', encoding='utf-8').write(bust(legal_page(n, t)))
    print('ok')
    if not METRIKA_ID: print('ВНИМАНИЕ: METRIKA_ID не задан: счётчик не подключён')
