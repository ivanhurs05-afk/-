/* COVERCAP — поведение лендинга: контент из content.json, каталог, форма расчёта, аналитика по согласию. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var C = null;                       // content.json
  var LS = safeStorage('localStorage');
  var SS = safeStorage('sessionStorage');
  var CONSENT_KEY = 'cc_cookie_consent'; // 'accepted' | 'declined'
  var sentLeads = {};                 // lead_id → true, чтобы lead_success ушёл один раз

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
          setCardImage(card, c.key);
          goal('variant_select', { size: sku, color: c.key, place: 'catalog' });
        });
      });
      if (list[0]) setCardImage(card, list[0].key);
    });
  }
  function setCardImage(card, color) {
    var img = $('[data-card-img]', card);
    if (!img || !/^(black|white|red)$/.test(color)) return;
    img.src = 'assets/img/kiss-' + color + '-490.webp';
    img.srcset = 'assets/img/kiss-' + color + '-320.webp 320w, assets/img/kiss-' + color + '-490.webp 490w';
    var names = { black: 'чёрного', white: 'белого', red: 'красного' };
    img.alt = 'Крышка KISS ' + names[color] + ' цвета, вид сверху';
  }

  function renderFormColors() {
    var box = $('[data-form-colors]');
    var all = {};
    ['d80', 'd90'].forEach(function (s) { colorsFor(s).forEach(function (c) { all[c.key] = c; }); });
    $$('label', box).forEach(function (l) {
      var v = $('input', l).value;
      if (v !== 'undecided') l.hidden = !all[v];
    });
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

  /* ---------- Форма расчёта ---------- */
  var form, dlg, opener, submitting = false;

  function initForm() {
    dlg = $('#quote'); form = $('#quote-form');
    if (typeof dlg.showModal !== 'function') { // очень старые браузеры: форма работает без JS-модалки
      dlg.setAttribute('open', ''); dlg.style.position = 'static';
    }
    $$('[data-quote]').forEach(function (b) { b.addEventListener('click', function () { openQuote(b); }); });
    $$('[data-close]', dlg).forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      document.documentElement.style.overflow = '';
      if (!$('[data-success]', dlg).hidden) resetAfterSuccess();
      if (opener && document.contains(opener)) opener.focus();
    });

    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'contact_method') setContactMethod(t.value);
      if (t.name === 'request_type') $('[data-show-if="repeat"]', form).hidden = t.value !== 'repeat';
      if (t.name === 'qty_unknown') { form.qty.disabled = t.checked; if (t.checked) { form.qty.value = ''; clearErr('qty'); } }
      if (t.name === 'size' || t.name === 'color') goal('variant_select', { size: val('size'), color: val('color'), place: 'form' });
      if (t.name === 'consent' && t.checked) clearErr('consent');
    });
    form.comment.addEventListener('input', function () { $('[data-count]', form).textContent = form.comment.value.length; });
    form.contact.addEventListener('input', function () { if (form.contact.getAttribute('aria-invalid')) validateContact(); });
    form.contact.addEventListener('blur', function () { if (form.contact.value.trim()) validateContact(); });
    form.addEventListener('submit', onSubmit);

    // Ссылка вида covercap.ru/#repeat открывает форму повторного заказа
    if (location.hash === '#repeat' || location.hash === '#quote') {
      openQuote($(location.hash === '#repeat' ? '[data-quote="repeat"]' : '[data-quote="hero"]'));
    }
  }

  function val(name) { var el = form.querySelector('[name="' + name + '"]:checked'); return el ? el.value : ''; }
  function setRadio(name, v) { var el = form.querySelector('[name="' + name + '"][value="' + v + '"]'); if (el && !el.closest('[hidden]')) { el.checked = true; return true; } return false; }

  function openQuote(btn) {
    opener = btn;
    var placement = btn.getAttribute('data-quote');
    form.placement.value = placement;
    var size = btn.getAttribute('data-size');
    if (size) setRadio('size', size);
    if (size && size !== 'help') {
      var card = btn.closest('.card'), sw = card && card.querySelector('.swatch input:checked');
      if (!sw || !setRadio('color', sw.value)) setRadio('color', 'undecided');
    }
    var type = btn.getAttribute('data-type');
    if (type) setRadio('request_type', type);
    $('[data-show-if="repeat"]', form).hidden = val('request_type') !== 'repeat';
    if (!form.submission_id.value) form.submission_id.value = uid();

    if (typeof dlg.showModal === 'function') dlg.showModal();
    document.documentElement.style.overflow = 'hidden';
    var first = form.querySelector('input:checked') || form.contact;
    setTimeout(function () { (size ? form.contact : first).focus({ preventScroll: true }); }, 30);
    if (!openQuote.t0) openQuote.t0 = Date.now();
    goal('quote_open', { placement: placement });
  }

  function setContactMethod(m) {
    var c = form.contact;
    $('[data-contact-label]', form).textContent = m === 'email' ? 'Email' : 'Телефон';
    c.type = m === 'email' ? 'email' : 'tel';
    c.inputMode = m === 'email' ? 'email' : 'tel';
    c.autocomplete = m === 'email' ? 'email' : 'tel';
    c.placeholder = m === 'email' ? 'name@cafe.ru' : '+7 900 000-00-00';
    clearErr('contact');
    if (c.value.trim()) validateContact();
  }

  function showErr(field, msg) {
    var p = $('#e-' + field), input = field === 'consent' ? form.consent : form[field];
    p.textContent = msg; p.hidden = false;
    if (input) input.setAttribute('aria-invalid', 'true');
  }
  function clearErr(field) {
    var p = $('#e-' + field), input = field === 'consent' ? form.consent : form[field];
    if (p) { p.hidden = true; p.textContent = ''; }
    if (input) input.removeAttribute('aria-invalid');
  }

  // Те же правила проверяются на сервере (api/lead.php)
  function validateContact() {
    var m = val('contact_method'), v = form.contact.value.trim();
    if (!v) { showErr('contact', m === 'email' ? 'Укажите email — без контакта мы не сможем прислать расчёт.' : 'Укажите телефон — без контакта мы не сможем прислать расчёт.'); return false; }
    if (m === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { showErr('contact', 'Проверьте email: должен быть вида name@cafe.ru.'); return false; }
    if (m === 'phone') {
      var digits = v.replace(/\D/g, '');
      if (!/^[+\d][\d\s()\-.]*$/.test(v) || digits.length < 10 || digits.length > 15) {
        showErr('contact', 'Проверьте телефон: 10–15 цифр, можно в международном формате, например +7 900 000-00-00.'); return false;
      }
    }
    clearErr('contact'); return true;
  }
  function validate() {
    var ok = true, firstBad = null;
    if (!validateContact()) { ok = false; firstBad = firstBad || form.contact; }
    var q = form.qty.value.trim();
    if (q && !form.qty_unknown.checked && !/^[1-9]\d{0,7}$/.test(q)) {
      showErr('qty', 'Количество — целое число штук больше нуля, или отметьте «Пока не знаю».'); ok = false; firstBad = firstBad || form.qty;
    } else clearErr('qty');
    if (!form.consent.checked) { showErr('consent', 'Без согласия на обработку данных мы не можем принять заявку.'); ok = false; firstBad = firstBad || form.consent; }
    else clearErr('consent');
    if (firstBad) firstBad.focus();
    return ok;
  }

  function collectMeta() {
    var meta = { page: location.pathname, placement: form.placement.value, filled_ms: openQuote.t0 ? Date.now() - openQuote.t0 : null };
    try { meta.last_touch = JSON.parse(SS.getItem('cc_session_touch') || 'null'); } catch (e) {}
    if (analyticsAllowed()) {
      try { meta.first_touch = JSON.parse(LS.getItem('cc_first_touch') || 'null'); } catch (e) {}
    }
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

    withClientId(function (clientId) {
      var meta = collectMeta();
      if (clientId) meta.ym_client_id = clientId;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v : ''; });
      if (form.qty.disabled) delete data.qty;
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
    contact: 'Проверьте контакт: сервер не принял формат.',
    consent: 'Без согласия на обработку данных мы не можем принять заявку.',
    qty: 'Количество — целое число штук больше нуля.'
  };
  function onFail(code, fields) {
    goal('lead_error', { code: String(code || 'unknown').slice(0, 40) });
    if (fields && fields.length) {
      fields.forEach(function (f) { if (SERVER_FIELD_MSG[f]) showErr(f, SERVER_FIELD_MSG[f]); });
    }
    var email = C && C.contacts && C.contacts.email;
    var msg = code === 'rate_limited'
      ? 'Слишком много отправок подряд. Подождите несколько минут и повторите.'
      : 'Не удалось подтвердить отправку. Ваши данные сохранены в форме. Повторите попытку' + (email ? ' или напишите нам на ' : '.');
    showAlert(msg, code === 'rate_limited' ? null : email);
  }
  function showAlert(text, email) {
    var a = $('[data-form-alert]', form);
    a.textContent = text;
    if (email) {
      var l = document.createElement('a'); l.href = 'mailto:' + email; l.textContent = email; l.setAttribute('data-contact', 'email_error');
      a.appendChild(l); a.appendChild(document.createTextNode('.'));
    }
    a.hidden = false;
  }
  function hideAlert() { $('[data-form-alert]', form).hidden = true; }

  function resetAfterSuccess() {
    form.reset();
    form.qty.disabled = false;
    form.submission_id.value = '';   // следующая заявка — новая запись
    openQuote.t0 = 0;
    $('[data-count]', form).textContent = '0';
    setContactMethod('phone');
    $('[data-show-if="repeat"]', form).hidden = true;
    form.hidden = false; $('[data-success]', dlg).hidden = true;
  }

  /* ---------- Старт ---------- */
  function start() {
    initNav(); initMobileBar(); initLightbox(); initForm(); initContactClicks(); initTouches();
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
