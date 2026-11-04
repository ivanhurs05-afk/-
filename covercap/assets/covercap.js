/* COVERCAP — поведение лендинга: контент из content.json, каталог, форма расчёта, аналитика по согласию. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var C = null;                       // content.json
  var LS = safeStorage('localStorage');
  var SS = safeStorage('sessionStorage');
  var CONSENT_KEY = 'cc_cookie_consent'; // 'accepted' | 'declined'
  var sentLeads = {};
  // Демо-показ на GitHub Pages: там нет PHP, заявки не принимаются — форма честно говорит, что это демо.
  var DEMO = /\.github\.io$/i.test(location.hostname);                 // lead_id → true, чтобы lead_success ушёл один раз

  function safeStorage(kind) {
    try { var s = window[kind]; s.setItem('__t', '1'); s.removeItem('__t'); return s; }
    catch (e) { return { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} }; }
  }
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function fmtRub(n) {
    return Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₽';
  }

  /* ---------- Аналитика (Яндекс Метрика, только после согласия) ---------- */
  var ymId = null;
  function goal(name, params) {
    if (ymId && typeof window.ym === 'function') {
      try { window.ym(ymId, 'reachGoal', name, params || {}); } catch (e) {}
    }
  }
  function loadMetrika() {
    var id = C && C.metrika && String(C.metrika.counter_id || '').trim();
    if (!id || !/^\d+$/.test(id) || ymId) return;
    ymId = Number(id);
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    // Вебвизор выключен: поля форм не записываются. Если включите — у полей уже стоит класс ym-disable-keys.
    window.ym(ymId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
  }
  function analyticsAllowed() { return LS.getItem(CONSENT_KEY) === 'accepted'; }

  function initCookies() {
    var box = $('[data-cookie]');
    var hasCounter = C && C.metrika && /^\d+$/.test(String(C.metrika.counter_id || ''));
    var st = LS.getItem(CONSENT_KEY);
    if (hasCounter && !st) box.hidden = false;
    if (st === 'accepted') loadMetrika();
    $('[data-cookie-accept]').addEventListener('click', function () {
      LS.setItem(CONSENT_KEY, 'accepted'); box.hidden = true; saveFirstTouch(); loadMetrika();
    });
    $('[data-cookie-decline]').addEventListener('click', function () {
      var was = LS.getItem(CONSENT_KEY);
      LS.setItem(CONSENT_KEY, 'declined'); LS.removeItem('cc_first_touch'); box.hidden = true;
      if (was === 'accepted') location.reload(); // выгрузить уже подключённый счётчик
    });
    $('[data-cookie-settings]').addEventListener('click', function () { box.hidden = false; $('[data-cookie-accept]').focus(); });
  }

  /* ---------- Источник обращения ---------- */
  function currentTouch() {
    var p = new URLSearchParams(location.search);
    var t = { ts: new Date().toISOString(), landing: location.pathname + location.search.replace(/([?&])(email|phone|name)=[^&]*/gi, '$1') };
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid'].forEach(function (k) {
      var v = p.get(k); if (v) t[k] = v.slice(0, 200);
    });
    try {
      if (document.referrer) {
        var r = new URL(document.referrer);
        if (r.host !== location.host) t.referrer = r.origin + r.pathname; // без query: там могут быть личные данные
      }
    } catch (e) {}
    return t;
  }
  function initTouches() {
    if (!SS.getItem('cc_session_touch')) SS.setItem('cc_session_touch', JSON.stringify(currentTouch()));
    if (analyticsAllowed()) saveFirstTouch();
  }
  function saveFirstTouch() {
    if (!LS.getItem('cc_first_touch')) LS.setItem('cc_first_touch', SS.getItem('cc_session_touch') || JSON.stringify(currentTouch()));
  }

  /* ---------- Контент ---------- */
  function applyContent() {
    $$('[data-c]').forEach(function (el) {
      var v = get(C, el.getAttribute('data-c'));
      if (v != null && v !== '') el.textContent = v;
    });
    $$('[data-c-href]').forEach(function (el) {
      var kind = el.getAttribute('data-c-href'), c = C.contacts || {}, href = '';
      if (kind === 'tel' && c.phone) href = 'tel:' + c.phone.replace(/[^\d+]/g, '');
      if (kind === 'mailto' && c.email) href = 'mailto:' + c.email;
      if (kind === 'telegram' && c.telegram) { href = 'https://t.me/' + c.telegram; el.textContent = '@' + c.telegram; }
      if (kind === 'instagram' && c.instagram) { href = 'https://instagram.com/' + c.instagram; el.textContent = '@' + c.instagram; }
      if (kind === 'proposal' && C.proposal_pdf) href = C.proposal_pdf;
      if (href) el.setAttribute('href', href);
      if (kind === 'tel' && c.phone && !c.phone_display) el.textContent = c.phone;
    });
    $$('[data-hide-empty]').forEach(function (el) {
      var v = get(C, el.getAttribute('data-hide-empty'));
      var flag = el.getAttribute('data-flag');
      el.hidden = !v || (flag && !get(C, flag));
    });
    var anyContact = $$('.contacts li[data-hide-empty]').some(function (li) { return !li.hidden; });
    $('[data-contacts-empty]').hidden = anyContact;

    var L = C.legal || {};
    var legal = [L.seller_name, L.inn && ('ИНН ' + L.inn), L.ogrn && ('ОГРН ' + L.ogrn), L.address].filter(Boolean).join(' · ');
    $('[data-legal-line]').textContent = legal || 'Крышки KISS для кофеен и заведений с напитками навынос.';

    if (C.photos_temporary === false) $$('[data-temp-photo]').forEach(function (el) { el.hidden = true; });

    renderPrices();
    renderCatalog();
    renderFormColors();
  }

  function priceApproved() {
    var P = C.prices || {};
    return !!(P.publish && P.actual_date);
  }
  function renderPrices() {
    var P = C.prices || {}, ok = priceApproved(), anyShown = false;
    ['d80', 'd90'].forEach(function (k) {
      var amount = ok && P.items && P.items[k] && P.items[k].amount;
      var has = typeof amount === 'number' && amount > 0;
      if (has) anyShown = true;
      var small = $('[data-price="' + k + '"]'), big = $('[data-price-big="' + k + '"]');
      if (small) small.textContent = has ? fmtRub(amount) + ' / шт.' : 'по запросу';
      if (big) big.innerHTML = has ? fmtRub(amount) + ' <small>/ шт.</small>' : 'Цена по запросу';
    });
    var box = $('[data-price-terms]'), ul = $('.terms', box);
    ul.innerHTML = '';
    if (anyShown) {
      [['Условие', P.volume_condition], ['НДС', P.vat], ['Минимальный заказ', P.min_order], ['Доставка', P.delivery],
       ['Цены актуальны на', P.actual_date && new Date(P.actual_date + 'T00:00:00').toLocaleDateString('ru-RU')]]
        .forEach(function (r) {
          if (!r[1]) return;
          var li = document.createElement('li'), b = document.createElement('b');
          b.textContent = r[0] + ': '; li.appendChild(b); li.appendChild(document.createTextNode(r[1])); ul.appendChild(li);
        });
      box.hidden = !ul.children.length;
      $('[data-price-note]').textContent = 'Точная сумма зависит от варианта и объёма — подготовим расчёт.';
    } else {
      box.hidden = true;
      $('[data-price-note]').textContent = 'Укажите вариант и объём — подготовим расчёт.';
    }
  }

  var STATUS_LABEL = { available: '', pending: 'уточняется' };
  function colorsFor(sku) {
    var item = C.catalog && C.catalog[sku];
    if (!item || item.status === 'hidden') return [];
    return Object.keys(item.colors || {}).filter(function (c) {
      return item.colors[c] !== 'hidden' && C.colors[c];
    }).map(function (c) { return { key: c, status: item.colors[c], label: C.colors[c].label, swatch: C.colors[c].swatch }; });
  }

  function renderCatalog() {
    ['d80', 'd90'].forEach(function (sku) {
      var card = $('.card[data-sku="' + sku + '"]');
      var item = C.catalog && C.catalog[sku];
      if (!card) return;
      card.hidden = !item || item.status === 'hidden';
      var fs = $('[data-swatches="' + sku + '"]', card);
      $$('.swatch', fs).forEach(function (n) { n.remove(); });
      var list = colorsFor(sku);
      fs.hidden = !list.length;
      list.forEach(function (c, i) {
        var lab = document.createElement('label'); lab.className = 'swatch';
        var inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'sw-' + sku; inp.value = c.key; if (i === 0) inp.checked = true;
        var dot = document.createElement('i'); dot.style.background = c.swatch;
        var t = document.createElement('span'); t.textContent = c.label;
        lab.appendChild(inp); lab.appendChild(dot); lab.appendChild(t);
        if (STATUS_LABEL[c.status]) { var s = document.createElement('small'); s.textContent = STATUS_LABEL[c.status]; lab.appendChild(s); }
        fs.appendChild(lab);
        inp.addEventListener('change', function () {
          setCardImage(card, c.key, true);
          goal('variant_select', { size: sku, color: c.key, place: 'catalog' });
        });
      });
      if (list[0]) setCardImage(card, list[0].key);
    });
  }
  function setCardImage(card, color, animate) {
    var img = $('[data-card-img]', card);
    if (!img || !/^(black|white|red)$/.test(color)) return;
    var names = { black: 'чёрного', white: 'белого', red: 'красного' };
    var swap = function () {
      img.src = 'assets/img/lid-' + color + '-460.webp';
      img.srcset = 'assets/img/lid-' + color + '-300.webp 300w, assets/img/lid-' + color + '-460.webp 460w';
      img.alt = 'Крышка KISS ' + names[color] + ' цвета, вид сверху';
    };
    if (!animate || reduceMotion || !img.animate) return swap();
    // Переворот крышки: половина оборота, смена цвета, вторая половина
    img.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: 220, easing: 'ease-in' }).onfinish = function () {
      swap();
      img.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration: 380, easing: 'cubic-bezier(.2,.9,.3,1.3)' });
    };
  }

  function renderFormColors() {
    var all = {};
    ['d80', 'd90'].forEach(function (s) { colorsFor(s).forEach(function (c) { all[c.key] = c; }); });
    var faq = $('[data-faq-colors]');
    var keys = Object.keys(all);
    if (faq && keys.length) {
      faq.textContent = 'Крышки KISS выпускаются в цветах: ' + keys.map(function (k) { return all[k].label.toLowerCase(); }).join(', ') +
        '. Наличие конкретного сочетания размера и цвета уточняем при расчёте.';
    }
  }

  /* ---------- Меню ---------- */
  function initNav() {
    var b = $('.burger'), nav = $('#nav');
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
      b.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () {
      b.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); b.setAttribute('aria-label', 'Открыть меню');
    }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { b.click(); b.focus(); }
    });
  }

  /* ---------- Мобильная кнопка ---------- */
  function initMobileBar() {
    var bar = $('[data-mbar]'), hero = $('.hero'), fin = $('.final');
    if (!('IntersectionObserver' in window)) return;
    bar.hidden = false; document.body.classList.add('has-mbar');
    var heroVisible = true, finalVisible = false;
    var upd = function () { bar.classList.toggle('is-on', !heroVisible && !finalVisible); };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; upd(); }, { threshold: 0 }).observe(hero);
    new IntersectionObserver(function (e) { finalVisible = e[0].isIntersecting; upd(); }, { threshold: 0 }).observe(fin);
  }

  /* ---------- Контакты ---------- */
  function initContactClicks() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-contact]');
      if (a) goal('contact_click', { channel: a.getAttribute('data-contact') });
      var g = e.target.closest('[data-goal="proposal_download"]');
      if (g) goal('proposal_download');
    });
  }

  /* ---------- Просмотр фото ---------- */
  function initLightbox() {
    var dlg = $('#lightbox'), img = $('img', dlg), opener = null;
    $$('[data-full]').forEach(function (b) {
      b.addEventListener('click', function () {
        opener = b; img.src = b.getAttribute('data-full'); img.alt = $('img', b).alt;
        dlg.showModal();
      });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
    dlg.addEventListener('close', function () { if (opener) opener.focus(); });
  }

  /* ---------- Форма расчёта: имя + телефон ---------- */
  var form, dlg, opener, submitting = false;
  var SIZE_LABEL = { d80: 'KISS Д80', d90: 'KISS Д90' };
  var COLOR_LABEL = { black: 'чёрный', white: 'белый', red: 'красный' };

  function initForm() {
    dlg = $('#quote'); form = $('#quote-form');
    if (typeof dlg.showModal !== 'function') { dlg.setAttribute('open', ''); dlg.style.position = 'static'; }
    $$('[data-quote]').forEach(function (b) { b.addEventListener('click', function () { openQuote(b); }); });
    $$('[data-close]', dlg).forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      document.documentElement.style.overflow = '';
      if (!$('[data-success]', dlg).hidden) resetAfterSuccess();
      if (opener && document.contains(opener)) opener.focus();
    });
    form.addEventListener('change', function (e) { if (e.target.name === 'consent' && e.target.checked) clearErr('consent'); });
    form.contact.addEventListener('input', function () { if (form.contact.getAttribute('aria-invalid')) validatePhone(); });
    form.contact.addEventListener('blur', function () { if (form.contact.value.trim()) validatePhone(); });
    form.name.addEventListener('input', function () { if (form.name.getAttribute('aria-invalid')) validateName(); });
    form.addEventListener('submit', onSubmit);
    if (location.hash === '#repeat' || location.hash === '#quote') {
      openQuote($(location.hash === '#repeat' ? '[data-quote="repeat"]' : '[data-quote="hero"]'));
    }
  }

  function openQuote(btn) {
    opener = btn;
    var placement = btn.getAttribute('data-quote');
    form.placement.value = placement;
    var size = btn.getAttribute('data-size') || 'help';
    var color = 'undecided';
    if (size !== 'help') {
      var card = btn.closest('.card'), sw = card && card.querySelector('.swatch input:checked');
      if (sw) color = sw.value;
    }
    form.size.value = size;
    form.color.value = color;
    form.request_type.value = btn.getAttribute('data-type') === 'repeat' ? 'repeat' : 'quote';

    var chip = $('[data-variant]', form);
    if (SIZE_LABEL[size]) { chip.textContent = 'Вариант: ' + SIZE_LABEL[size] + (COLOR_LABEL[color] ? ', ' + COLOR_LABEL[color] : ''); chip.hidden = false; }
    else if (size === 'help') { chip.textContent = 'Поможем подобрать диаметр'; chip.hidden = placement !== 'catalog'; }
    var repeat = form.request_type.value === 'repeat';
    $('[data-form-title]', form).textContent = repeat ? 'Повторный заказ KISS' : 'Расчёт заказа KISS';
    $('[data-form-sub]', form).textContent = repeat
      ? 'Оставьте имя и телефон — перезвоним и оформим повторный заказ.'
      : 'Оставьте имя и телефон — перезвоним, уточним вариант и количество и пришлём расчёт.';
    var lid = $('[data-form-lid]', form), lc = COLOR_LABEL[color] ? color : 'black';
    lid.src = 'assets/img/lid-' + lc + '-300.webp';
    lid.style.animation = 'none'; void lid.offsetWidth; lid.style.animation = '';

    if (!form.submission_id.value) form.submission_id.value = uid();
    if (typeof dlg.showModal === 'function') dlg.showModal();
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { (form.name.value ? form.contact : form.name).focus({ preventScroll: true }); }, 40);
    if (!openQuote.t0) openQuote.t0 = Date.now();
    goal('quote_open', { placement: placement });
  }

  function showErr(field, msg) {
    var p = $('#e-' + field), input = form[field];
    p.textContent = msg; p.hidden = false;
    if (input) input.setAttribute('aria-invalid', 'true');
  }
  function clearErr(field) {
    var p = $('#e-' + field), input = form[field];
    if (p) { p.hidden = true; p.textContent = ''; }
    if (input) input.removeAttribute('aria-invalid');
  }
  // Те же правила проверяются на сервере (api/lead.php)
  function validateName() {
    if (form.name.value.trim().length < 2) { showErr('name', 'Укажите имя — чтобы менеджер знал, как к вам обращаться.'); return false; }
    clearErr('name'); return true;
  }
  function validatePhone() {
    var v = form.contact.value.trim(), digits = v.replace(/\D/g, '');
    if (!v) { showErr('contact', 'Укажите телефон — без него мы не сможем прислать расчёт.'); return false; }
    if (!/^[+\d][\d\s()\-.]*$/.test(v) || digits.length < 10 || digits.length > 15) {
      showErr('contact', 'Проверьте телефон: 10–15 цифр, например +7 900 000-00-00.'); return false;
    }
    clearErr('contact'); return true;
  }
  function validate() {
    var bad = [];
    if (!validateName()) bad.push(form.name);
    if (!validatePhone()) bad.push(form.contact);
    if (!form.consent.checked) { showErr('consent', 'Без согласия на обработку данных мы не можем принять заявку.'); bad.push(form.consent); }
    else clearErr('consent');
    if (bad[0]) bad[0].focus();
    return !bad.length;
  }

  function collectMeta() {
    var meta = { page: location.pathname, placement: form.placement.value, filled_ms: openQuote.t0 ? Date.now() - openQuote.t0 : null };
    try { meta.last_touch = JSON.parse(SS.getItem('cc_session_touch') || 'null'); } catch (e) {}
    if (analyticsAllowed()) { try { meta.first_touch = JSON.parse(LS.getItem('cc_first_touch') || 'null'); } catch (e) {} }
    return meta;
  }
  function withClientId(cb) {
    if (!ymId || typeof window.ym !== 'function') return cb(null);
    var done = false, fin = function (id) { if (!done) { done = true; cb(id || null); } };
    try { window.ym(ymId, 'getClientID', fin); } catch (e) { fin(null); }
    setTimeout(function () { fin(null); }, 600);
  }

  function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    hideAlert();
    if (!validate()) { goal('lead_error', { code: 'client_validation' }); return; }
    submitting = true;
    var btn = $('[data-submit]', form), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Отправляем…';
    if (DEMO) {
      setTimeout(function () {
        form.hidden = true;
        var s = $('[data-success]', dlg);
        $('[data-lead-id]', s).textContent = 'демо-режим, заявка не отправлена';
        s.hidden = false; s.focus();
        submitting = false; btn.disabled = false; btn.textContent = label;
      }, 600);
      return;
    }
    withClientId(function (clientId) {
      var meta = collectMeta();
      if (clientId) meta.ym_client_id = clientId;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v : ''; });
      data.meta = meta;
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
      fetch(form.getAttribute('action'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data), signal: ctrl ? ctrl.signal : undefined, credentials: 'same-origin'
      }).then(function (r) {
        return r.json().catch(function () { return { ok: false, error: 'bad_response_' + r.status }; });
      }).then(function (res) {
        if (res && res.ok && res.lead_id) onSuccess(res.lead_id);
        else onFail(res && res.error, res && res.fields);
      }).catch(function (err) {
        onFail(err && err.name === 'AbortError' ? 'timeout' : 'network');
      }).then(function () {
        clearTimeout(timer); submitting = false; btn.disabled = false; btn.textContent = label;
      });
    });
  }

  function onSuccess(leadId) {
    if (!sentLeads[leadId]) { sentLeads[leadId] = true; goal('lead_success', { lead_id: leadId, placement: form.placement.value }); }
    form.hidden = true;
    var s = $('[data-success]', dlg);
    $('[data-lead-id]', s).textContent = leadId;
    s.hidden = false; s.focus();
  }

  var SERVER_FIELD_MSG = {
    name: 'Укажите имя — чтобы менеджер знал, как к вам обращаться.',
    contact: 'Проверьте телефон: сервер не принял формат.',
    consent: 'Без согласия на обработку данных мы не можем принять заявку.'
  };
  function onFail(code, fields) {
    goal('lead_error', { code: String(code || 'unknown').slice(0, 40) });
    (fields || []).forEach(function (f) { if (SERVER_FIELD_MSG[f]) showErr(f, SERVER_FIELD_MSG[f]); });
    var c = (C && C.contacts) || {};
    var a = $('[data-form-alert]', form);
    a.textContent = code === 'rate_limited'
      ? 'Слишком много отправок подряд. Подождите несколько минут и повторите.'
      : 'Не удалось подтвердить отправку. Ваши данные сохранены в форме. Повторите попытку' + (c.phone_display || c.telegram ? ' или свяжитесь с нами напрямую: ' : '.');
    if (code !== 'rate_limited') {
      var parts = [];
      if (c.phone_display) parts.push(['tel:' + String(c.phone).replace(/[^\d+]/g, ''), c.phone_display, 'phone_error']);
      if (c.telegram) parts.push(['https://t.me/' + c.telegram, 'Telegram @' + c.telegram, 'telegram_error']);
      parts.forEach(function (p, i) {
        if (i) a.appendChild(document.createTextNode(', '));
        var l = document.createElement('a'); l.href = p[0]; l.textContent = p[1]; l.setAttribute('data-contact', p[2]);
        if (p[0].indexOf('http') === 0) { l.target = '_blank'; l.rel = 'noopener'; }
        a.appendChild(l);
      });
      if (parts.length) a.appendChild(document.createTextNode('.'));
    }
    a.hidden = false;
  }
  function hideAlert() { var a = $('[data-form-alert]', form); a.hidden = true; a.textContent = ''; }

  function resetAfterSuccess() {
    form.reset();
    form.submission_id.value = '';
    form.size.value = 'help'; form.color.value = 'undecided'; form.request_type.value = 'quote'; form.contact_method.value = 'phone';
    openQuote.t0 = 0;
    form.hidden = false; $('[data-success]', dlg).hidden = true;
  }

  /* ---------- Анимации ---------- */
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initReveal() {
    var els = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
    // Страховка: если что-то пошло не так, контент не остаётся скрытым
    setTimeout(function () {
      els.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('is-in'); });
    }, 2500);
  }

  function initStage() {
    var stage = $('[data-stage]');
    if (!stage || reduceMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var lids = $$('.lid', stage), raf = 0, tx = 0, ty = 0;
    var hero = $('.hero');
    hero.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      tx = ((e.clientX - (r.left + r.width / 2)) / r.width);
      ty = ((e.clientY - (r.top + r.height / 2)) / r.height);
      if (!raf) raf = requestAnimationFrame(apply);
    });
    hero.addEventListener('pointerleave', function () { tx = ty = 0; if (!raf) raf = requestAnimationFrame(apply); });
    function apply() {
      raf = 0;
      lids.forEach(function (l) {
        var d = parseFloat(l.getAttribute('data-depth')) || 1;
        l.style.setProperty('--px', (tx * 26 * d).toFixed(1) + 'px');
        l.style.setProperty('--py', (ty * 22 * d).toFixed(1) + 'px');
      });
    }
  }

  function initTilt() {
    if (reduceMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    $$('.tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (((e.clientY - r.top) / r.height - 0.5) * -10).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  function initScrollFx() {
    var bar = document.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var header = $('.header'), ticking = false;
    function upd() {
      ticking = false;
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty('--p', h > 0 ? (scrollY / h).toFixed(4) : 0);
      header.classList.toggle('is-scrolled', scrollY > 8);
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* ---------- Старт ---------- */
  function start() {
    if (DEMO) {
      var bar = document.createElement('div'); bar.className = 'demo-bar'; bar.setAttribute('role', 'note');
      bar.textContent = 'Демо-версия для согласования. Заявки из формы никуда не отправляются, фото временные.';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    initNav(); initMobileBar(); initLightbox(); initForm(); initContactClicks(); initTouches();
    initReveal(); initStage(); initTilt(); initScrollFx();
    fetch('content.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (json) { C = json; })
      .catch(function () { C = null; })
      .then(function () {
        if (!C) { C = { contacts: {}, legal: {}, prices: {}, colors: {}, catalog: {} }; }
        else applyContent();
        initCookies();
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
